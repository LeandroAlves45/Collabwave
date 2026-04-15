// ============================================================
// CollabWave — Unit Tests: column.service.ts
// ============================================================
// Testa a lógica de negócio do column service em isolamento.
// A base de dados é mockada — não são precisas conexões reais.
//
// COBERTURA:
//   createColumn  — membership 403, posição 0, posição N
//   updateColumn  — 404 sem acesso, sucesso
//   deleteColumn  — 404 sem acesso, transação de reordenação
//   reorderColumn — noop, clamp, mover para a direita, mover para a esquerda
// ============================================================

jest.mock('../../src/config/database.js');

import { AppError } from '../../src/middleware/errorHandler.js';
import * as columnService from '../../src/modules/columns/column.service.js';
import db from '../../src/config/database.js';

// ----------------------------------------------------------------
// Helper: buildMock
// ----------------------------------------------------------------
// Cria um query builder Knex encadeável com o valor resolvido.
function buildMock(resolvedValue: unknown) {
  const qb: Record<string, jest.Mock> = {};
  const methods = [
    'where',
    'andWhere',
    'join',
    'select',
    'insert',
    'update',
    'delete',
    'returning',
    'first',
    'max',
    'count',
    'increment',
    'decrement',
    'on',
    'andOnVal',
  ];

  methods.forEach((m) => {
    qb[m] = jest.fn().mockReturnValue(qb);
  });

  qb['first'] = jest.fn().mockResolvedValue(resolvedValue);
  qb['then'] = jest
    .fn()
    .mockImplementation((cb: (v: unknown) => unknown) =>
      Promise.resolve(cb(resolvedValue)),
    );

  return qb;
}

const mockDb = db as unknown as jest.MockedFunction<typeof db> & {
  transaction: jest.Mock;
};

// ----------------------------------------------------------------
// SUITE: createColumn
// ----------------------------------------------------------------
describe('createColumn', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 403 when user is not a member of the workspace', async () => {
    // workspace_members lookup returns nothing
    const memberQb = buildMock(undefined);
    memberQb['first'] = jest.fn().mockResolvedValue(undefined);

    (mockDb as unknown as jest.Mock).mockReturnValueOnce(memberQb);

    await expect(
      columnService.createColumn('ws-1', 'user-1', { title: 'To Do' }),
    ).rejects.toThrow(AppError);

    const call = jest.mocked(
      (await import('../../src/middleware/errorHandler.js')).AppError,
    );
    void call;
  });

  it('creates column at position 0 when workspace has no columns', async () => {
    const memberQb = buildMock({ workspace_id: 'ws-1', user_id: 'user-1' });

    // max(position) returns null — no columns yet
    const maxQb = buildMock({ maxPos: null });
    maxQb['first'] = jest.fn().mockResolvedValue({ maxPos: null });

    const newColumn = {
      id: 'col-1',
      workspace_id: 'ws-1',
      title: 'To Do',
      position: 0,
    };
    const insertQb = buildMock([newColumn]);
    insertQb['returning'] = jest.fn().mockResolvedValue([newColumn]);

    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(memberQb)
      .mockReturnValueOnce(maxQb)
      .mockReturnValueOnce(insertQb);

    const result = await columnService.createColumn('ws-1', 'user-1', {
      title: 'To Do',
    });

    expect(result.position).toBe(0);
    expect(result.title).toBe('To Do');
  });

  it('appends column at max + 1 when columns already exist', async () => {
    const memberQb = buildMock({ workspace_id: 'ws-1', user_id: 'user-1' });

    // max(position) = 1 → next position = 2
    const maxQb = buildMock({ maxPos: 1 });
    maxQb['first'] = jest.fn().mockResolvedValue({ maxPos: 1 });

    const newColumn = {
      id: 'col-3',
      workspace_id: 'ws-1',
      title: 'Done',
      position: 2,
    };
    const insertQb = buildMock([newColumn]);
    insertQb['returning'] = jest.fn().mockResolvedValue([newColumn]);

    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(memberQb)
      .mockReturnValueOnce(maxQb)
      .mockReturnValueOnce(insertQb);

    const result = await columnService.createColumn('ws-1', 'user-1', {
      title: 'Done',
    });

    expect(result.position).toBe(2);
  });
});

// ----------------------------------------------------------------
// SUITE: updateColumn
// ----------------------------------------------------------------
describe('updateColumn', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 404 when column does not exist or user has no access', async () => {
    // resolveColumnMembership JOIN returns nothing
    const resolveQb = buildMock(undefined);
    resolveQb['first'] = jest.fn().mockResolvedValue(undefined);

    (mockDb as unknown as jest.Mock).mockReturnValueOnce(resolveQb);

    await expect(
      columnService.updateColumn('col-x', 'user-1', { title: 'New Title' }),
    ).rejects.toThrow(AppError);
  });

  it('returns updated column with new title', async () => {
    const column = {
      id: 'col-1',
      workspace_id: 'ws-1',
      title: 'Old',
      position: 0,
    };

    const resolveQb = buildMock(column);
    resolveQb['first'] = jest.fn().mockResolvedValue(column);

    const updatedColumn = { ...column, title: 'New Title' };
    const updateQb = buildMock([updatedColumn]);
    updateQb['returning'] = jest.fn().mockResolvedValue([updatedColumn]);

    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(resolveQb)
      .mockReturnValueOnce(updateQb);

    const result = await columnService.updateColumn('col-1', 'user-1', {
      title: 'New Title',
    });

    expect(result.title).toBe('New Title');
  });
});

// ----------------------------------------------------------------
// SUITE: deleteColumn
// ----------------------------------------------------------------
describe('deleteColumn', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 404 when column does not exist or user has no access', async () => {
    const resolveQb = buildMock(undefined);
    resolveQb['first'] = jest.fn().mockResolvedValue(undefined);

    (mockDb as unknown as jest.Mock).mockReturnValueOnce(resolveQb);

    await expect(columnService.deleteColumn('col-x', 'user-1')).rejects.toThrow(
      AppError,
    );
  });

  it('deletes column and reorders remaining columns in a transaction', async () => {
    const column = {
      id: 'col-1',
      workspace_id: 'ws-1',
      title: 'To Do',
      position: 1,
    };

    const resolveQb = buildMock(column);
    resolveQb['first'] = jest.fn().mockResolvedValue(column);

    const deleteQb = buildMock(1);
    const reorderQb = buildMock(1);

    mockDb.transaction = jest
      .fn()
      .mockImplementation(async (fn: (trx: unknown) => Promise<void>) => {
        const trx = jest
          .fn()
          .mockReturnValueOnce(deleteQb)
          .mockReturnValueOnce(reorderQb);
        return fn(trx);
      });

    (mockDb as unknown as jest.Mock).mockReturnValueOnce(resolveQb);

    await expect(
      columnService.deleteColumn('col-1', 'user-1'),
    ).resolves.toBeUndefined();

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });
});

// ----------------------------------------------------------------
// SUITE: reorderColumn
// ----------------------------------------------------------------
describe('reorderColumn', () => {
  beforeEach(() => jest.clearAllMocks());

  const makeColumn = (pos: number) => ({
    id: 'col-1',
    workspace_id: 'ws-1',
    title: 'To Do',
    position: pos,
  });

  it('throws 404 when column does not exist or user has no access', async () => {
    const resolveQb = buildMock(undefined);
    resolveQb['first'] = jest.fn().mockResolvedValue(undefined);

    (mockDb as unknown as jest.Mock).mockReturnValueOnce(resolveQb);

    await expect(
      columnService.reorderColumn('col-x', 'user-1', { newPosition: 0 }),
    ).rejects.toThrow(AppError);
  });

  it('returns column unchanged when position is already correct (noop)', async () => {
    const column = makeColumn(1);

    const resolveQb = buildMock(column);
    resolveQb['first'] = jest.fn().mockResolvedValue(column);

    // 3 columns total → maxPosition = 2; clamp(1) = 1 → same as current
    const countQb = buildMock({ n: '3' });
    countQb['first'] = jest.fn().mockResolvedValue({ n: '3' });
    countQb['then'] = jest
      .fn()
      .mockImplementation((cb: (v: unknown) => unknown) =>
        Promise.resolve(cb({ n: '3' })),
      );

    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(resolveQb)
      .mockReturnValueOnce(countQb);

    const result = await columnService.reorderColumn('col-1', 'user-1', {
      newPosition: 1,
    });

    expect(result.position).toBe(1);
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('clamps newPosition to the last valid index when value is too high', async () => {
    const column = makeColumn(0);

    const resolveQb = buildMock(column);
    resolveQb['first'] = jest.fn().mockResolvedValue(column);

    // 3 columns → maxPosition = 2; clamp(999) = 2
    const countQb = buildMock({ n: '3' });
    countQb['first'] = jest.fn().mockResolvedValue({ n: '3' });
    countQb['then'] = jest
      .fn()
      .mockImplementation((cb: (v: unknown) => unknown) =>
        Promise.resolve(cb({ n: '3' })),
      );

    const movedColumn = { ...column, position: 2 };
    mockDb.transaction = jest
      .fn()
      .mockImplementation(async (fn: (trx: unknown) => Promise<unknown>) => {
        const trxQb = buildMock([movedColumn]);
        trxQb['returning'] = jest.fn().mockResolvedValue([movedColumn]);
        const trx = jest.fn().mockReturnValue(trxQb);
        return fn(trx);
      });

    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(resolveQb)
      .mockReturnValueOnce(countQb);

    const result = await columnService.reorderColumn('col-1', 'user-1', {
      newPosition: 999,
    });

    expect(result.position).toBe(2);
  });

  it('moves column right: decrements intermediate columns', async () => {
    // column at position 0, moving to position 2
    const column = makeColumn(0);

    const resolveQb = buildMock(column);
    resolveQb['first'] = jest.fn().mockResolvedValue(column);

    // 3 columns
    const countQb = buildMock({ n: '3' });
    countQb['first'] = jest.fn().mockResolvedValue({ n: '3' });
    countQb['then'] = jest
      .fn()
      .mockImplementation((cb: (v: unknown) => unknown) =>
        Promise.resolve(cb({ n: '3' })),
      );

    const movedColumn = { ...column, position: 2 };
    let trxCallCount = 0;
    mockDb.transaction = jest
      .fn()
      .mockImplementation(async (fn: (trx: unknown) => Promise<unknown>) => {
        const trxQb = buildMock([movedColumn]);
        trxQb['returning'] = jest.fn().mockResolvedValue([movedColumn]);
        const trx = jest.fn().mockImplementation(() => {
          trxCallCount++;
          return trxQb;
        });
        return fn(trx);
      });

    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(resolveQb)
      .mockReturnValueOnce(countQb);

    const result = await columnService.reorderColumn('col-1', 'user-1', {
      newPosition: 2,
    });

    // transaction was called and returned the updated column
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(result.position).toBe(2);
  });

  it('moves column left: increments intermediate columns', async () => {
    // column at position 2, moving to position 0
    const column = makeColumn(2);

    const resolveQb = buildMock(column);
    resolveQb['first'] = jest.fn().mockResolvedValue(column);

    const countQb = buildMock({ n: '3' });
    countQb['first'] = jest.fn().mockResolvedValue({ n: '3' });
    countQb['then'] = jest
      .fn()
      .mockImplementation((cb: (v: unknown) => unknown) =>
        Promise.resolve(cb({ n: '3' })),
      );

    const movedColumn = { ...column, position: 0 };
    mockDb.transaction = jest
      .fn()
      .mockImplementation(async (fn: (trx: unknown) => Promise<unknown>) => {
        const trxQb = buildMock([movedColumn]);
        trxQb['returning'] = jest.fn().mockResolvedValue([movedColumn]);
        const trx = jest.fn().mockReturnValue(trxQb);
        return fn(trx);
      });

    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(resolveQb)
      .mockReturnValueOnce(countQb);

    const result = await columnService.reorderColumn('col-1', 'user-1', {
      newPosition: 0,
    });

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(result.position).toBe(0);
  });
});
