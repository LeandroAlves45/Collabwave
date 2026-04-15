// ============================================================
// CollabWave — Integration Tests: Workspace REST API
// ============================================================
// Testa os endpoints HTTP de workspaces contra o app Express.
//
// ENDPOINTS COBERTOS:
//   GET  /api/workspaces
//   POST /api/workspaces
//   GET  /api/workspaces/:id
//   POST /api/workspaces/join
//   GET  /api/workspaces/:id/members
// ============================================================

jest.mock('../../src/modules/workspaces/workspace.service.js');
jest.mock('../../src/middleware/authenticate.js');

import request from 'supertest';
import app from '../../src/app.js';
import * as workspaceService from '../../src/modules/workspaces/workspace.service.js';
import { authenticate } from '../../src/middleware/authenticate.js';

const mockAuthenticate = authenticate as jest.MockedFunction<
  typeof authenticate
>;
mockAuthenticate.mockImplementation((req, _res, next) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).user = {
    id: 'user-1',
    email: 'test@test.com',
    name: 'Test User',
  };
  next();
});

const mockService = workspaceService as jest.Mocked<typeof workspaceService>;

// checkMembership is used by requireMembership middleware on /:id routes.
// By default: user is a member. Individual tests override when needed.
beforeEach(() => {
  jest.clearAllMocks();
  mockService.checkMembership.mockResolvedValue({ role: 'member' });
});

const WORKSPACE_ID = 'a0000000-0000-0000-0000-000000000001';

const sampleWorkspace = {
  id: WORKSPACE_ID,
  name: 'Engineering',
  description: 'Backend team workspace',
  owner_id: 'user-1',
  invite_code: 'ABC123',
  created_at: '2024-01-01T00:00:00.000Z',
};

const sampleMember = {
  user_id: 'user-1',
  workspace_id: WORKSPACE_ID,
  role: 'owner' as const,
  joined_at: new Date('2024-01-01'),
  name: 'Test User',
  email: 'test@test.com',
};

// ----------------------------------------------------------------
// GET /api/workspaces
// ----------------------------------------------------------------
describe('GET /api/workspaces', () => {
  it('returns 200 with list of workspaces for authenticated user', async () => {
    const workspaceWithRole = { ...sampleWorkspace, role: 'owner' as const };
    mockService.getUserWorkspaces.mockResolvedValue([workspaceWithRole]);

    const res = await request(app).get('/api/workspaces');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Engineering');
  });

  it('returns 200 with empty array when user has no workspaces', async () => {
    mockService.getUserWorkspaces.mockResolvedValue([]);

    const res = await request(app).get('/api/workspaces');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// ----------------------------------------------------------------
// POST /api/workspaces
// ----------------------------------------------------------------
describe('POST /api/workspaces', () => {
  it('returns 201 with created workspace for valid payload', async () => {
    mockService.createWorkspace.mockResolvedValue(sampleWorkspace);

    const res = await request(app)
      .post('/api/workspaces')
      .send({ name: 'Engineering', description: 'Backend team workspace' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(WORKSPACE_ID);
    expect(res.body.data.invite_code).toBe('ABC123');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/workspaces')
      .send({ description: 'No name provided' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 400 when name is shorter than 2 characters', async () => {
    const res = await request(app).post('/api/workspaces').send({ name: 'X' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when name exceeds 100 characters', async () => {
    const res = await request(app)
      .post('/api/workspaces')
      .send({ name: 'a'.repeat(101) });

    expect(res.status).toBe(400);
  });

  it('returns 400 when description exceeds 500 characters', async () => {
    const res = await request(app)
      .post('/api/workspaces')
      .send({ name: 'Valid Name', description: 'a'.repeat(501) });

    expect(res.status).toBe(400);
  });
});

// ----------------------------------------------------------------
// GET /api/workspaces/:id
// ----------------------------------------------------------------
describe('GET /api/workspaces/:id', () => {
  it('returns 200 with workspace details when member', async () => {
    mockService.getWorkspaceById.mockResolvedValue(sampleWorkspace);

    const res = await request(app).get(`/api/workspaces/${WORKSPACE_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(WORKSPACE_ID);
  });

  it('returns 403 when user is not a member', async () => {
    mockService.checkMembership.mockResolvedValue(null);

    const res = await request(app).get(`/api/workspaces/${WORKSPACE_ID}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 when workspace does not exist', async () => {
    const { AppError } = await import('../../src/middleware/errorHandler.js');
    mockService.getWorkspaceById.mockRejectedValue(
      new AppError('Workspace not found', 404),
    );

    const res = await request(app).get(`/api/workspaces/${WORKSPACE_ID}`);

    expect(res.status).toBe(404);
  });
});

// ----------------------------------------------------------------
// POST /api/workspaces/join
// ----------------------------------------------------------------
describe('POST /api/workspaces/join', () => {
  it('returns 200 with workspace when invite code is valid', async () => {
    mockService.joinWorkspaceByInviteCode.mockResolvedValue(sampleWorkspace);

    const res = await request(app)
      .post('/api/workspaces/join')
      .send({ inviteCode: 'ABC123' });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(WORKSPACE_ID);
  });

  it('returns 400 when inviteCode is missing', async () => {
    const res = await request(app).post('/api/workspaces/join').send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when inviteCode is not exactly 6 characters', async () => {
    const res = await request(app)
      .post('/api/workspaces/join')
      .send({ inviteCode: 'AB12' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when invite code does not match any workspace', async () => {
    const { AppError } = await import('../../src/middleware/errorHandler.js');
    mockService.joinWorkspaceByInviteCode.mockRejectedValue(
      new AppError('Invalid invite code', 404),
    );

    const res = await request(app)
      .post('/api/workspaces/join')
      .send({ inviteCode: 'XXXXXX' });

    expect(res.status).toBe(404);
  });
});

// ----------------------------------------------------------------
// GET /api/workspaces/:id/members
// ----------------------------------------------------------------
describe('GET /api/workspaces/:id/members', () => {
  it('returns 200 with member list when member', async () => {
    mockService.getWorkspaceMembers.mockResolvedValue([sampleMember]);

    const res = await request(app).get(
      `/api/workspaces/${WORKSPACE_ID}/members`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBe('test@test.com');
  });

  it('returns 403 when user is not a member', async () => {
    mockService.checkMembership.mockResolvedValue(null);

    const res = await request(app).get(
      `/api/workspaces/${WORKSPACE_ID}/members`,
    );

    expect(res.status).toBe(403);
  });
});
