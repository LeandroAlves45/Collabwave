// Logica de colunas. Rotas por columnId validam membership via JOIN.

import db from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import {
  Column,
  CreateColumnPayload,
  UpdateColumnPayload,
  ReorderColumnPayload,
} from './column.types.js';

async function resolveColumnMembership(
  columnId: string,
  userId: string,
): Promise<Column> {
  const column = await db('columns')
    .join('workspace_members', function () {
      this.on(
        'workspace_members.workspace_id',
        '=',
        'columns.workspace_id',
      ).andOnVal('workspace_members.user_id', '=', userId);
    })
    .where('columns.id', columnId)
    .select('columns.*')
    .first();

  if (!column) {
    throw new AppError('Column not found or access denied.', 404);
  }

  return column as Column;
}

// Lista todas as colunas de um workspace para um utilizador membro.
export async function getColumnsForWorkspace(
  workspaceId: string,
  userId: string,
): Promise<Column[]> {
  const isMember = await db('workspace_members')
    .where({ workspace_id: workspaceId, user_id: userId })
    .first();

  if (!isMember) {
    throw new AppError('Access denied to this workspace.', 403);
  }

  const columns = await db('columns')
    .where({ workspace_id: workspaceId })
    .orderBy('position', 'asc')
    .select('*');

  return columns as Column[];
}

// Cria a coluna no fim do board.
export async function createColumn(
  workspaceId: string,
  userId: string,
  payload: CreateColumnPayload,
): Promise<Column> {
  const isMember = await db('workspace_members')
    .where({ workspace_id: workspaceId, user_id: userId })
    .first();

  if (!isMember) {
    throw new AppError('Access denied to this workspace.', 403);
  }

  const maxPositionResult = await db('columns')
    .where({ workspace_id: workspaceId })
    .max('position as maxPos')
    .first();

  const nextPosition = 
    maxPositionResult?.maxPos !== null &&
    maxPositionResult?.maxPos !== undefined
      ? (maxPositionResult.maxPos as number) + 1
      : 0; 

  const [newColumn] = await db('columns')
    .insert({
      workspace_id: workspaceId,
      title: payload.title,
      position: nextPosition,
    })
    .returning('*');

  return newColumn as Column;
}

export async function updateColumn(
  columnId: string,
  userId: string,
  payload: UpdateColumnPayload,
): Promise<Column> {
  await resolveColumnMembership(columnId, userId);

  const [updatedColumn] = await db('columns')
    .where({ id: columnId })
    .update({ title: payload.title })
    .returning('*');

  return updatedColumn as Column;
}

// Remove a coluna; as tasks caem por CASCADE e as posicoes fecham o gap.
export async function deleteColumn(
  columnId: string,
  userId: string,
): Promise<void> {
  const column = await resolveColumnMembership(columnId, userId);

  await db.transaction(async (trx) => {
    await trx('columns').where({ id: columnId }).delete();

    await trx('columns')
      .where('workspace_id', column.workspace_id)
      .andWhere('position', '>', column.position)
      .decrement('position', 1);
  });
}

// Move uma coluna e reordena as restantes dentro do mesmo workspace.
export async function reorderColumn(
  columnId: string,
  userId: string,
  payload: ReorderColumnPayload,
): Promise<Column> {
  const column = await resolveColumnMembership(columnId, userId);

  const totalColumns = await db('columns')
    .where('workspace_id', column.workspace_id)
    .count('id as n')
    .first()
    .then((r) => Number(r?.n ?? 0));

  // Clamp da posicao para o intervalo valido [0, totalColumns - 1]
  const clampedPosition = Math.max(
    0,
    Math.min(payload.newPosition, totalColumns - 1),
  );

  // Noop: coluna ja esta na posicao desejada
  if (column.position === clampedPosition) {
    return column;
  }

  const updatedColumn = await db.transaction(async (trx) => {
    const oldPos = column.position;
    const newPos = clampedPosition;

    if (newPos < oldPos) {
      // Mover para a esquerda: empurra as colunas intermedias para a direita
      await trx('columns')
        .where('workspace_id', column.workspace_id)
        .andWhere('position', '>=', newPos)
        .andWhere('position', '<', oldPos)
        .increment('position', 1);
    } else {
      // Mover para a direita: puxa as colunas intermedias para a esquerda
      await trx('columns')
        .where('workspace_id', column.workspace_id)
        .andWhere('position', '>', oldPos)
        .andWhere('position', '<=', newPos)
        .decrement('position', 1);
    }

    const [result] = await trx('columns')
      .where({ id: columnId })
      .update({ position: clampedPosition })
      .returning('*');

    return result;
  });

  return updatedColumn as Column;
}
