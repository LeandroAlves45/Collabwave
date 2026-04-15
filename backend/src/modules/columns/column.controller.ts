// Controllers HTTP de colunas: validam input, chamam o service e respondem.

import type { Request, Response, NextFunction } from 'express';
import {
  createColumnSchema,
  updateColumnSchema,
  reorderColumnSchema,
} from './column.validators.js';
import * as columnService from './column.service.js';

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export const createColumn = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedBody = createColumnSchema.parse(req.body);
    const workspaceId = req.params.id as string;
    const userId = req.user!.id;

    const column = await columnService.createColumn(
      workspaceId,
      userId,
      validatedBody,
    );

    res.status(201).json({
      success: true,
      data: column,
    });
  },
);

export const updateColumn = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedBody = updateColumnSchema.parse(req.body);
    const columnId = req.params.columnId as string;
    const userId = req.user!.id;

    const column = await columnService.updateColumn(
      columnId,
      userId,
      validatedBody,
    );

    res.status(200).json({
      success: true,
      data: column,
    });
  },
);

export const deleteColumn = asyncHandler(
  async (req: Request, res: Response) => {
    const columnId = req.params.columnId as string;
    const userId = req.user!.id;

    await columnService.deleteColumn(columnId, userId);

    res.status(204).send();
  },
);

export const reorderColumn = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedBody = reorderColumnSchema.parse(req.body);
    const columnId = req.params.columnId as string;
    const userId = req.user!.id;

    const column = await columnService.reorderColumn(
      columnId,
      userId,
      validatedBody,
    );

    res.status(200).json({
      success: true,
      data: column,
    });
  },
);
