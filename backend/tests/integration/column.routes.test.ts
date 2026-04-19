// ============================================================
// CollabWave — Integration Tests: Column REST API
// ============================================================
// Testa os endpoints HTTP de columns contra o app Express.
//
// ENDPOINTS COBERTOS:
//   GET    /api/workspaces/:id/columns
//   POST   /api/workspaces/:id/columns
//   PATCH  /api/columns/:columnId
//   DELETE /api/columns/:columnId
//   PATCH  /api/columns/:columnId/reorder
// ============================================================

jest.mock('../../src/modules/columns/column.service.js');
jest.mock('../../src/middleware/authenticate.js');

import request from 'supertest';
import app from '../../src/app.js';
import * as columnService from '../../src/modules/columns/column.service.js';
import { authenticate } from '../../src/middleware/authenticate.js';

// Mock do authenticate: injeta req.user sem validar JWT
const mockAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;
mockAuthenticate.mockImplementation((req, _res, next) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).user = { id: 'user-1', email: 'test@test.com', name: 'Test User' };
  next();
});

const mockColumnService = columnService as jest.Mocked<typeof columnService>;

beforeEach(() => jest.clearAllMocks());

// UUIDs válidos — os schemas não validam UUIDs nos column endpoints,
// mas usamos UUIDs para consistência com o resto do projecto
const WORKSPACE_ID = 'a0000000-0000-0000-0000-000000000001';
const COLUMN_ID    = 'a0000000-0000-0000-0000-000000000002';

// ----------------------------------------------------------------
// GET /api/workspaces/:id/columns
// ----------------------------------------------------------------
describe('GET /api/workspaces/:id/columns', () => {
  it('returns 200 with list of columns ordered by position', async () => {
    const columns = [sampleColumn, sampleColumnInProgress, sampleColumnDone];
    mockColumnService.getColumnsForWorkspace.mockResolvedValue(columns);

    const res = await request(app).get(
      `/api/workspaces/${WORKSPACE_ID}/columns`,
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(3);
    expect(res.body.data[0].title).toBe('To Do');
    expect(res.body.data[1].title).toBe('In Progress');
    expect(res.body.data[2].title).toBe('Done');
  });

  it('returns 200 with empty array when no columns exist', async () => {
    mockColumnService.getColumnsForWorkspace.mockResolvedValue([]);

    const res = await request(app).get(
      `/api/workspaces/${WORKSPACE_ID}/columns`,
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('returns 403 when user does not have access to workspace', async () => {
    const { AppError } = await import('../../src/middleware/errorHandler.js');
    mockColumnService.getColumnsForWorkspace.mockRejectedValue(
      new AppError('Access denied to this workspace.', 403),
    );

    const res = await request(app).get(
      `/api/workspaces/${WORKSPACE_ID}/columns`,
    );

    expect(res.status).toBe(403);
    expect(res.body.status).toBe('error');
  });

  it('converts snake_case (workspace_id) to camelCase (workspaceId)', async () => {
    mockColumnService.getColumnsForWorkspace.mockResolvedValue([sampleColumn]);

    const res = await request(app).get(
      `/api/workspaces/${WORKSPACE_ID}/columns`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toHaveProperty('workspaceId');
    expect(res.body.data[0]).not.toHaveProperty('workspace_id');
    expect(res.body.data[0].workspaceId).toBe(WORKSPACE_ID);
  });
});

const sampleColumn = {
  id: COLUMN_ID,
  workspace_id: WORKSPACE_ID,
  title: 'To Do',
  position: 0,
};

const sampleColumnInProgress = {
  id: 'a0000000-0000-0000-0000-000000000003',
  workspace_id: WORKSPACE_ID,
  title: 'In Progress',
  position: 1,
};

const sampleColumnDone = {
  id: 'a0000000-0000-0000-0000-000000000004',
  workspace_id: WORKSPACE_ID,
  title: 'Done',
  position: 2,
};

// ----------------------------------------------------------------
// POST /api/workspaces/:id/columns
// ----------------------------------------------------------------
describe('POST /api/workspaces/:id/columns', () => {
  it('returns 201 with created column for valid payload', async () => {
    mockColumnService.createColumn.mockResolvedValue(sampleColumn);

    const res = await request(app)
      .post(`/api/workspaces/${WORKSPACE_ID}/columns`)
      .send({ title: 'To Do' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(COLUMN_ID);
    expect(res.body.data.title).toBe('To Do');
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${WORKSPACE_ID}/columns`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 400 when title is empty', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${WORKSPACE_ID}/columns`)
      .send({ title: '' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when title exceeds 100 characters', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${WORKSPACE_ID}/columns`)
      .send({ title: 'a'.repeat(101) });

    expect(res.status).toBe(400);
  });

  it('returns 403 when service throws AppError 403', async () => {
    const { AppError } = await import('../../src/middleware/errorHandler.js');
    mockColumnService.createColumn.mockRejectedValue(
      new AppError('Access denied to this workspace', 403),
    );

    const res = await request(app)
      .post(`/api/workspaces/${WORKSPACE_ID}/columns`)
      .send({ title: 'To Do' });

    expect(res.status).toBe(403);
  });
});

// ----------------------------------------------------------------
// PATCH /api/columns/:columnId
// ----------------------------------------------------------------
describe('PATCH /api/columns/:columnId', () => {
  it('returns 200 with updated column for valid payload', async () => {
    const updated = { ...sampleColumn, title: 'In Progress' };
    mockColumnService.updateColumn.mockResolvedValue(updated);

    const res = await request(app)
      .patch(`/api/columns/${COLUMN_ID}`)
      .send({ title: 'In Progress' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('In Progress');
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .patch(`/api/columns/${COLUMN_ID}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 404 when service throws AppError 404', async () => {
    const { AppError } = await import('../../src/middleware/errorHandler.js');
    mockColumnService.updateColumn.mockRejectedValue(
      new AppError('Column not found or access denied', 404),
    );

    const res = await request(app)
      .patch(`/api/columns/${COLUMN_ID}`)
      .send({ title: 'T' });

    expect(res.status).toBe(404);
  });
});

// ----------------------------------------------------------------
// DELETE /api/columns/:columnId
// ----------------------------------------------------------------
describe('DELETE /api/columns/:columnId', () => {
  it('returns 204 when column deleted successfully', async () => {
    mockColumnService.deleteColumn.mockResolvedValue(undefined);

    const res = await request(app).delete(`/api/columns/${COLUMN_ID}`);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('returns 404 when service throws AppError 404', async () => {
    const { AppError } = await import('../../src/middleware/errorHandler.js');
    mockColumnService.deleteColumn.mockRejectedValue(
      new AppError('Column not found or access denied', 404),
    );

    const res = await request(app).delete(`/api/columns/${COLUMN_ID}`);

    expect(res.status).toBe(404);
  });
});

// ----------------------------------------------------------------
// PATCH /api/columns/:columnId/reorder
// ----------------------------------------------------------------
describe('PATCH /api/columns/:columnId/reorder', () => {
  it('returns 200 with reordered column for valid payload', async () => {
    const reordered = { ...sampleColumn, position: 2 };
    mockColumnService.reorderColumn.mockResolvedValue(reordered);

    const res = await request(app)
      .patch(`/api/columns/${COLUMN_ID}/reorder`)
      .send({ newPosition: 2 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.position).toBe(2);
  });

  it('returns 400 when newPosition is missing', async () => {
    const res = await request(app)
      .patch(`/api/columns/${COLUMN_ID}/reorder`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when newPosition is negative', async () => {
    const res = await request(app)
      .patch(`/api/columns/${COLUMN_ID}/reorder`)
      .send({ newPosition: -1 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when newPosition is not integer', async () => {
    const res = await request(app)
      .patch(`/api/columns/${COLUMN_ID}/reorder`)
      .send({ newPosition: 1.5 });

    expect(res.status).toBe(400);
  });

  it('returns 404 when service throws AppError 404', async () => {
    const { AppError } = await import('../../src/middleware/errorHandler.js');
    mockColumnService.reorderColumn.mockRejectedValue(
      new AppError('Column not found or access denied', 404),
    );

    const res = await request(app)
      .patch(`/api/columns/${COLUMN_ID}/reorder`)
      .send({ newPosition: 0 });

    expect(res.status).toBe(404);
  });
});