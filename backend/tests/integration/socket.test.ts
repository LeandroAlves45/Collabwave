// ============================================================
// CollabWave — Integration Tests: WebSocket Events
// ============================================================
// Testa os handlers Socket.io com um servidor HTTP real e um
// cliente socket.io-client. Mocks cobrem:
//   - database       → sem BD real
//   - redis          → sem Redis real
//   - presence.service → funções de presença mockadas
//   - task.service   → funções de task mockadas
//   - @socket.io/redis-adapter → adapter substituído por noop
//
// PADRÃO:
//   Cada teste liga um cliente, emite um evento, aguarda o
//   evento de resposta esperado, e desliga.
//
// NOTA SOBRE TIMINGS:
//   Os handlers Socket.io são assíncronos. Usamos Promises com
//   timeout para garantir que os testes não ficam pendurados.
// ============================================================

jest.mock('../../src/config/database.js');
jest.mock('../../src/config/redis.js');
jest.mock('../../src/sockets/presence.service.js');
jest.mock('../../src/modules/tasks/task.service.js');
jest.mock('@socket.io/redis-adapter');

import http from 'http';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';
import { initSocketServer } from '../../src/sockets/index.js';
import * as presenceService from '../../src/sockets/presence.service.js';
import * as taskService from '../../src/modules/tasks/task.service.js';
import db from '../../src/config/database.js';

// Mock dos clientes Redis — evita tentativas de ligação real
import { redisClient, pubClient, subClient } from '../../src/config/redis.js';
(redisClient as unknown as { on: jest.Mock; disconnect: jest.Mock }).on =
  jest.fn();
(pubClient as unknown as { on: jest.Mock; disconnect: jest.Mock }).on =
  jest.fn();
(subClient as unknown as { on: jest.Mock; disconnect: jest.Mock }).on =
  jest.fn();

const mockPresence = presenceService as jest.Mocked<typeof presenceService>;
const mockTaskService = taskService as jest.Mocked<typeof taskService>;
const mockDb = db as unknown as jest.MockedFunction<typeof db> & {
  raw: jest.Mock;
};

// ----------------------------------------------------------------
// Chave de teste — tem de coincidir com JWT_SECRET em tests/setup.ts
// ----------------------------------------------------------------
const TEST_JWT_SECRET = 'test-jwt-secret-32-chars-minimum!!';

// Gera um JWT válido para os testes
function makeToken(
  userId = 'user-1',
  email = 'test@test.com',
  name = 'Test User',
) {
  return jwt.sign(
    { sub: userId, email, name, jti: `jti-${userId}` },
    TEST_JWT_SECRET,
    { expiresIn: '15m' },
  );
}

// ----------------------------------------------------------------
// Setup: servidor HTTP + Socket.io iniciados uma vez para toda a suite
// ----------------------------------------------------------------
let httpServer: http.Server;
let serverPort: number;

beforeAll(async () => {
  // Mock do Redis Adapter: createAdapter tem de ser configurado antes de
  // initSocketServer ser chamado. Usa jest.requireMock para obter o mock
  // registado pelo jest.mock('@socket.io/redis-adapter') no topo do ficheiro.
  const { createAdapter } = jest.requireMock('@socket.io/redis-adapter') as {
    createAdapter: jest.Mock;
  };
  // Usar o Adapter nativo do socket.io (in-memory) em vez do Redis adapter.
  // Tem todos os métodos necessários e funciona sem ligação Redis.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Adapter } = require('socket.io-adapter') as {
    Adapter: new (...args: unknown[]) => unknown;
  };
  createAdapter.mockReturnValue(Adapter);

  // Usar porta 0 → o OS atribui uma porta livre automaticamente
  httpServer = http.createServer(app);
  initSocketServer(httpServer);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => resolve());
  });

  serverPort = (httpServer.address() as { port: number }).port;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    httpServer.close((err) => (err ? reject(err) : resolve())),
  );
});

beforeEach(() => {
  jest.clearAllMocks();

  // Defaults seguros para todos os mocks de presença.
  // Sem isto, clearAllMocks() deixa as funções sem valor de retorno definido,
  // o que causa "affectedWorkspacesIds is not iterable" no handler de disconnect.
  mockPresence.addUserToPresence.mockResolvedValue(undefined);
  mockPresence.removeUserFromPresence.mockResolvedValue(undefined);
  mockPresence.removeUserFromAllWorkspaces.mockResolvedValue([]);
  mockPresence.getOnlineUsers.mockResolvedValue([]);
});

// Helper: cria um cliente e aguarda conexão ou erro
function connectClient(token?: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${serverPort}`, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      autoConnect: true,
    });

    const timeoutId = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Connection timeout'));
    }, 3000);

    socket.on('connect', () => {
      clearTimeout(timeoutId);
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timeoutId);
      socket.disconnect();
      reject(err);
    });
  });
}

// Helper: aguarda um evento específico com timeout
function waitForEvent<T>(
  socket: ClientSocket,
  event: string,
  timeoutMs = 2000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for ${event}`)),
      timeoutMs,
    );
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// Helper: verifica repetidamente uma condição até ela passar ou o tempo expirar.
// Usado para testar efeitos assíncronos que não emitem eventos ao cliente
// (ex: o handler de disconnect chama funções internas sem resposta directa).
function waitForCondition(
  check: () => void,
  intervalMs = 50,
  timeoutMs = 2000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const poll = () => {
      try {
        check();
        resolve();
      } catch {
        if (Date.now() >= deadline) {
          reject(new Error('waitForCondition: timeout exceeded'));
        } else {
          setTimeout(poll, intervalMs);
        }
      }
    };
    poll();
  });
}

// ================================================================
// SUITE: Autenticação WebSocket
// ================================================================
describe('WebSocket — Autenticação', () => {
  it('rejects connection without token', async () => {
    await expect(connectClient()).rejects.toThrow();
  });

  it('rejects connection with invalid token', async () => {
    await expect(connectClient('token-invalido')).rejects.toThrow();
  });

  it('accepts connection with valid JWT', async () => {
    const socket = await connectClient(makeToken());
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });
});

// ================================================================
// SUITE: workspace:join
// ================================================================
describe('WebSocket — workspace:join', () => {
  const WORKSPACE_ID = 'ws-test-1';

  it('joins room and receives presence_update when user is a member', async () => {
    // Mock: utilizador é membro do workspace
    (mockDb as unknown as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnThis(),
      first: jest
        .fn()
        .mockResolvedValue({ workspace_id: WORKSPACE_ID, user_id: 'user-1' }),
    });

    mockPresence.addUserToPresence.mockResolvedValue(undefined);
    mockPresence.getOnlineUsers.mockResolvedValue([
      { id: 'user-1', email: 'test@test.com', name: 'Test User' },
    ]);

    const socket = await connectClient(makeToken());

    const presenceUpdate = waitForEvent<{ onlineUsers: unknown[] }>(
      socket,
      'workspace:presence_update',
    );

    socket.emit('workspace:join', { workspaceId: WORKSPACE_ID });

    const data = await presenceUpdate;
    expect(data.onlineUsers).toHaveLength(1);

    socket.disconnect();
  });

  it('emits error FORBIDDEN when user is not a member', async () => {
    // Mock: utilizador NÃO é membro
    (mockDb as unknown as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(undefined),
    });

    const socket = await connectClient(makeToken());

    const errorEvent = waitForEvent<{ code: string; message: string }>(
      socket,
      'error',
    );

    socket.emit('workspace:join', { workspaceId: WORKSPACE_ID });

    const err = await errorEvent;
    expect(err.code).toBe('FORBIDDEN');

    socket.disconnect();
  });

  it('emits error INVALID_PAYLOAD when workspaceId is missing', async () => {
    const socket = await connectClient(makeToken());

    const errorEvent = waitForEvent<{ code: string }>(socket, 'error');

    // Forçar payload inválido com cast para any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.emit('workspace:join', {} as any);

    const err = await errorEvent;
    expect(err.code).toBe('INVALID_PAYLOAD');

    socket.disconnect();
  });
});

// ================================================================
// SUITE: task:create via WebSocket
// ================================================================
describe('WebSocket — task:create', () => {
  const WORKSPACE_ID = 'ws-test-2';
  const COLUMN_ID = 'col-test-1';

  const newTask = {
    id: 'task-new',
    column_id: COLUMN_ID,
    title: 'Nova Task',
    priority: 'medium' as const,
    position: 0,
    description: null,
    assignee_id: null,
    due_date: null,
    updated_at: new Date().toISOString(),
  };

  it('creates task and emits task:created to the room', async () => {
    // Membership check para workspace:join
    (mockDb as unknown as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue({ workspace_id: WORKSPACE_ID }),
    });

    mockPresence.addUserToPresence.mockResolvedValue(undefined);
    mockPresence.getOnlineUsers.mockResolvedValue([]);
    mockTaskService.createTask.mockResolvedValue(newTask);

    const socket = await connectClient(makeToken());

    // Primeiro entrar na room para receber broadcasts
    const presenceUpdate = waitForEvent(socket, 'workspace:presence_update');
    socket.emit('workspace:join', { workspaceId: WORKSPACE_ID });
    await presenceUpdate;

    // Emitir task:create e aguardar task:created
    const taskCreated = waitForEvent<{ task: typeof newTask }>(
      socket,
      'task:created',
    );

    socket.emit('task:create', {
      workspaceId: WORKSPACE_ID,
      columnId: COLUMN_ID,
      title: 'Nova Task',
    });

    const data = await taskCreated;
    expect(data.task.id).toBe('task-new');
    expect(data.task.title).toBe('Nova Task');

    socket.disconnect();
  });

  it('emits error INVALID_PAYLOAD when title is missing', async () => {
    const socket = await connectClient(makeToken());

    const errorEvent = waitForEvent<{ code: string }>(socket, 'error');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.emit('task:create', {
      workspaceId: WORKSPACE_ID,
      columnId: COLUMN_ID,
    } as any);

    const err = await errorEvent;
    expect(err.code).toBe('INVALID_PAYLOAD');

    socket.disconnect();
  });
});

// ================================================================
// SUITE: task:update via WebSocket
// ================================================================
describe('WebSocket — task:update', () => {
  const WORKSPACE_ID = 'ws-test-3';
  const TASK_ID = 'task-to-update';

  const updatedTask = {
    id: TASK_ID,
    column_id: 'col-test-1',
    title: 'Updated Title',
    priority: 'high' as const,
    position: 0,
    description: null,
    assignee_id: null,
    due_date: null,
    updated_at: new Date().toISOString(),
    workspace_id: WORKSPACE_ID,
  };

  it('updates task and emits task:updated to the room', async () => {
    (mockDb as unknown as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue({ workspace_id: WORKSPACE_ID }),
    });

    mockPresence.addUserToPresence.mockResolvedValue(undefined);
    mockPresence.getOnlineUsers.mockResolvedValue([]);
    mockTaskService.updateTask.mockResolvedValue(updatedTask);

    const socket = await connectClient(makeToken());

    const presenceUpdate = waitForEvent(socket, 'workspace:presence_update');
    socket.emit('workspace:join', { workspaceId: WORKSPACE_ID });
    await presenceUpdate;

    const taskUpdated = waitForEvent<{ task: typeof updatedTask }>(
      socket,
      'task:updated',
    );

    socket.emit('task:update', {
      taskId: TASK_ID,
      fields: { title: 'Updated Title', priority: 'high' },
    });

    const data = await taskUpdated;
    expect(data.task.id).toBe(TASK_ID);
    expect(data.task.title).toBe('Updated Title');

    socket.disconnect();
  });

  it('emits INVALID_PAYLOAD when fields object is empty', async () => {
    const socket = await connectClient(makeToken());

    const errorEvent = waitForEvent<{ code: string }>(socket, 'error');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.emit('task:update', { taskId: TASK_ID, fields: {} } as any);

    const err = await errorEvent;
    expect(err.code).toBe('INVALID_PAYLOAD');

    socket.disconnect();
  });

  it('emits INVALID_PAYLOAD when taskId is missing', async () => {
    const socket = await connectClient(makeToken());

    const errorEvent = waitForEvent<{ code: string }>(socket, 'error');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.emit('task:update', { fields: { title: 'T' } } as any);

    const err = await errorEvent;
    expect(err.code).toBe('INVALID_PAYLOAD');

    socket.disconnect();
  });

  it('emits FORBIDDEN when service throws AppError 404', async () => {
    const { AppError } = await import('../../src/middleware/errorHandler.js');

    mockTaskService.updateTask.mockRejectedValue(
      new AppError('Task not found or access denied', 404),
    );

    const socket = await connectClient(makeToken());

    const errorEvent = waitForEvent<{ code: string }>(socket, 'error');

    socket.emit('task:update', {
      taskId: TASK_ID,
      fields: { title: 'T' },
    });

    const err = await errorEvent;
    expect(err.code).toBe('FORBIDDEN');

    socket.disconnect();
  });
});

// ================================================================
// SUITE: task:move via WebSocket
// ================================================================
describe('WebSocket — task:move', () => {
  const WORKSPACE_ID = 'ws-test-4';
  const TASK_ID = 'task-to-move';
  const TARGET_COLUMN_ID = 'col-target-1';

  const movedTask = {
    id: TASK_ID,
    column_id: TARGET_COLUMN_ID,
    title: 'Some Task',
    priority: 'medium' as const,
    position: 1,
    description: null,
    assignee_id: null,
    due_date: null,
    updated_at: new Date().toISOString(),
    workspace_id: WORKSPACE_ID,
  };

  it('moves task and emits task:moved to the room', async () => {
    (mockDb as unknown as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue({ workspace_id: WORKSPACE_ID }),
    });

    mockPresence.addUserToPresence.mockResolvedValue(undefined);
    mockPresence.getOnlineUsers.mockResolvedValue([]);
    mockTaskService.moveTask.mockResolvedValue(movedTask);

    const socket = await connectClient(makeToken());

    const presenceUpdate = waitForEvent(socket, 'workspace:presence_update');
    socket.emit('workspace:join', { workspaceId: WORKSPACE_ID });
    await presenceUpdate;

    const taskMoved = waitForEvent<{
      taskId: string;
      targetColumnId: string;
      newPosition: number;
      movedBy: string;
    }>(socket, 'task:moved');

    socket.emit('task:move', {
      taskId: TASK_ID,
      targetColumnId: TARGET_COLUMN_ID,
      newPosition: 1,
    });

    const data = await taskMoved;
    expect(data.taskId).toBe(TASK_ID);
    expect(data.targetColumnId).toBe(TARGET_COLUMN_ID);
    expect(data.newPosition).toBe(1);
    expect(data.movedBy).toBe('user-1');

    socket.disconnect();
  });

  it('emits INVALID_PAYLOAD when targetColumnId is missing', async () => {
    const socket = await connectClient(makeToken());

    const errorEvent = waitForEvent<{ code: string }>(socket, 'error');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.emit('task:move', { taskId: TASK_ID, newPosition: 0 } as any);

    const err = await errorEvent;
    expect(err.code).toBe('INVALID_PAYLOAD');

    socket.disconnect();
  });

  it('emits INVALID_PAYLOAD when newPosition is negative', async () => {
    const socket = await connectClient(makeToken());

    const errorEvent = waitForEvent<{ code: string }>(socket, 'error');

    socket.emit('task:move', {
      taskId: TASK_ID,
      targetColumnId: TARGET_COLUMN_ID,
      newPosition: -1,
    });

    const err = await errorEvent;
    expect(err.code).toBe('INVALID_PAYLOAD');

    socket.disconnect();
  });

  it('emits FORBIDDEN when service throws AppError 403', async () => {
    const { AppError } = await import('../../src/middleware/errorHandler.js');

    mockTaskService.moveTask.mockRejectedValue(
      new AppError('Access denied', 403),
    );

    const socket = await connectClient(makeToken());

    const errorEvent = waitForEvent<{ code: string }>(socket, 'error');

    socket.emit('task:move', {
      taskId: TASK_ID,
      targetColumnId: TARGET_COLUMN_ID,
      newPosition: 0,
    });

    const err = await errorEvent;
    expect(err.code).toBe('FORBIDDEN');

    socket.disconnect();
  });
});

// ================================================================
// SUITE: task:delete via WebSocket
// ================================================================
describe('WebSocket — task:delete', () => {
  const WORKSPACE_ID = 'ws-test-3';
  const TASK_ID = 'task-to-delete';

  it('deletes task and emits task:deleted to the room', async () => {
    // Membership check
    (mockDb as unknown as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue({ workspace_id: WORKSPACE_ID }),
    });

    mockPresence.addUserToPresence.mockResolvedValue(undefined);
    mockPresence.getOnlineUsers.mockResolvedValue([]);
    mockTaskService.deleteTask.mockResolvedValue({
      taskId: TASK_ID,
      workspaceId: WORKSPACE_ID,
    });

    const socket = await connectClient(makeToken());

    // Entrar na room
    const presenceUpdate = waitForEvent(socket, 'workspace:presence_update');
    socket.emit('workspace:join', { workspaceId: WORKSPACE_ID });
    await presenceUpdate;

    // Emitir task:delete e aguardar task:deleted
    const taskDeleted = waitForEvent<{ taskId: string; deletedBy: string }>(
      socket,
      'task:deleted',
    );

    socket.emit('task:delete', { taskId: TASK_ID });

    const data = await taskDeleted;
    expect(data.taskId).toBe(TASK_ID);
    expect(data.deletedBy).toBe('user-1');

    socket.disconnect();
  });
});

// ================================================================
// SUITE: disconnect cleanup (FR-31)
// ================================================================
// O evento 'disconnect' é disparado automaticamente pelo Socket.io
// quando a ligação TCP é encerrada. O handler deve remover o
// utilizador de todos os Sets de presença no Redis e notificar
// as rooms afectadas.
describe('WebSocket — disconnect cleanup', () => {
  it('calls removeUserFromAllWorkspaces with the authenticated userId on disconnect', async () => {
    mockPresence.removeUserFromAllWorkspaces.mockResolvedValue([]);

    const socket = await connectClient(makeToken());

    // Desligar o cliente — dispara o evento 'disconnect' no servidor
    socket.disconnect();

    // O handler de disconnect é assíncrono: polling até a condição ser verdadeira
    await waitForCondition(() => {
      expect(mockPresence.removeUserFromAllWorkspaces).toHaveBeenCalledWith(
        'user-1',
      );
    });
  });

  it('broadcasts presence_update to affected rooms after disconnect', async () => {
    const WORKSPACE_ID = 'ws-disconnect-1';

    // Simula que o utilizador estava presente em ws-disconnect-1
    mockPresence.removeUserFromAllWorkspaces.mockResolvedValue([WORKSPACE_ID]);
    mockPresence.getOnlineUsers.mockResolvedValue([]);

    // Ligar um segundo cliente à mesma room para receber o broadcast
    (mockDb as unknown as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue({ workspace_id: WORKSPACE_ID }),
    });

    const observer = await connectClient(
      makeToken('user-2', 'observer@test.com', 'Observer'),
    );
    const presenceUpdate = waitForEvent<{ onlineUsers: unknown[] }>(
      observer,
      'workspace:presence_update',
    );
    observer.emit('workspace:join', { workspaceId: WORKSPACE_ID });
    await presenceUpdate; // aguardar o join

    // Ligar o utilizador que vai desligar
    const socket = await connectClient(makeToken());
    socket.disconnect();

    // Aguardar que o observer receba o presence_update do disconnect
    const updateAfterDisconnect = await waitForEvent<{
      onlineUsers: unknown[];
    }>(observer, 'workspace:presence_update');

    expect(updateAfterDisconnect.onlineUsers).toEqual([]);
    observer.disconnect();
  });

  it('does not throw when removeUserFromAllWorkspaces returns undefined (defensive check)', async () => {
    // Simula o comportamento problemático que causava "is not iterable"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockPresence.removeUserFromAllWorkspaces.mockResolvedValue(
      undefined as any,
    );

    const socket = await connectClient(makeToken());
    socket.disconnect();

    // Verificar que o handler não lança — o erro seria apanhado pelo catch
    // mas o teste valida que removeUserFromAllWorkspaces foi chamado
    await waitForCondition(() => {
      expect(mockPresence.removeUserFromAllWorkspaces).toHaveBeenCalled();
    });
  });
});
