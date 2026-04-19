// Rotas de tasks divididas por prefixo: /api/workspaces e /api/tasks.

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { checkMembership } from '../workspaces/workspace.service.js';
import { AppError } from '../../middleware/errorHandler.js';
import * as taskController from './task.controller.js';

async function requireMembership(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.user!.id;

    const membership = await checkMembership(workspaceId, userId);

    if (!membership) {
      throw new AppError('You do not have access to this workspace', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
}

export const workspaceScopedTaskRoutes = Router();

workspaceScopedTaskRoutes.get(
  '/:workspaceId/tasks',
  authenticate,
  requireMembership,
  taskController.getWorkspaceTasks,
);

workspaceScopedTaskRoutes.post(
  '/:workspaceId/tasks',
  authenticate,
  requireMembership,
  taskController.createTask,
);

workspaceScopedTaskRoutes.patch(
  '/:workspaceId/tasks/:taskId',
  authenticate,
  requireMembership,
  taskController.updateTask,
);

workspaceScopedTaskRoutes.patch(
  '/:workspaceId/tasks/:taskId/move',
  authenticate,
  requireMembership,
  taskController.moveTask,
);

workspaceScopedTaskRoutes.delete(
  '/:workspaceId/tasks/:taskId',
  authenticate,
  requireMembership,
  taskController.deleteTask,
);

const taskRouter = Router();

// /:taskId/move deve vir antes de /:taskId para nao capturar a rota errada.
taskRouter.patch(
  '/:taskId/move',
  authenticate,
  taskController.moveTask,
);

taskRouter.patch(
  '/:taskId',
  authenticate,
  taskController.updateTask,
);

taskRouter.delete(
  '/:taskId',
  authenticate,
  taskController.deleteTask,
);

export default taskRouter;
