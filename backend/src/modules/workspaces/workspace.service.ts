// ============================================================
// CollabWave — Workspace Service
// ============================================================
// Contém toda a lógica de negócio do módulo de workspaces.
// É a única camada que interage directamente com a base de dados.
//
// RESPONSABILIDADES:
//   - Criar workspaces com invite code único
//   - Listar workspaces de um utilizador
//   - Buscar workspace por ID ou invite code
//   - Adicionar membros via invite code
//   - Listar membros de um workspace
//
// PADRÃO:
//   Cada função recebe dados já validados e devolve dados
//   ou lança AppError com código HTTP e mensagem descritiva.
//   O controller trata apenas de HTTP — não contém lógica.
// ============================================================

import crypto from 'crypto';
import db from '../../config/database';
import { AppError } from '../../middleware//errorHandler';
import type {
  Workspace,
  WorkspaceWithRole,
  WorkspaceMember,
  CreateWorkspacePayload,
} from './workspace.types';

// --------------------------------------------------------------
// generateInviteCode
// --------------------------------------------------------------
// Gera um código de convite único com 6 caracteres alfanuméricos
// em maiúsculas (ex: "A3FK9Z").
//
// PORQUÊ crypto.randomBytes() e não Math.random()?
//   Math.random() não é criptograficamente seguro — os valores
//   podem ser previsíveis. crypto.randomBytes() usa a fonte de
//   entropia do sistema operativo, produzindo valores imprevisíveis.
//
// COMO FUNCIONA:
//   1. crypto.randomBytes(4) gera 4 bytes aleatórios (32 bits)
//   2. .toString('hex') converte para string hexadecimal (8 chars)
//   3. .toUpperCase().slice(0, 6) pega os primeiros 6 caracteres
//
// Resultado: string de 6 chars do alfabeto [0-9A-F]
// Espaço de possibilidades: 16^6 = ~16 milhões de combinações

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
}

// --------------------------------------------------------------
// createWorkspace
// --------------------------------------------------------------
// Cria um novo workspace e adiciona o criador como 'owner'.
//
// OPERAÇÕES NA BD (dentro de uma transacção):
//   1. INSERT em workspaces
//   2. INSERT em workspace_members com role = 'owner'
//
// PORQUÊ uma transacção?
//   Se o INSERT em workspaces tiver sucesso mas o INSERT em
//   workspace_members falhar, ficávamos com um workspace sem
//   owner. A transacção garante que ou ambos têm sucesso ou
//   nenhum é persistido — atomicidade.

export async function createWorkspace(
  userId: string,
  payload: CreateWorkspacePayload,
): Promise<Workspace> {
  // Gerar invite code único
  const inviteCode = generateInviteCode();

  // db.transaction() inicia uma transacção.PostgreSQL.
  // O callback recebe 'trx', um objeto Knex com o mesmo API do db,
  // que envia todos os queries na mesma transacção.
  const workspace = await db.transaction(async (trx) => {
    // -----------------------------------------------------
    // 1. Inserir o workspace
    // -----------------------------------------------------
    // .returning('*') instrui o PostgreSQL a devolver o registo completo após INSERT.
    const [newWorkspace] = await trx('workspaces')
      .insert({
        name: payload.name,
        description: payload.description ?? null, // undefined -> null para a BD
        owner_id: userId,
        invite_code: inviteCode,
      })
      .returning('*'); // newWorkspace tem o formato da interface Workspace

    // -----------------------------------------------------
    // 2. Adicionar o criador como membro com role 'owner'
    // -----------------------------------------------------
    await trx('workspace_members').insert({
      workspace_id: newWorkspace.id,
      user_id: userId,
      role: 'owner',
    });

    return newWorkspace as Workspace;
  });

  return workspace;
}

// --------------------------------------------------------------
// getUserWorkspaces
// ---------------------------------------------------------------
// Devolve todos os workspaces onde o utilizador é membro, incluindo a sua role.
//
// QUERY:
//   SELECT workspaces.*, workspace_members.role
//   FROM workspaces
//   JOIN workspace_members ON workspaces.id = workspace_members.workspace_id
//   WHERE workspace_members.user_id = userId
//   ORDER BY workspaces.created_at DESC
export async function getUserWorkspaces(
  userId: string,
): Promise<WorkspaceWithRole[]> {
  const workspaces = await db('workspaces')
    // JOIN com wokspace_members para obter a role do utilizador
    .join(
      'workspace_members',
      'workspaces.id',
      'workspace_members.workspace_id',
    )
    // Seleccionar todas as colunas do workspace e a coluna role do membro
    .select('workspaces.*', 'workspace_members.role')
    .where('workspace_members.user_id', userId)
    .orderBy('workspaces.created_at', 'desc');

  return workspaces as WorkspaceWithRole[];
}

// --------------------------------------------------------------
// getWorkspaceById
// --------------------------------------------------------------
// Busca um workspace por ID.
// Lança AppError 404 se não existir.
export async function getWorkspaceById(
  workspaceId: string,
): Promise<Workspace> {
  const workspace = await db('workspaces').where({ id: workspaceId }).first(); // .first() devolve o primeiro registo ou undefined

  if (!workspace) {
    throw new AppError('Workspace not found.', 404);
  }

  return workspace as Workspace;
}

// --------------------------------------------------------------
// joinWorkspaceByInviteCode
// ---------------------------------------------------------------
// Adiciona um utilizador a um workspace usando o invite code.
//
// VALIDAÇÕES:
//  1. O invite code existe e corresponde a um workspace válido?
//  2. O utilizador já é membro desse workspace?

export async function joinWorkspaceByInviteCode(
  userId: string,
  inviteCode: string,
): Promise<Workspace> {
  // ------------------------------------------------
  // 1. Encontrar o workspace pelo invite code
  // ------------------------------------------------
  const workspace = await db('workspaces')
    .where({ invite_code: inviteCode })
    .first();

  if (!workspace) {
    // Código inválido -> não revelar se o código existe ou não
    throw new AppError('Invalid invite code.', 404);
  }

  // ------------------------------------------------
  // 2. Verificar se o utilizador já é membro
  // ------------------------------------------------
  const existingMembership = await db('workspace_members')
    .where({
      workspace_id: workspace.id,
      user_id: userId,
    })
    .first();

  if (existingMembership) {
    throw new AppError('You are already a member of this workspace.', 409);
  }

  // ------------------------------------------------
  // 3. Adicionar o utilizador como membro com role 'member'
  // ------------------------------------------------
  await db('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: userId,
    role: 'member',
  });

  return workspace as Workspace;
}

// --------------------------------------------------------------
// getWorkspaceMembers
// ---------------------------------------------------------------
// Devolve a lista de membros de um workspace, com os seus dados.
//
// QUERY:
//  SELECT users.id, users.name, users.email,
//         workspace_members.role, workspace_members.joined_at
//  FROM workspace_members
//  JOIN users ON workspace_members.user_id = users.id
//  WHERE workspace_members.workspace_id = workspaceId
//  ORDER BY workspace_members.joined_at ASC
export async function getWorkspaceMembers(
  workspaceId: string,
): Promise<WorkspaceMember[]> {
  const members = await db('workspace_members')
    .join('users', 'workspace_members.user_id', 'users.id')
    .select(
      'users.id as user_id', // Alias para evitar conflito de nomes
      'users.name',
      'users.email',
      'workspace_members.workspace_id',
      'workspace_members.role',
      'workspace_members.joined_at',
    )
    .where('workspace_members.workspace_id', workspaceId)
    .orderBy('workspace_members.joined_at', 'asc');

  return members as WorkspaceMember[];
}

// --------------------------------------------------------------
// checkMembership
// --------------------------------------------------------------
// Verifica se um utilizador é membro de um workspace.

export async function checkMembership(
  workspaceId: string,
  userId: string,
): Promise<{ role: string } | null> {
  const membership = await db('workspace_members')
    .where({
      workspace_id: workspaceId,
      user_id: userId,
    })
    .select('role')
    .first();

  // undefined -> null para consistência
  return membership ?? null;
}
