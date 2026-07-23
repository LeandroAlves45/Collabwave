jest.mock('../../src/config/database.js');

import db from '../../src/config/database.js';
import * as columnService from '../../src/modules/columns/column.service.js';

function query(value: unknown) {
  const builder: Record<string, jest.Mock> = {};
  for (const method of [
    'where',
    'andWhere',
    'join',
    'select',
    'insert',
    'update',
    'orderBy',
    'max',
    'increment',
    'decrement',
    'on',
    'andOnVal',
    'forUpdate',
  ]) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }
  builder.first = jest.fn().mockResolvedValue(value);
  builder.returning = jest.fn().mockResolvedValue(value);
  builder.then = jest
    .fn()
    .mockImplementation((resolve: (result: unknown) => unknown) =>
      Promise.resolve(resolve(value)),
    );
  return builder;
}

const mockDb = db as unknown as jest.MockedFunction<typeof db> & {
  transaction: jest.Mock;
};

function transactionWith(
  queues: Record<string, Array<Record<string, jest.Mock>>>,
): jest.Mock {
  return jest.fn(async (callback: (trx: jest.Mock) => Promise<unknown>) => {
    const trx = jest.fn((table: string) => queues[table].shift());
    return callback(trx);
  });
}

describe('column concurrency', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('serializes column creation by locking the workspace row', async () => {
    const workspaceLock = query({ id: 'workspace-1' });
    const created = {
      id: 'column-2',
      workspace_id: 'workspace-1',
      title: 'Done',
      position: 2,
    };
    mockDb.transaction = transactionWith({
      workspace_members: [query({ role: 'member' })],
      workspaces: [workspaceLock],
      columns: [query({ maxPos: 1 }), query([created])],
    });

    const result = await columnService.createColumn(
      'workspace-1',
      'user-1',
      { title: 'Done' },
    );

    expect(result).toEqual(created);
    expect(workspaceLock.forUpdate).toHaveBeenCalled();
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });

  it('locks all board columns before reordering', async () => {
    const current = {
      id: 'column-1',
      workspace_id: 'workspace-1',
      title: 'Todo',
      position: 0,
    };
    const lockedColumns = query([current, { ...current, id: 'column-2', position: 1 }]);
    const moved = { ...current, position: 1 };
    mockDb.transaction = transactionWith({
      columns: [query(current), lockedColumns, query(1), query([moved])],
    });

    const result = await columnService.reorderColumn(
      'column-1',
      'user-1',
      { newPosition: 1 },
    );

    expect(result).toEqual(moved);
    expect(lockedColumns.forUpdate).toHaveBeenCalled();
  });
});
