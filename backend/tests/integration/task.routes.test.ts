// ============================================================
// CollabWave — Integration Tests: Task REST API
// ============================================================
// Testa os endpoints HTTP de tasks contra o app Express.
// Os mocks cobrem todos os módulos com efeitos externos:
//   - task.service → lógica de negócio e BD
//   - workspace.service → checkMembership usado por requireMembership
//   - authenticate → validação JWT
// ============================================================

jest.mock('../../src/modules/tasks/task.service.js');
jest.mock('../../src/modules/workspaces/workspace.service.js');
jest.mock('../../src/middleware/authenticate.js');

import request from 'supertest';
import app from '../../src/app.js';
import * as taskService from '../../src/modules/tasks/task.service.js';
import * as workspaceService from '../../src/modules/workspaces/workspace.service.js';
import { authenticate } from '../../src/middleware/authenticate.js';

// Mock do authenticate: injeta req.user sem validar JWT
const mockAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;
mockAuthenticate.mockImplementation((req, _res, next) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).user = { id: 'user-1', email: 'test@test.com', name: 'Test User' };
  next();
});

const mockTaskService = taskService as jest.Mocked<typeof taskService>;
const mockWorkspaceService = workspaceService as jest.Mocked<typeof workspaceService>;

// checkMembership usado pelo requireMembership middleware nas rotas workspace-scoped.
// Por defeito simula que o utilizador é membro -> testes individuais podem sobrescrever.
beforeEach(() => {
  jest.clearAllMocks();
  mockWorkspaceService.checkMembership.mockResolvedValue({ role: 'member' });
});

// UUIDs válidos usados nos fixtures — o moveTaskSchema valida UUID
const WORKSPACE_ID = 'a0000000-0000-0000-0000-000000000001';
const COLUMN_ID    = 'a0000000-0000-0000-0000-000000000002';
const COLUMN_ID_2  = 'a0000000-0000-0000-0000-000000000003';
const TASK_ID      = 'a0000000-0000-0000-0000-000000000004';

const sampleColumn = {
  id: COLUMN_ID,
  workspace_id: WORKSPACE_ID,
  title: 'To Do',
  position: 0,
  tasks: [
    {
      id: TASK_ID,
      column_id: COLUMN_ID,
      title: 'Task A',
      priority: 'medium' as const,
      position: 0,
      description: null,
      assignee_id: null,
      created_by: 'user-1',
      created_at: '2024-01-01T00:00:00.000Z',
      createdBy: {
        id: 'user-1',
        name: 'Test User',
        initials: 'TU',
      },
      due_date: null,
      updated_at: '2024-01-01T00:00:00.000Z',
    },
  ],
};

const sampleTask = {
  id: TASK_ID,
  column_id: COLUMN_ID,
  title: 'Task A',
  priority: 'medium' as const,
  position: 0,
  description: null,
  assignee_id: null,
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00.000Z',
  createdBy: {
    id: 'user-1',
    name: 'Test User',
    initials: 'TU',
  },
  due_date: null,
  updated_at: '2024-01-01T00:00:00.000Z',
  workspace_id: WORKSPACE_ID,
};

// ----------------------------------------------------------------
// GET /api/workspaces/:id/tasks
// ----------------------------------------------------------------
describe('GET /api/workspaces/:id/tasks', () => {
  it('returns 200 with columns and tasks when member', async () => {
    mockTaskService.getWorkspaceTasks.mockResolvedValue([sampleColumn]);

    const res = await request(app).get(`/api/workspaces/${WORKSPACE_ID}/tasks`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].tasks).toHaveLength(1);
  });

  it('returns 200 with empty array when workspace has no columns', async () => {
    mockTaskService.getWorkspaceTasks.mockResolvedValue([]);

    const res = await request(app).get(`/api/workspaces/${WORKSPACE_ID}/tasks`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// ----------------------------------------------------------------
// POST /api/workspaces/:id/tasks
// ----------------------------------------------------------------
describe('POST /api/workspaces/:id/tasks', () => {
  it('returns 201 with created task for valid payload', async () => {
    mockTaskService.createTask.mockResolvedValue(sampleTask);

    const res = await request(app)
      .post(`/api/workspaces/${WORKSPACE_ID}/tasks`)
      .send({ columnId: COLUMN_ID, title: 'Task A' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(TASK_ID);
  });

  it('returns 400 when columnId is missing', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${WORKSPACE_ID}/tasks`)
      .send({ title: 'Task sem coluna' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${WORKSPACE_ID}/tasks`)
      .send({ columnId: COLUMN_ID });

    expect(res.status).toBe(400);
  });

  it('returns 400 when priority has invalid value', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${WORKSPACE_ID}/tasks`)
      .send({ columnId: COLUMN_ID, title: 'T', priority: 'extreme' });

    expect(res.status).toBe(400);
  });
});

// ----------------------------------------------------------------
// PATCH /api/tasks/:taskId
// ----------------------------------------------------------------
describe('PATCH /api/tasks/:taskId', () => {
  it('returns 200 with updated task for valid payload', async () => {
    const updated = { ...sampleTask, workspace_id: WORKSPACE_ID, title: 'Novo título' };
    mockTaskService.updateTask.mockResolvedValue(updated);

    const res = await request(app)
      .patch(`/api/tasks/${TASK_ID}`)
      .send({ title: 'Novo título' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Novo título');
  });

  it('returns 400 when body is completely empty', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${TASK_ID}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 404 when service throws AppError 404', async () => {
    const { AppError } = await import('../../src/middleware/errorHandler.js');
    mockTaskService.updateTask.mockRejectedValue(
      new AppError('Task not found or access denied', 404),
    );

    const res = await request(app)
      .patch(`/api/tasks/${TASK_ID}`)
      .send({ title: 'T' });

    expect(res.status).toBe(404);
  });
});

// ----------------------------------------------------------------
// PATCH /api/tasks/:taskId/move
// ----------------------------------------------------------------
describe('PATCH /api/tasks/:taskId/move', () => {
  it('returns 200 with moved task for valid payload', async () => {
    const moved = { ...sampleTask, workspace_id: WORKSPACE_ID, column_id: COLUMN_ID_2, position: 0 };
    mockTaskService.moveTask.mockResolvedValue(moved);

    const res = await request(app)
      .patch(`/api/tasks/${TASK_ID}/move`)
      .send({ targetColumnId: COLUMN_ID_2, newPosition: 0 });

    expect(res.status).toBe(200);
    expect(res.body.data.column_id).toBe(COLUMN_ID_2);
  });

  it('returns 400 when targetColumnId is missing', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${TASK_ID}/move`)
      .send({ newPosition: 0 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when newPosition is negative', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${TASK_ID}/move`)
      .send({ targetColumnId: COLUMN_ID_2, newPosition: -1 });

    expect(res.status).toBe(400);
  });
});

// ----------------------------------------------------------------
// DELETE /api/tasks/:taskId
// ----------------------------------------------------------------
describe('DELETE /api/tasks/:taskId', () => {
  it('returns 204 when task deleted successfully', async () => {
    mockTaskService.deleteTask.mockResolvedValue({
      taskId: TASK_ID,
      workspaceId: WORKSPACE_ID,
    });

    const res = await request(app).delete(`/api/tasks/${TASK_ID}`);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('returns 404 when task does not exist or access denied', async () => {
    const { AppError } = await import('../../src/middleware/errorHandler.js');
    mockTaskService.deleteTask.mockRejectedValue(
      new AppError('Task not found or access denied', 404),
    );

    const res = await request(app).delete(`/api/tasks/${TASK_ID}`);

    expect(res.status).toBe(404);
  });
});
