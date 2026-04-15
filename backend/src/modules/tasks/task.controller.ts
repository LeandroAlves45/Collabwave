// Controllers HTTP de tasks: validam input, chamam o service e respondem.

import type { Request, Response, NextFunction } from 'express';
import {
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
} from './task.validators.js';
import * as taskService from './task.service.js';

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export const getWorkspaceTasks = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = req.params.id as string;

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

    const workspaceId = req.params.id as string; 
    const userId = req.user!.id; // requireAuth middleware garante que req.user existe

    const newTask = await taskService.createTask(workspaceId, userId, validatedBody);

    res.status(201).json({
      success: true,
      data: newTask,
    });
  },
);

export const updateTask = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedBody = updateTaskSchema.parse(req.body);

    const taskId = req.params.taskId as string;
    const userId = req.user!.id; // requireAuth garante req.user

    const task = await taskService.updateTask(taskId, userId, validatedBody);
    const { workspace_id: _workspaceId, ...taskResponse } = task;

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
    const { workspace_id: _workspaceId, ...taskResponse } = task;

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

    await taskService.deleteTask(taskId, userId);

    res.status(204).send();
  },
);
