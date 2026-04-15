// Controllers HTTP de workspaces: validam input, chamam o service e respondem.

import type { Request, Response, NextFunction } from 'express';
import {
  createWorkspaceSchema,
  joinWorkspaceSchema,
} from './workspace.validators';
import * as workspaceService from './workspace.service';

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export const createWorkspace = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedBody = createWorkspaceSchema.parse(req.body);

    const userId = req.user!.id;

    const workspace = await workspaceService.createWorkspace(
      userId,
      validatedBody,
    );

    res.status(201).json({
      success: true,
      data: workspace,
    });
  },
);

export const getUserWorkspaces = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const workspaces = await workspaceService.getUserWorkspaces(userId);

    res.status(200).json({
      success: true,
      data: workspaces,
    });
  },
);

export const getWorkspaceById = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = req.params.id as string;

    const workspace = await workspaceService.getWorkspaceById(workspaceId);

    res.status(200).json({
      success: true,
      data: workspace,
    });
  },
);

export const joinWorkspace = asyncHandler(
  async (req: Request, res: Response) => {
    const { inviteCode } = joinWorkspaceSchema.parse(req.body);

    const userId = req.user!.id;

    const workspace = await workspaceService.joinWorkspaceByInviteCode(
      userId,
      inviteCode,
    );

    res.status(200).json({
      success: true,
      data: workspace,
    });
  },
);

export const getWorkspaceMembers = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = req.params.id as string;

    const members = await workspaceService.getWorkspaceMembers(workspaceId);

    res.status(200).json({
      success: true,
      data: members,
    });
  },
);
