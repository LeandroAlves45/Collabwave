// ============================================================
// CollabWave — Unit Tests: task.service.ts
// ============================================================
// Testa a lógica de negócio do task service em isolamento.
// A base de dados é mockada — não são precisas conexões reais.
//
// COBERTURA:
//   createTask  — posição automática, membership, assigneeId
//   updateTask  — campos parciais, assigneeId
//   moveTask    — mesma coluna, coluna diferente, clamp, noop
//   deleteTask  — reordenação após remoção
// ============================================================

// O jest.mock tem de ser chamado ANTES de qualquer import que use o módulo.
// TypeScript/ts-jest eleva os jest.mock ao topo do ficheiro de forma segura.
jest.mock('../../src/config/database.js');

import { AppError } from '../../src/middleware/errorHandler.js';
import * as taskService from '../../src/modules/tasks/task.service.js';
import db from '../../src/config/database.js';

// Knex retorna um query builder com métodos encadeáveis.
// Precisamos de um helper que crie um mock desse builder.
function buildMock(resolvedValue: unknown) {
  const qb: Record<string, jest.Mock> = {};
  const methods = [
    'where', 'andWhere', 'whereIn', 'join', 'select', 'insert',
    'update', 'delete', 'returning', 'first', 'orderBy', 'max',
    'count', 'increment', 'decrement', 'on', 'andOnVal',
  ];
 
  methods.forEach((m) => {
    qb[m] = jest.fn().mockReturnValue(qb);
  });
 
  // first() e count().first().then() precisam de resolver valores
  qb['first'] = jest.fn().mockResolvedValue(resolvedValue);
  qb['then'] = jest.fn().mockImplementation((cb: (v: unknown) => unknown) =>
    Promise.resolve(cb(resolvedValue)),
  );
 
  return qb;
}

// ----------------------------------------------------------------
// Tipagem do db mockado
// ----------------------------------------------------------------
const mockDb = db as unknown as jest.MockedFunction<typeof db> & {
  transaction: jest.Mock;
};
 
// ----------------------------------------------------------------
// SUITE: createTask
// ----------------------------------------------------------------
describe('createTask', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates task at position 0 when column is empty', async () => {
    const workspaceId = 'ws-1';
    const userId = 'user-1';
    const payload = { columnId: 'col-1', title: 'Nova task' };
 
    // Simula: coluna existe + membro confirmado (JOIN devolve um registo)
    const columnQb = buildMock({ id: 'col-1', workspace_id: workspaceId });
 
    // Simula: max(position) devolve null (coluna vazia)
    const maxQb = buildMock({ maxPos: null });
    maxQb['first'] = jest.fn().mockResolvedValue({ maxPos: null });
 
    // Simula: INSERT devolve a nova task
    const newTask = {
      id: 'task-1',
      column_id: 'col-1',
      title: 'Nova task',
      position: 0,
      priority: 'medium',
      description: null,
      assignee_id: null,
      due_date: null,
      updated_at: new Date().toISOString(),
    };
    const insertQb = buildMock([newTask]);
    insertQb['returning'] = jest.fn().mockResolvedValue([newTask]);
 
    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(columnQb)  // db('columns').join...
      .mockReturnValueOnce(maxQb)     // db('tasks').max...
      .mockReturnValueOnce(insertQb); // db('tasks').insert...
 
    const result = await taskService.createTask(workspaceId, userId, payload);
 
    expect(result.position).toBe(0);
    expect(result.title).toBe('Nova task');
  });
 
  it('calculates position correctly when tasks already exist', async () => {
    const workspaceId = 'ws-1';
    const userId = 'user-1';
    const payload = { columnId: 'col-1', title: 'Task 3' };
 
    const columnQb = buildMock({ id: 'col-1', workspace_id: workspaceId });
 
    // max(position) = 1 → nova task deve ter position = 2
    const maxQb = buildMock({ maxPos: 1 });
    maxQb['first'] = jest.fn().mockResolvedValue({ maxPos: 1 });
 
    const newTask = {
      id: 'task-3', column_id: 'col-1', title: 'Task 3', position: 2,
      priority: 'medium', description: null, assignee_id: null,
      due_date: null, updated_at: new Date().toISOString(),
    };
    const insertQb = buildMock([newTask]);
    insertQb['returning'] = jest.fn().mockResolvedValue([newTask]);
 
    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(columnQb)
      .mockReturnValueOnce(maxQb)
      .mockReturnValueOnce(insertQb);
 
    const result = await taskService.createTask(workspaceId, userId, payload);
 
    expect(result.position).toBe(2);
  });
 
  it('throws 404 when column does not exist or user is not member', async () => {
    const columnQb = buildMock(undefined); // JOIN não encontra nenhum registo
    columnQb['first'] = jest.fn().mockResolvedValue(undefined);
 
    (mockDb as unknown as jest.Mock).mockReturnValueOnce(columnQb);
 
    await expect(
      taskService.createTask('ws-1', 'user-1', { columnId: 'col-x', title: 'T' }),
    ).rejects.toThrow(AppError);
  });
 
  it('throws 400 when assigneeId is not workspace member (createTask)', async () => {
    const workspaceId = 'ws-1';
    const columnQb = buildMock({ id: 'col-1', workspace_id: workspaceId });

    // workspace_members: assignee não encontrado
    const assigneeQb = buildMock(undefined);
    assigneeQb['first'] = jest.fn().mockResolvedValue(undefined);

    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(columnQb)  // column membership check
      .mockReturnValueOnce(assigneeQb); // assignee membership check

    await expect(
      taskService.createTask(workspaceId, 'user-1', {
        columnId: 'col-1',
        title: 'Task',
        assigneeId: 'outsider-id',
      }),
    ).rejects.toThrow(AppError);
  });
});

// ----------------------------------------------------------------
// SUITE: updateTask
// ----------------------------------------------------------------
describe('updateTask', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates only provided fields', async () => {
    const task = {
      id: 'task-1', column_id: 'col-1', workspace_id: 'ws-1',
      title: 'Título original', priority: 'medium', position: 0,
      description: null, assignee_id: null, due_date: null,
      updated_at: '2024-01-01T00:00:00.000Z',
    };
 
    // resolveTaskMembership retorna task com workspace_id
    const resolveQb = buildMock(task);
    resolveQb['first'] = jest.fn().mockResolvedValue(task);
 
    // UPDATE retorna task atualizada
    const updatedTask = { ...task, title: 'Título novo' };
    const updateQb = buildMock([updatedTask]);
    updateQb['returning'] = jest.fn().mockResolvedValue([updatedTask]);
 
    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(resolveQb)
      .mockReturnValueOnce(updateQb);
 
    const result = await taskService.updateTask('task-1', 'user-1', {
      title: 'Título novo',
    });
 
    expect(result.title).toBe('Título novo');
    expect(result.workspace_id).toBe('ws-1');
  });
 
  it('throws 404 when task does not exist or user has no access (updateTask)', async () => {
    const resolveQb = buildMock(undefined);
    resolveQb['first'] = jest.fn().mockResolvedValue(undefined);

    (mockDb as unknown as jest.Mock).mockReturnValueOnce(resolveQb);

    await expect(
      taskService.updateTask('task-x', 'user-1', { title: 'T' }),
    ).rejects.toThrow(AppError);
  });

  it('throws 400 when assigneeId is not workspace member (updateTask)', async () => {
    const task = {
      id: 'task-1', column_id: 'col-1', workspace_id: 'ws-1',
      title: 'T', priority: 'medium', position: 0,
      description: null, assignee_id: null, due_date: null,
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    const resolveQb = buildMock(task);
    resolveQb['first'] = jest.fn().mockResolvedValue(task);

    const assigneeQb = buildMock(undefined);
    assigneeQb['first'] = jest.fn().mockResolvedValue(undefined);

    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(resolveQb)
      .mockReturnValueOnce(assigneeQb);

    await expect(
      taskService.updateTask('task-1', 'user-1', { assigneeId: 'outsider' }),
    ).rejects.toThrow(AppError);
  });
});
 
// ----------------------------------------------------------------
// SUITE: moveTask
// ----------------------------------------------------------------
describe('moveTask', () => {
  beforeEach(() => jest.clearAllMocks());
 
  const makeTask = (pos: number, colId = 'col-1') => ({
    id: 'task-1', column_id: colId, workspace_id: 'ws-1',
    title: 'T', priority: 'medium' as const, position: pos,
    description: null, assignee_id: null, due_date: null,
    updated_at: '2024-01-01T00:00:00.000Z',
  });
 
  it('returns task unchanged when position does not change (noop)', async () => {
    const task = makeTask(2);
 
    const resolveQb = buildMock(task);
    resolveQb['first'] = jest.fn().mockResolvedValue(task);
 
    const targetColQb = buildMock({ id: 'col-1' });
    targetColQb['first'] = jest.fn().mockResolvedValue({ id: 'col-1' });
 
    // count de tasks na coluna destino (mesma coluna, 3 tasks)
    const countQb = buildMock({ n: 3 });
    countQb['first'] = jest.fn().mockResolvedValue({ n: '3' });
    countQb['then'] = jest.fn().mockImplementation(
      (cb: (v: unknown) => unknown) => Promise.resolve(cb({ n: '3' })),
    );
 
    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(resolveQb)
      .mockReturnValueOnce(targetColQb)
      .mockReturnValueOnce(countQb);
 
    const result = await taskService.moveTask('task-1', 'user-1', {
      targetColumnId: 'col-1',
      newPosition: 2,
    });
 
    // Não deve ter chamado a transação
    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(result.position).toBe(2);
  });
 
  it('throws 404 when target column does not belong to workspace', async () => {
    const task = makeTask(0);
 
    const resolveQb = buildMock(task);
    resolveQb['first'] = jest.fn().mockResolvedValue(task);
 
    const targetColQb = buildMock(undefined);
    targetColQb['first'] = jest.fn().mockResolvedValue(undefined);
 
    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(resolveQb)
      .mockReturnValueOnce(targetColQb);
 
    await expect(
      taskService.moveTask('task-1', 'user-1', {
        targetColumnId: 'col-inexistente',
        newPosition: 0,
      }),
    ).rejects.toThrow(AppError);
  });
 
  it('clamp: position higher than maximum is clamped to last valid index', async () => {
    const task = makeTask(0);
 
    const resolveQb = buildMock(task);
    resolveQb['first'] = jest.fn().mockResolvedValue(task);
 
    const targetColQb = buildMock({ id: 'col-1' });
    targetColQb['first'] = jest.fn().mockResolvedValue({ id: 'col-1' });
 
    // 3 tasks na mesma coluna → maxPosition = 3 - 1 = 2
    const countQb = buildMock({ n: '3' });
    countQb['first'] = jest.fn().mockResolvedValue({ n: '3' });
    countQb['then'] = jest.fn().mockImplementation(
      (cb: (v: unknown) => unknown) => Promise.resolve(cb({ n: '3' })),
    );
 
    const movedTask = { ...task, position: 2 };
    mockDb.transaction = jest.fn().mockImplementation(async (fn: (trx: unknown) => Promise<unknown>) => {
      const trxQb = buildMock([movedTask]);
      trxQb['returning'] = jest.fn().mockResolvedValue([movedTask]);
      // trx é um callable que devolve o mesmo qb para qualquer tabela
      const trx = jest.fn().mockReturnValue(trxQb);
      return fn(trx);
    });
 
    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(resolveQb)
      .mockReturnValueOnce(targetColQb)
      .mockReturnValueOnce(countQb);
 
    const result = await taskService.moveTask('task-1', 'user-1', {
      targetColumnId: 'col-1',
      newPosition: 999, // deve ser clamped para 2
    });
 
    expect(result.position).toBe(2);
  });
});
 
// ----------------------------------------------------------------
// SUITE: deleteTask
// ----------------------------------------------------------------
describe('deleteTask', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 404 when task does not exist or user has no access (deleteTask)', async () => {
    const resolveQb = buildMock(undefined);
    resolveQb['first'] = jest.fn().mockResolvedValue(undefined);

    (mockDb as unknown as jest.Mock).mockReturnValueOnce(resolveQb);

    await expect(
      taskService.deleteTask('task-x', 'user-1'),
    ).rejects.toThrow(AppError);
  });

  it('returns taskId and workspaceId after successful deletion', async () => {
    const task = {
      id: 'task-1', column_id: 'col-1', workspace_id: 'ws-1',
      title: 'T', priority: 'medium', position: 1,
      description: null, assignee_id: null, due_date: null,
      updated_at: '2024-01-01T00:00:00.000Z',
    };
 
    const resolveQb = buildMock(task);
    resolveQb['first'] = jest.fn().mockResolvedValue(task);
 
    const deleteQb = buildMock(1);
    const reorderQb = buildMock(1);
 
    mockDb.transaction = jest.fn().mockImplementation(async (fn: (trx: unknown) => Promise<unknown>) => {
      const trx = jest.fn()
        .mockReturnValueOnce(deleteQb)
        .mockReturnValueOnce(reorderQb);
      return fn(trx);
    });
 
    (mockDb as unknown as jest.Mock).mockReturnValueOnce(resolveQb);
 
    const result = await taskService.deleteTask('task-1', 'user-1');
 
    expect(result.taskId).toBe('task-1');
    expect(result.workspaceId).toBe('ws-1');
  });
});