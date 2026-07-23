// Logica de workspaces: persistencia, memberships e invite codes.

import crypto from 'crypto';
import db from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import type {
  Workspace,
  WorkspaceWithRole,
  WorkspaceMember,
  CreateWorkspacePayload,
} from './workspace.types';

// Invite code hexadecimal curto; randomBytes evita codigos previsiveis.
function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
}

const DEFAULT_COLUMNS = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
const INVITE_CODE_ATTEMPTS = 5;

function isInviteCodeCollision(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const databaseError = error as { code?: string; constraint?: string };
  return (
    databaseError.code === '23505' &&
    databaseError.constraint === 'workspaces_invite_code_unique'
  );
}

export async function createWorkspace(
  userId: string,
  payload: CreateWorkspacePayload,
): Promise<Workspace> {
  for (let attempt = 1; attempt <= INVITE_CODE_ATTEMPTS; attempt += 1) {
    try {
      return await db.transaction(async (trx) => {
        const [newWorkspace] = await trx('workspaces')
          .insert({
            name: payload.name,
            description: payload.description ?? null,
            owner_id: userId,
            invite_code: generateInviteCode(),
          })
          .returning('*');

        await trx('workspace_members').insert({
          workspace_id: newWorkspace.id,
          user_id: userId,
          role: 'owner',
        });
        await trx('columns').insert(
          DEFAULT_COLUMNS.map((title, position) => ({
            workspace_id: newWorkspace.id,
            title,
            position,
          })),
        );
        return newWorkspace as Workspace;
      });
    } catch (error) {
      if (!isInviteCodeCollision(error) || attempt === INVITE_CODE_ATTEMPTS) {
        throw error;
      }
    }
  }

  // O ciclo termina sempre por return ou throw; mantém a função total para TS.
  throw new Error('Unable to allocate a unique invite code');
}

export async function getUserWorkspaces(
  userId: string,
): Promise<WorkspaceWithRole[]> {
  const workspaces = await db('workspaces')
    .join(
      'workspace_members',
      'workspaces.id',
      'workspace_members.workspace_id',
    )
    .select('workspaces.*', 'workspace_members.role')
    .where('workspace_members.user_id', userId)
    .orderBy('workspaces.created_at', 'desc');

  return workspaces as WorkspaceWithRole[];
}

export async function getWorkspaceById(
  workspaceId: string,
): Promise<Workspace> {
  const workspace = await db('workspaces').where({ id: workspaceId }).first();

  if (!workspace) {
    throw new AppError('Workspace not found.', 404);
  }

  return workspace as Workspace;
}

export async function joinWorkspaceByInviteCode(
  userId: string,
  inviteCode: string,
): Promise<Workspace> {
  const workspace = await db('workspaces')
    .where({ invite_code: inviteCode })
    .first();

  if (!workspace) {
    throw new AppError('Invalid invite code.', 404);
  }

  const existingMembership = await db('workspace_members')
    .where({
      workspace_id: workspace.id,
      user_id: userId,
    })
    .first();

  if (existingMembership) {
    throw new AppError('You are already a member of this workspace.', 409);
  }

  await db('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: userId,
    role: 'member',
  });

  return workspace as Workspace;
}

export async function getWorkspaceMembers(
  workspaceId: string,
): Promise<WorkspaceMember[]> {
  const members = await db('workspace_members')
    .join('users', 'workspace_members.user_id', 'users.id')
    .select(
      'users.id as user_id',
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

  // Normaliza undefined para null para simplificar os callers.
  return membership ?? null;
}
