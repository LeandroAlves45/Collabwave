// Logica de tasks. Autorizacao por task usa JOIN tasks -> columns -> members.

import db from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import type {
  Task,
  Column,
  ColumnWithTasks,
  CreateTaskPayload,
  DeletedTaskContext,
  UpdateTaskPayload,
  MoveTaskPayload,
  TaskWithWorkspace,
  TaskWithUsers,
  TaskWithUsersAndWorkspace,
} from './task.types.js';
import { getInitials } from '../../utils/user.js';

async function resolveTaskMembership(
  taskId: string,
  userId: string,
): Promise<Task & { workspace_id: string }> {
  const task = await db('tasks')
    .join('columns', 'tasks.column_id', 'columns.id')
    .join('workspace_members', function () {
      this.on(
        'workspace_members.workspace_id',
        '=',
        'columns.workspace_id',
      ).andOnVal('workspace_members.user_id', '=', userId);
    })
    .select('tasks.*', 'columns.workspace_id')
    .where('tasks.id', taskId)
    .first();

  if (!task) {
    throw new AppError('Task not found or access denied', 404);
  }

  return task as Task & { workspace_id: string };
}

interface TaskFromDb extends Task {
  creator_name: string;
  assignee_name: string | null;
}

function enrichTaskWithUsers(
  task: TaskFromDb,
  creatorName: string,
  assigneeName: string | null,
): TaskWithUsers {
  const result: TaskWithUsers = {
    ...(task as Task),
    createdBy: {
      id: task.created_by,
      name: creatorName,
      initials: getInitials(creatorName),
    },
  };

  if (assigneeName && task.assignee_id) {
    result.assignee = {
      id: task.assignee_id,
      name: assigneeName,
      initials: getInitials(assigneeName),
    };
  }

  return result;
}

async function getTaskWithUsers(
  taskId: string,
): Promise<TaskWithUsersAndWorkspace> {
  const task = await db('tasks')
    .join('columns', 'tasks.column_id', 'columns.id')
    .leftJoin('users as creator', 'tasks.created_by', 'creator.id')
    .leftJoin('users as assignee', 'tasks.assignee_id', 'assignee.id')
    .where('tasks.id', taskId)
    .select(
      'tasks.*',
      'columns.workspace_id',
      'creator.name as creator_name',
      'assignee.name as assignee_name',
    )
    .first();

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  return {
    ...enrichTaskWithUsers(
      task as TaskFromDb,
      task.creator_name || 'Unknown',
      task.assignee_name,
    ),
    workspace_id: task.workspace_id,
  };
}

// Monta o board com duas queries para evitar repetir dados das colunas.
export async function getWorkspaceTasks(
  workspaceId: string,
): Promise<ColumnWithTasks[]> {
  const columns = await db('columns')
    .where('workspace_id', workspaceId)
    .orderBy('position', 'asc')
    .select('*');

  if (columns.length === 0) {
    return [];
  }

  const columnIds = columns.map((c: Column) => c.id);

  const tasks = await db('tasks')
    .leftJoin('users as creator', 'tasks.created_by', 'creator.id')
    .leftJoin('users as assignee', 'tasks.assignee_id', 'assignee.id')
    .whereIn('column_id', columnIds)
    .orderBy('tasks.position', 'asc')
    .select(
      'tasks.*',
      'creator.name as creator_name',
      'assignee.name as assignee_name',
    );

  const taskByColumn = new Map<string, TaskWithUsers[]>();
  columns.forEach((c: Column) => taskByColumn.set(c.id, []));
  tasks.forEach((t: TaskFromDb) => {
    const enriched = enrichTaskWithUsers(
      t,
      t.creator_name || 'Unknown',
      t.assignee_name,
    );
    const colTasks = taskByColumn.get(t.column_id);
    if (colTasks) colTasks.push(enriched);
  });

  return columns.map((c: Column) => ({
    ...c,
    tasks: taskByColumn.get(c.id) ?? [],
  })) as ColumnWithTasks[];
}

async function validateAssignee(
  assigneeId: string | null | undefined,
  workspaceId: string,
): Promise<void> {
  if (!assigneeId) return;

  const isMember = await db('workspace_members')
    .where({ workspace_id: workspaceId, user_id: assigneeId })
    .first();

  if (!isMember) {
    throw new AppError('Assignee must be a member of the workspace', 400);
  }
}

// Cria no fim da coluna para evitar conflitos de posicao no cliente.
export async function createTask(
  workspaceId: string,
  userId: string,
  payload: CreateTaskPayload,
): Promise<TaskWithUsersAndWorkspace> {
  // Impede criar tasks em colunas fora do workspace ou sem membership.
  const column = await db('columns')
    .join('workspace_members', function () {
      this.on(
        'workspace_members.workspace_id',
        '=',
        'columns.workspace_id',
      ).andOnVal('workspace_members.user_id', '=', userId);
    })
    .where({
      'columns.id': payload.columnId,
      'columns.workspace_id': workspaceId,
    })
    .select('columns.*')
    .first();

  if (!column) {
    throw new AppError('Column not found or access denied', 404);
  }

  await validateAssignee(payload.assigneeId, workspaceId);

  const maxPositionResult = await db('tasks')
    .where({ column_id: payload.columnId })
    .max('position as maxPos')
    .first();

  const nextPosition =
    maxPositionResult?.maxPos !== null &&
    maxPositionResult?.maxPos !== undefined
      ? (maxPositionResult.maxPos as number) + 1
      : 0;

  const [newTask] = await db('tasks')
    .insert({
      column_id: payload.columnId,
      title: payload.title,
      description: payload.description ?? null,
      priority: payload.priority ?? 'medium',
      due_date: payload.dueDate ?? null,
      assignee_id: payload.assigneeId ?? null,
      created_by: userId,
      position: nextPosition,
    })
    .returning('*');

  return getTaskWithUsers((newTask as Task).id);
}

export async function updateTask(
  taskId: string,
  userId: string,
  payload: UpdateTaskPayload,
): Promise<TaskWithUsersAndWorkspace> {
  const task = await resolveTaskMembership(taskId, userId);

  if (payload.assigneeId !== undefined) {
    await validateAssignee(payload.assigneeId, task.workspace_id);
  }

  const updateData: Record<string, unknown> = {};

  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.description !== undefined)
    updateData.description = payload.description;
  if (payload.priority !== undefined) updateData.priority = payload.priority;
  if (payload.dueDate !== undefined) updateData.due_date = payload.dueDate;
  if (payload.assigneeId !== undefined)
    updateData.assignee_id = payload.assigneeId;

  updateData.updated_at = new Date().toISOString();

  await db('tasks')
    .where({ id: taskId })
    .update(updateData)
    .returning('*');

  return getTaskWithUsers(taskId);
}

// Move e reordena numa transacao para manter posicoes contiguas.
export async function moveTask(
  taskId: string,
  userId: string,
  payload: MoveTaskPayload,
): Promise<TaskWithWorkspace> {
  const task = await resolveTaskMembership(taskId, userId);
  const { workspace_id } = task;

  const targetColumn = await db('columns')
    .where({ id: payload.targetColumnId, workspace_id })
    .first();

  if (!targetColumn) {
    throw new AppError('Target column not found in the same workspace', 404);
  }

  // Na mesma coluna, a task atual nao conta para o limite.
  const targetCount = await db('tasks')
    .where('column_id', payload.targetColumnId)
    .count('id as n')
    .first()
    .then((r) => Number(r?.n ?? 0));

  const sameColumn = task.column_id === payload.targetColumnId;
  const maxPosition = sameColumn ? targetCount - 1 : targetCount;
  const clampedPosition = Math.max(
    0,
    Math.min(payload.newPosition, maxPosition),
  );

  if (sameColumn && task.position === clampedPosition) {
    return task as TaskWithWorkspace;
  }

  const updatedTask = await db.transaction(async (trx) => {
    if (sameColumn) {
      const oldPos = task.position;
      const newPos = clampedPosition;

      if (newPos > oldPos) {
        await trx('tasks')
          .where('column_id', task.column_id)
          .andWhere('position', '>', oldPos)
          .andWhere('position', '<=', newPos)
          .decrement('position', 1);
      } else {
        await trx('tasks')
          .where('column_id', task.column_id)
          .andWhere('position', '>=', newPos)
          .andWhere('position', '<', oldPos)
          .increment('position', 1);
      }
    } else {
      // Fecha o gap na origem e abre espaco no destino.
      await trx('tasks')
        .where('column_id', task.column_id)
        .andWhere('position', '>', task.position)
        .decrement('position', 1);

      await trx('tasks')
        .where('column_id', payload.targetColumnId)
        .andWhere('position', '>=', clampedPosition)
        .increment('position', 1);
    }

    const [result] = await trx('tasks')
      .where({ id: taskId })
      .update({
        column_id: payload.targetColumnId,
        position: clampedPosition,
        updated_at: new Date().toISOString(),
      })
      .returning('*');

    return result;
  });

  return {
    ...(updatedTask as Task),
    workspace_id,
  };
}

// Remove a task e fecha o gap de posicoes na coluna.
export async function deleteTask(
  taskId: string,
  userId: string,
): Promise<DeletedTaskContext> {
  const task = await resolveTaskMembership(taskId, userId);

  await db.transaction(async (trx) => {
    await trx('tasks').where({ id: taskId }).delete();

    await trx('tasks')
      .where('column_id', task.column_id)
      .andWhere('position', '>', task.position)
      .decrement('position', 1);
  });

  return {
    taskId: task.id,
    workspaceId: task.workspace_id,
  };
}
