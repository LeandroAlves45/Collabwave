// ============================================================
// CollabWave — Workspace Module Validators
// ============================================================
// Schemas Zod para validação dos request bodies do módulo
// de workspaces.
//
// PADRÃO USADO:
//   1. Definir o schema com z.object(...)
//   2. Inferir o tipo TypeScript com z.infer<typeof schema>
//      (evita duplicar a definição em workspace.types.ts)
//
// NOTA: Os payloads de entrada (CreateWorkspacePayload,
// JoinWorkspacePayload) são definidos em workspace.types.ts
// como interfaces. Os tipos inferidos aqui são equivalentes
// e usados directamente nos controllers para tipagem dos
// req.body validados.
// ============================================================

import { z } from 'zod';

// --------------------------------------------------------------
// createWorkspaceSchema
// --------------------------------------------------------------
// Valida o body de POST /api/workspaces
//
// Regras:
//  name   -> obrigatório, string, 2-100 caracteres
//  description -> opcional, string, até 500 caracteres

export const createWorkspaceSchema = z.object({
  name: z
    .string({ required_error: 'Workspace name is required.' })
    // .trim() remove espaços no início e no fim antes de validar
    .trim()
    .min(2, 'Workspace name must be at least 2 characters.')
    .max(100, 'Workspace name must not exceed 100 characters.'),

  description: z
    .string()
    .trim()
    .max(500, 'Description must not exceed 500 characters.')
    // .optional() torna o campo opcional, permitindo undefined
    .optional(),
});

// --------------------------------------------------------------
// joinWorkspaceSchema
// --------------------------------------------------------------
// Valida o body de POST /api/workspaces/join
//
// Regras:
//  inviteCode -> obrigatório, exatamente  6 caracteres alfanuméricos maiúsculos
export const joinWorkspaceSchema = z.object({
  inviteCode: z
    .string({ required_error: 'Invite code is required.' })
    .trim()
    // .length() valida comprimento exato
    .length(6, 'Invite code must be exactly 6 characters.')
    // .toUpperCase() normaliza o input
    .toUpperCase(),
});

// --------------------------------------------------------------
// Tipos inferidos dos schemas
// --------------------------------------------------------------
// z.infer<T> extrai o tipo TypeScript equivalente ao schema Zod.
// Usado para tipar os req.body validados nos controllers.

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
// Equivalente a: { name: string; description?: string }

export type JoinWorkspaceInput = z.infer<typeof joinWorkspaceSchema>;
// Equivalente a: { inviteCode: string }
