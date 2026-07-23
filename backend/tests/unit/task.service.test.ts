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
    'delete',
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
      tasks: [
        query(task),
        query({ n: '0' }),
        query(1),
        query(1),
        query([moved]),
      ],
    });

    const result = await taskService.moveTask('task-1', 'user-1', {
      targetColumnId: 'column-2',
      newPosition: 0,
    });

    expect(result.column_id).toBe('column-2');
    expect(columnLocks.forUpdate).toHaveBeenCalled();
  });

  it('throws AppError 404 when the target column is not in the same workspace', async () => {
    const authorized = { ...task, workspace_id: 'workspace-1' };
    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(query(authorized))
      .mockReturnValueOnce(query(undefined));

    await expect(
      taskService.moveTask('task-1', 'user-1', {
        targetColumnId: 'other-workspace-column',
        newPosition: 0,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('decrements positions in between when moving down within the same column', async () => {
    const authorized = { ...task, workspace_id: 'workspace-1' };
    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(query(authorized))
      .mockReturnValueOnce(
        query({ id: 'column-1', workspace_id: 'workspace-1' }),
      );

    const columnLocks = query([{ id: 'column-1' }]);
    const movedDown = { ...task, position: 2 };
    mockDb.transaction = transactionWith({
      columns: [columnLocks],
      tasks: [query(task), query({ n: '3' }), query(1), query([movedDown])],
    });

    const result = await taskService.moveTask('task-1', 'user-1', {
      targetColumnId: 'column-1',
      newPosition: 2,
    });

    expect(result.position).toBe(2);
  });

  it('returns the task unchanged when moved to its current position', async () => {
    const authorized = { ...task, workspace_id: 'workspace-1' };
    (mockDb as unknown as jest.Mock)
      .mockReturnValueOnce(query(authorized))
      .mockReturnValueOnce(
        query({ id: 'column-1', workspace_id: 'workspace-1' }),
      );

    const columnLocks = query([{ id: 'column-1' }]);
    mockDb.transaction = transactionWith({
      columns: [columnLocks],
      tasks: [query(task), query({ n: '1' })],
    });

    const result = await taskService.moveTask('task-1', 'user-1', {
      targetColumnId: 'column-1',
      newPosition: 0,
    });

    expect(result.position).toBe(0);
  });
});

describe('task authorization', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('createTask throws AppError 404 when the column is not accessible', async () => {
    mockDb.transaction = transactionWith({
      columns: [query(undefined)],
    });

    await expect(
      taskService.createTask('workspace-1', 'outsider', {
        columnId: 'column-1',
        title: 'Task',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('createTask throws AppError 400 when the assignee is not a workspace member', async () => {
    mockDb.transaction = transactionWith({
      columns: [query({ id: 'column-1', workspace_id: 'workspace-1' })],
      workspace_members: [query(undefined)],
    });

    await expect(
      taskService.createTask('workspace-1', 'user-1', {
        columnId: 'column-1',
        title: 'Task',
        assigneeId: 'not-a-member',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('task reads and mutations', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('getWorkspaceTasks returns an empty board when the workspace has no columns', async () => {
    mockDb.mockReturnValueOnce(query([]));

    const result = await taskService.getWorkspaceTasks('workspace-1');

    expect(result).toEqual([]);
  });

  it('getWorkspaceTasks groups tasks under their column', async () => {
    const columns = [
      {
        id: 'column-1',
        workspace_id: 'workspace-1',
        title: 'Todo',
        position: 0,
      },
    ];
    const tasksRows = [{ ...task, creator_name: 'Ana', assignee_name: null }];
    mockDb
      .mockReturnValueOnce(query(columns))
      .mockReturnValueOnce(query(tasksRows));

    const result = await taskService.getWorkspaceTasks('workspace-1');

    expect(result).toHaveLength(1);
    expect(result[0].tasks).toHaveLength(1);
    expect(result[0].tasks[0].id).toBe('task-1');
  });

  it('updateTask throws AppError 404 when the task has no membership', async () => {
    mockDb.mockReturnValueOnce(query(undefined));

    await expect(
      taskService.updateTask('missing', 'outsider', { title: 'New title' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('updateTask throws AppError 400 when the new assignee is not a workspace member', async () => {
    const authorized = { ...task, workspace_id: 'workspace-1' };
    mockDb
      .mockReturnValueOnce(query(authorized))
      .mockReturnValueOnce(query(undefined));

    await expect(
      taskService.updateTask('task-1', 'user-1', {
        assigneeId: 'not-a-member',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('updateTask applies only the provided fields and returns the enriched task', async () => {
    const authorized = { ...task, workspace_id: 'workspace-1' };
    const enriched = {
      ...task,
      title: 'New title',
      workspace_id: 'workspace-1',
      creator_name: 'Ana',
      assignee_name: null,
    };
    mockDb
      .mockReturnValueOnce(query(authorized))
      .mockReturnValueOnce(query(undefined))
      .mockReturnValueOnce(query(enriched));

    const result = await taskService.updateTask('task-1', 'user-1', {
      title: 'New title',
    });

    expect(result.title).toBe('New title');
  });

  it('deleteTask throws AppError 404 when the task has no membership', async () => {
    mockDb.mockReturnValueOnce(query(undefined));

    await expect(
      taskService.deleteTask('missing', 'outsider'),
    ).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('deleteTask removes the task and closes the position gap', async () => {
    const authorized = { ...task, workspace_id: 'workspace-1' };
    mockDb.mockReturnValueOnce(query(authorized));
    mockDb.transaction = transactionWith({
      tasks: [query(undefined), query(undefined)],
    });

    const result = await taskService.deleteTask('task-1', 'user-1');

    expect(result).toEqual({ taskId: 'task-1', workspaceId: 'workspace-1' });
  });
});
