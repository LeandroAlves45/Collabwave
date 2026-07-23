jest.mock('../../src/config/database.js');

import db from '../../src/config/database.js';
import * as taskService from '../../src/modules/tasks/task.service.js';

function query(value: unknown) {
  const builder: Record<string, jest.Mock> = {};
  for (const method of [
    'where',
    'andWhere',
    'whereIn',
    'join',
    'leftJoin',
    'select',
    'insert',
    'update',
    'orderBy',
    'max',
    'count',
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

const task = {
  id: 'task-1',
  column_id: 'column-1',
  title: 'Task',
  priority: 'medium' as const,
  position: 0,
  description: null,
  assignee_id: null,
  created_by: 'user-1',
  due_date: null,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('task concurrency', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('locks the destination column while allocating a task position', async () => {
    const columnLock = query({ id: 'column-1', workspace_id: 'workspace-1' });
    mockDb.transaction = transactionWith({
      columns: [columnLock],
      tasks: [query({ maxPos: null }), query([task])],
    });
    const enriched = {
      ...task,
      workspace_id: 'workspace-1',
      creator_name: 'Test User',
      assignee_name: null,
    };
    (mockDb as unknown as jest.Mock).mockReturnValueOnce(query(enriched));

    const result = await taskService.createTask('workspace-1', 'user-1', {
      columnId: 'column-1',
      title: 'Task',
    });

    expect(result.id).toBe('task-1');
    expect(columnLock.forUpdate).toHaveBeenCalled();
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });

  it('locks source and target columns before moving a task', async () => {
    const authorized = { ...task, workspace_id: 'workspace-1' };
    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(query(authorized))
      .mockReturnValueOnce(query({ id: 'column-2' }));

    const columnLocks = query([{ id: 'column-1' }, { id: 'column-2' }]);
    const moved = { ...task, column_id: 'column-2' };
    mockDb.transaction = transactionWith({
      columns: [columnLocks],
      tasks: [query(task), query({ n: '0' }), query(1), query(1), query([moved])],
    });

    const result = await taskService.moveTask('task-1', 'user-1', {
      targetColumnId: 'column-2',
      newPosition: 0,
    });

    expect(result.column_id).toBe('column-2');
    expect(columnLocks.forUpdate).toHaveBeenCalled();
  });
});
