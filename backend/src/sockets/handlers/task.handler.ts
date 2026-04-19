// Eventos Socket.io de tasks. Persistem no service e fazem broadcast por room.

import * as taskService from '../../modules/tasks/task.service';
import type { CollabWaveServer, CollabWaveSocket } from '../sockets.types';

function buildRoomName(workspaceId: string): string {
  return `workspace:${workspaceId}`;
}

function toTaskResponse<T extends { workspace_id: string }>(task: T) {
  const { workspace_id: _workspaceId, ...taskResponse } = task;
  return taskResponse;
}

export function registerTaskHandler(
  io: CollabWaveServer,
  socket: CollabWaveSocket,
): void {
  const user = socket.data.user;

  socket.on('task:create', async (payload) => {
    if (!payload.workspaceId || typeof payload.workspaceId !== 'string') {
      socket.emit('error', {
        code: 'INVALID_PAYLOAD',
        message: 'workspaceId is required and must be a string.',
      });
      return;
    }

    if (!payload.columnId || typeof payload.columnId !== 'string') {
      socket.emit('error', {
        code: 'INVALID_PAYLOAD',
        message: 'columnId is required and must be a string.',
      });
      return;
    }

    if (
      !payload.title ||
      typeof payload.title !== 'string' ||
      payload.title.trim().length === 0
    ) {
      socket.emit('error', {  
        code: 'INVALID_PAYLOAD',
        message: 'title is required and must be a non-empty string.',
      });
      return;
    }

    try {
      const task = await taskService.createTask(payload.workspaceId, user.id, {
        columnId: payload.columnId,
        title: payload.title.trim(),
        description: payload.description,
        priority: payload.priority,
        dueDate: payload.dueDate,
      });

      const room = buildRoomName(payload.workspaceId);
      io.to(room).emit('task:created', { task: toTaskResponse(task) });

      console.log(`[TASK] task:created by ${user.email} - taskId: ${task.id}`);
    } catch (error) {
      const appError = error as { statusCode?: number; message?: string };
      if (appError.statusCode === 403 || appError.statusCode === 404) {
        socket.emit('error', {
          code: 'FORBIDDEN',
          message: appError.message ?? 'Access denied.',
        });
      } else {
        console.error('[TASK] Error in task:create -:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: 'An unexpected error occurred. Please try again later.',
        });
      }
    }
  });

  socket.on('task:update', async (payload) => {
    if (!payload.taskId || typeof payload.taskId !== 'string') {
      socket.emit('error', {
        code: 'INVALID_PAYLOAD',
        message: 'taskId is required and must be a string.',
      });
      return;
    }

    if (
      !payload.fields ||
      typeof payload.fields !== 'object' ||
      Array.isArray(payload.fields) ||
      Object.keys(payload.fields).length === 0
    ) {
      socket.emit('error', {
        code: 'INVALID_PAYLOAD',
        message: 'fields is required and must be a non-empty object.',
      });
      return;
    }

    try {
      const task = await taskService.updateTask(payload.taskId, user.id, {
        title: payload.fields.title ?? undefined,
        description: payload.fields.description ?? undefined,
        priority: payload.fields.priority ?? undefined,
        dueDate: payload.fields.due_date ?? undefined,
        assigneeId: payload.fields.assignee_id ?? undefined,
      });

      const room = buildRoomName(task.workspace_id);

      io.to(room).emit('task:updated', { task: toTaskResponse(task) });

      console.log(`[TASK] task:updated by ${user.email} - taskId: ${task.id}`);
    } catch (error) {
      const appError = error as { statusCode?: number; message?: string };
      if (appError.statusCode === 404 || appError.statusCode === 403) {
        socket.emit('error', {
          code: 'FORBIDDEN',
          message: appError.message ?? 'Access denied.',
        });
      } else {
        console.error('[TASK] Error in task:update -:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: 'An unexpected error occurred. Please try again later.',
        });
      }
    }
  });

  socket.on('task:move', async (payload) => {
    if (!payload.taskId || typeof payload.taskId !== 'string') {
      socket.emit('error', {
        code: 'INVALID_PAYLOAD',
        message: 'taskId is required and must be a string.',
      });
      return;
    }

    if (!payload.targetColumnId || typeof payload.targetColumnId !== 'string') {
      socket.emit('error', {
        code: 'INVALID_PAYLOAD',
        message: 'targetColumnId is required and must be a string.',
      });
      return;
    }

    if (
      payload.newPosition === undefined ||
      !Number.isInteger(payload.newPosition) ||
      payload.newPosition < 0
    ) {
      socket.emit('error', {
        code: 'INVALID_PAYLOAD',
        message: 'newPosition is required and must be a non-negative integer.',
      });
      return;
    }

    try {
      const task = await taskService.moveTask(payload.taskId, user.id, {
        targetColumnId: payload.targetColumnId,
        newPosition: payload.newPosition,
      });

      const room = buildRoomName(task.workspace_id);

      io.to(room).emit('task:moved', {
        taskId: task.id,
        targetColumnId: task.column_id,
        newPosition: task.position,
        movedBy: user.id,
      });

      console.log(`[TASK] task:moved by ${user.email} - taskId: ${task.id}`);
    } catch (error) {
      const appError = error as { statusCode?: number; message?: string };
      if (appError.statusCode === 404 || appError.statusCode === 403) {
        socket.emit('error', {
          code: 'FORBIDDEN',
          message: appError.message ?? 'Access denied.',
        });
      } else {
        console.error('[TASK] Error in task:move -:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: 'An unexpected error occurred. Please try again later.',
        });
      }
    }
  });

  socket.on('task:delete', async (payload) => {
    if (!payload.taskId || typeof payload.taskId !== 'string') {
      socket.emit('error', {
        code: 'INVALID_PAYLOAD',
        message: 'taskId is required and must be a string.',
      });
      return;
    }

    try {
      const deletedTask = await taskService.deleteTask(payload.taskId, user.id);

      const room = buildRoomName(deletedTask.workspaceId);
      io.to(room).emit('task:deleted', {
        taskId: deletedTask.taskId,
        deletedBy: user.id,
      });
      console.log(`[TASK] task:deleted by ${user.email} - taskId: ${deletedTask.taskId}`);
    } catch (error) {
      const appError = error as { statusCode?: number; message?: string };
      if (appError.statusCode === 404 || appError.statusCode === 403) {
        socket.emit('error', {
          code: 'FORBIDDEN',
          message: appError.message ?? 'Access denied.',
        });
      } else {
        console.error('[TASK] Error in task:delete -:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: 'An unexpected error occurred. Please try again later.',
        });
      }
    }
  });
}
