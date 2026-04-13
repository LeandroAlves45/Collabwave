// ============================================================
// CollabWave — Workspace Controller
// ============================================================
// Handlers HTTP para os endpoints do módulo de workspaces.
//
// RESPONSABILIDADE ÚNICA:
//   1. Extrair dados do pedido (req.body, req.params, req.user)
//   2. Validar o body com Zod (quando aplicável)
//   3. Delegar ao service
//   4. Devolver a resposta HTTP correcta
//
// O controller NÃO contém lógica de negócio.
// O controller NÃO faz queries à base de dados directamente.
//
// TRATAMENTO DE ERROS:
//   Os erros lançados pelo service (AppError ou erros inesperados)
//   são apanhados pelo wrapper asyncHandler e encaminhados para
//   o errorHandler global registado em app.ts.
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import {
  createWorkspaceSchema,
  joinWorkspaceSchema,
} from './workspace.validators';
import * as workspaceService from './workspace.service';

// --------------------------------------------------------------
// asyncHandler
// --------------------------------------------------------------
// Wrapper que envolve handlers assíncronos para capturar erros.
//
// PORQUÊ é necessário?
//   No Express 4, se um handler async lançar um erro, o Express
//   não o apanha automaticamente — a promise rejeitada fica
//   silenciosa e o pedido fica suspenso sem resposta.
//
//   asyncHandler envolve o handler num try/catch e passa
//   qualquer erro para next(error), que activa o errorHandler
//   global registado em app.ts.
//
// NOTA: Express 5 (que usamos) faz isto automaticamente para
// handlers async. Mantemos o wrapper por clareza explícita
// e compatibilidade futura com testes.
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// ===============================================================
// createWorkspace
// ===============================================================
// POST /api/workspaces
// Cria um novo workspace e adiciona o criador como 'owner'.
export const createWorkspace = asyncHandler(
  async (req: Request, res: Response) => {
    // ------------------------------------------------
    // 1. Validar o body com Zod
    // ------------------------------------------------
    // .parse() valida o body e lança um erro se for inválido.
    const validatedBody = createWorkspaceSchema.parse(req.body);

    // ------------------------------------------------
    // 2. Extrair o userId do utilizador autenticado
    // ------------------------------------------------
    // req.user é definido pelo middleware de autenticação (authenticate).
    // O '!' diz ao TypeScript "confia em mim, req.user não é undefined aqui"
    const userId = req.user!.id;

    // ------------------------------------------------
    // 3. Delegar ao service
    // ------------------------------------------------
    const workspace = await workspaceService.createWorkspace(
      userId,
      validatedBody,
    );

    // ------------------------------------------------
    // 4. Devolver a resposta HTTP
    // ------------------------------------------------
    res.status(201).json({
      success: true,
      data: workspace,
    });
  },
);

// ================================================================
// getUserWorkspaces
// ================================================================
// GET /api/workspaces
// Lista todos os workspaces onde o utilizador é membro, incluindo a sua role.
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

// ================================================================
// getWorkspaceById
// ================================================================
// GET /api/workspaces/:id
// Devolve os detalhes de um workspace específico por ID.
//
// PRÉ-CONDIÇÃO: middleware requireMembership já validou
// que o utilizador é membro deste workspace.

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

// ================================================================
// joinWorkspace
// ================================================================
// POST /api/workspaces/join
// Permite a um utilizador juntar-se a um workspace usando um código de convite.

export const joinWorkspace = asyncHandler(
  async (req: Request, res: Response) => {
    // ------------------------------------------------
    // 1. Validar o body com Zod
    // ------------------------------------------------
    // joinWorkspaceSchema normaliza o inviteCode para maiúsculas.
    const { inviteCode } = joinWorkspaceSchema.parse(req.body);

    const userId = req.user!.id;

    // ------------------------------------------------
    // 2. Delegar ao service
    // ------------------------------------------------
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

// ================================================================
// getWorkspaceMembers
// ================================================================
// GET /api/workspaces/:id/members
// Lista os membros de um workspace específico.

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
