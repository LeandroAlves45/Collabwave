// Rotas de colunas divididas por prefixo: /api/workspaces e /api/columns.

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import * as columnController from './column.controller.js';

export const workspaceScopedColumnRoutes = Router({ mergeParams: true });

workspaceScopedColumnRoutes.post(
  '/:id/columns',
  authenticate,
  columnController.createColumn,
);

export const columnRouter = Router();

// /:columnId/reorder deve vir antes de /:columnId para nao capturar errado.
columnRouter.patch(
  '/:columnId/reorder',
  authenticate,
  columnController.reorderColumn,
);

columnRouter.patch('/:columnId', authenticate, columnController.updateColumn);

columnRouter.delete('/:columnId', authenticate, columnController.deleteColumn);

export default columnRouter;
