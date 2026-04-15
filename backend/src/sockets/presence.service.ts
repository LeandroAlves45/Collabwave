// Presenca em tempo real usando Redis Sets por workspace.
// Redis e adequado aqui porque o estado e efemero e partilhado entre instancias.

import { redisClient } from '../config/redis';
import db from '../config/database';

// TTL defensivo contra entradas orfas apos crashes.
const PRESENCE_TTL_SECONDS = 86400;

const PRESENCE_PREFIX = 'presence:';

function buildPresenceKey(workspaceId: string): string {
  return `${PRESENCE_PREFIX}${workspaceId}`;
}

export async function addUserToPresence(
  workspaceId: string,
  userId: string,
): Promise<void> {
  const key = buildPresenceKey(workspaceId);

  // SADD e idempotente: repetir o mesmo userId nao duplica presenca.
  await redisClient.sadd(key, userId);

  // Renova o TTL para a chave nao ficar orfa apos um crash.
  await redisClient.expire(key, PRESENCE_TTL_SECONDS);
}

export async function removeUserFromPresence(
  workspaceId: string,
  userId: string,
): Promise<void> {
  const key = buildPresenceKey(workspaceId);

  await redisClient.srem(key, userId);
}

export async function getOnlineUsers(
  workspaceId: string,
): Promise<Array<{ id: string; email: string; name: string }>> {
  const key = buildPresenceKey(workspaceId);

  const userIds = await redisClient.smembers(key);

  if (userIds.length === 0) {
    return [];
  }

  const users = await db('users')
    .select('id', 'email', 'name')
    .whereIn('id', userIds);

  return users;
}

// Cleanup de disconnect: remove o user de todos os workspaces onde estava.
export async function removeUserFromAllWorkspaces(
  userId: string,
): Promise<string[]> {
  const keys = await redisClient.keys(`${PRESENCE_PREFIX}*`);

  const affectedWorkspacesIds: string[] = [];

  for (const key of keys) {
    const isMember = await redisClient.sismember(key, userId);

    if (isMember) {
      await redisClient.srem(key, userId);

      const workspaceId = key.replace(PRESENCE_PREFIX, '');
      affectedWorkspacesIds.push(workspaceId);
    }
  }

  return affectedWorkspacesIds;
}
