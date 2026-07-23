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
    'delete',
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

const mockDb = db as unknown as jest.Mock & {
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

    const result = await columnService.createColumn('workspace-1', 'user-1', {
      title: 'Done',
    });

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
    const lockedColumns = query([
      current,
      { ...current, id: 'column-2', position: 1 },
    ]);
    const moved = { ...current, position: 1 };
    mockDb.transaction = transactionWith({
      columns: [query(current), lockedColumns, query(1), query([moved])],
    });

    const result = await columnService.reorderColumn('column-1', 'user-1', {
      newPosition: 1,
    });

    expect(result).toEqual(moved);
    expect(lockedColumns.forUpdate).toHaveBeenCalled();
  });

  it('moves a column left and increments the positions in between', async () => {
    const current = {
      id: 'column-2',
      workspace_id: 'workspace-1',
      title: 'In Progress',
      position: 2,
    };
    const lockedColumns = query([
      { id: 'column-1', position: 0 },
      { id: 'column-2', position: 2 },
    ]);
    const moved = { ...current, position: 0 };
    mockDb.transaction = transactionWith({
      columns: [query(current), lockedColumns, query(1), query([moved])],
    });

    const result = await columnService.reorderColumn('column-2', 'user-1', {
      newPosition: 0,
    });

    expect(result).toEqual(moved);
  });

  it('returns the column unchanged when the target position is the same', async () => {
    const current = {
      id: 'column-1',
      workspace_id: 'workspace-1',
      title: 'Todo',
      position: 0,
    };
    mockDb.transaction = transactionWith({
      columns: [query(current), query([current])],
    });

    const result = await columnService.reorderColumn('column-1', 'user-1', {
      newPosition: 0,
    });

    expect(result).toEqual(current);
  });

  it('throws AppError 404 when reordering a column with no membership', async () => {
    mockDb.transaction = transactionWith({
      columns: [query(undefined)],
    });

    await expect(
      columnService.reorderColumn('missing', 'user-1', { newPosition: 0 }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('column access control', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('getColumnsForWorkspace returns the columns when the user is a member', async () => {
    const columns = [
      {
        id: 'column-1',
        workspace_id: 'workspace-1',
        title: 'Todo',
        position: 0,
      },
    ];
    mockDb
      .mockReturnValueOnce(query({ role: 'member' }))
      .mockReturnValueOnce(query(columns));

    const result = await columnService.getColumnsForWorkspace(
      'workspace-1',
      'user-1',
    );

    expect(result).toEqual(columns);
  });

  it('getColumnsForWorkspace throws AppError 403 when the user is not a member', async () => {
    mockDb.mockReturnValueOnce(query(undefined));

    await expect(
      columnService.getColumnsForWorkspace('workspace-1', 'outsider'),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('createColumn throws AppError 403 when the user is not a workspace member', async () => {
    mockDb.transaction = transactionWith({
      workspace_members: [query(undefined)],
    });

    await expect(
      columnService.createColumn('workspace-1', 'outsider', { title: 'Done' }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('updateColumn updates the title after resolving membership', async () => {
    const updated = {
      id: 'column-1',
      workspace_id: 'workspace-1',
      title: 'Renamed',
      position: 0,
    };
    mockDb
      .mockReturnValueOnce(
        query({ id: 'column-1', workspace_id: 'workspace-1' }),
      )
      .mockReturnValueOnce(query([updated]));

    const result = await columnService.updateColumn('column-1', 'user-1', {
      title: 'Renamed',
    });

    expect(result).toEqual(updated);
  });

  it('updateColumn throws AppError 404 when the column has no membership', async () => {
    mockDb.mockReturnValueOnce(query(undefined));

    await expect(
      columnService.updateColumn('missing', 'outsider', { title: 'Renamed' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('deleteColumn removes the column and closes the position gap', async () => {
    const column = {
      id: 'column-1',
      workspace_id: 'workspace-1',
      title: 'Todo',
      position: 1,
    };
    mockDb.mockReturnValueOnce(query(column));
    mockDb.transaction = transactionWith({
      columns: [query(undefined), query(undefined)],
    });

    await columnService.deleteColumn('column-1', 'user-1');

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });

  it('deleteColumn throws AppError 404 when the column has no membership', async () => {
    mockDb.mockReturnValueOnce(query(undefined));

    await expect(
      columnService.deleteColumn('missing', 'outsider'),
    ).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
