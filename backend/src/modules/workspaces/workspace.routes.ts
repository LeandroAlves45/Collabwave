// ============================================================
// CollabWave — Workspace Routes
// ============================================================
// Define as rotas do módulo de workspaces e os middlewares
// aplicados em cada uma.
//
// MIDDLEWARES POR ROTA:
//   authenticate     — verifica JWT e preenche req.user
//                      aplicado em TODAS as rotas deste módulo
//   requireMembership — verifica que req.user é membro do workspace
//                       aplicado em rotas com :id param
//
// ORDEM DAS ROTAS (importante):
//   O Express faz matching por ordem de registo.
//   POST /join deve estar ANTES de GET /:id para que a string
//   "join" não seja interpretada como um parâmetro :id.
// ============================================================

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { checkMembership } from './workspace.service';
import { AppError } from '../../middleware/errorHandler';
import * as workspaceController from './workspace.controller';

// Router do Express -> Montado em app.ts com o prefixo /api/workspaces
const router = Router();

// ================================================================
// Require Membership Middleware
// ================================================================
// Middleware que verifica se o utilizador autenticado é membro
// do workspace identificado por req.params.id.
//
// FLUXO:
//   1. Extrair workspaceId de req.params.id
//   2. Extrair userId de req.user (preenchido pelo authenticate)
//   3. Consultar workspace_members na BD via checkMembership()
//   4a. É membro → next() (continua para o controller)
//   4b. Não é membro → AppError 403 Forbidden
//
// PORQUÊ 403 e não 404?
//   Revelar que o workspace existe mas o utilizador não tem
//   acesso é a resposta correcta aqui. Um 404 seria usado se
//   quiséssemos esconder a existência do recurso — uma decisão
//   de segurança válida mas desnecessária para este MVP.
async function requireMembership(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // workspaceId vem de req.params.id (definido na rota como /:id/...)
    const workspaceId = req.params.id as string;

    // userId vem de req.user, que é preenchido pelo middleware authenticate
    const userId = req.user!.id;

    // Consultar a BD para verificar membership
    const membership = await checkMembership(workspaceId, userId);

    if (!membership) {
      // Utilizador autenticado mas não é membro do workspace → 403 Forbidden
      throw new AppError('You do not have access to this workspace.', 403);
    }

    // É membro → continua para o controller
    next();
  } catch (error) {
    // Encaminhar o erro para o errorHandler global
    next(error);
  }
}

// ================================================================
// Registo das rotas
// ================================================================

// -----------------------------------------------
// GET /api/workspaces
// ------------------------------------------------
// Lista todos os workspaces onde o utilizador autenticado é membro.
// Não requer requireMembership porque não tem :id param — é uma rota de listagem geral.
router.get(
  '/',
  authenticate, // Verificar o JWT
  workspaceController.getUserWorkspaces, // Handler do controller
);

// -----------------------------------------------
// POST /api/workspaces
// ------------------------------------------------
// Cria um novo workspace e adiciona o criador como 'owner'.
router.post(
  '/',
  authenticate, // Verificar o JWT
  workspaceController.createWorkspace, // Handler do controller
);

// -----------------------------------------------
// POST /api/workspaces/join
// ------------------------------------------------
// Permite a um utilizador juntar-se a um workspace usando um invite code.
router.post(
  '/join',
  authenticate, // Verificar o JWT
  workspaceController.joinWorkspace, // Handler do controller
);

// -----------------------------------------------
// GET /api/workspaces/:id
// ------------------------------------------------
// Devolve os detalhes de um workspace específico por ID.
// Requer requireMembership para garantir que o utilizador é membro deste workspace.
router.get(
  '/:id',
  authenticate, // Verificar o JWT
  requireMembership, // Verificar que é membro do workspace :id
  workspaceController.getWorkspaceById, // Handler do controller
);

// ------------------------------------------------
// GET /api/workspaces/:id/members
// ------------------------------------------------
// Lista os membros de um workspace.
router.get(
  '/:id/members',
  authenticate, // Verificar o JWT
  requireMembership, // Verificar que é membro do workspace :id
  workspaceController.getWorkspaceMembers, // Handler do controller
);

export default router;
