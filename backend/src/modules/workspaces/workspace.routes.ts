// Rotas de workspaces. /join deve vir antes de /:id por ordem de matching.

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { checkMembership } from './workspace.service';
import { AppError } from '../../middleware/errorHandler';
import * as workspaceController from './workspace.controller';

const router = Router();

async function requireMembership(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const userId = req.user!.id;

    const membership = await checkMembership(workspaceId, userId);

    if (!membership) {
      throw new AppError('You do not have access to this workspace.', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
}

router.get(
  '/',
  authenticate,
  workspaceController.getUserWorkspaces,
);

router.post(
  '/',
  authenticate,
  workspaceController.createWorkspace,
);

router.post(
  '/join',
  authenticate,
  workspaceController.joinWorkspace,
);

router.get(
  '/:id',
  authenticate,
  requireMembership,
  workspaceController.getWorkspaceById,
);

router.get(
  '/:id/members',
  authenticate,
  requireMembership,
  workspaceController.getWorkspaceMembers,
);

export default router;
