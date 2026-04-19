// Controllers HTTP de tasks: validam input, chamam o service e respondem.

import type { Request, Response, NextFunction } from 'express';
import {
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
} from './task.validators.js';
import * as taskService from './task.service.js';
import { getIO } from '../../sockets/index.js';

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function toTaskResponse<T extends { workspace_id: string }>(task: T) {
  const { workspace_id: _workspaceId, ...taskResponse } = task;
  return taskResponse;
}

export const getWorkspaceTasks = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = req.params.workspaceId as string;

    const colunmns = await taskService.getWorkspaceTasks(workspaceId);

    res.status(200).json({
      success: true,
      data: colunmns,
    });
  },
);

export const createTask = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedBody = createTaskSchema.parse(req.body);

    const workspaceId = req.params.workspaceId as string;
    const userId = req.user!.id; // requireAuth middleware garante que req.user existe

    const newTask = await taskService.createTask(workspaceId, userId, validatedBody);
    const taskResponse = toTaskResponse(newTask);

    // Emit Socket.io event para atualizar em tempo real
    try {
      const io = getIO();
      const room = `workspace:${workspaceId}`;
      io.to(room).emit('task:created', { task: taskResponse });
    } catch (error) {
      console.error('[TASK:CREATE] Failed to emit socket event:', error);
    }

    res.status(201).json({
      success: true,
      data: taskResponse,
    });
  },
);

export const updateTask = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedBody = updateTaskSchema.parse(req.body);

    const taskId = req.params.taskId as string;
    const userId = req.user!.id; // requireAuth garante req.user

    const task = await taskService.updateTask(taskId, userId, validatedBody);
    const taskResponse = toTaskResponse(task);

    // Emit Socket.io event para atualizar em tempo real
    try {
      const io = getIO();
      const room = `workspace:${task.workspace_id}`;
      io.to(room).emit('task:updated', { task: taskResponse });
    } catch (error) {
      console.error('[TASK:UPDATE] Failed to emit socket event:', error);
    }

    res.status(200).json({
      success: true,
      data: taskResponse,
    });
  },
);

export const moveTask = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedBody = moveTaskSchema.parse(req.body);

    const taskId = req.params.taskId as string;
    const userId = req.user!.id;

    const task = await taskService.moveTask(taskId, userId, validatedBody);
    const taskResponse = toTaskResponse(task);

    // Emit Socket.io event para atualizar em tempo real
    try {
      const io = getIO();
      const room = `workspace:${task.workspace_id}`;
      io.to(room).emit('task:moved', {
        taskId: task.id,
        targetColumnId: task.column_id,
        newPosition: task.position,
        movedBy: userId,
      });
    } catch (error) {
      console.error('[TASK:MOVE] Failed to emit socket event:', error);
    }

    res.status(200).json({
      success: true,
      data: taskResponse,
    });
  },
);

export const deleteTask = asyncHandler(
  async (req: Request, res: Response) => {
    const taskId = req.params.taskId as string;
    const userId = req.user!.id;

    const deletedTask = await taskService.deleteTask(taskId, userId);

    // Emit Socket.io event para atualizar em tempo real
    try {
      const io = getIO();
      const room = `workspace:${deletedTask.workspaceId}`;
      io.to(room).emit('task:deleted', { taskId: deletedTask.taskId, deletedBy: userId });
    } catch (error) {
      console.error('[TASK:DELETE] Failed to emit socket event:', error);
    }

    res.status(204).send();
  },
);
