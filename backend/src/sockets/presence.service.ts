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

function buildPresenceMember(userId: string, socketId: string): string {
  return `${userId}:${socketId}`;
}

function getUserIdFromPresenceMember(member: string): string {
  return member.split(':')[0];
}

async function scanPresenceKeys(): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';

  do {
    const [nextCursor, batch] = await redisClient.scan(
      cursor,
      'MATCH',
      `${PRESENCE_PREFIX}*`,
      'COUNT',
      100,
    );
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== '0');

  return keys;
}

export async function addUserToPresence(
  workspaceId: string,
  userId: string,
  socketId: string,
): Promise<void> {
  const key = buildPresenceKey(workspaceId);

  // A presenca e guardada por socket para suportar varias tabs do mesmo user.
  await redisClient.sadd(key, buildPresenceMember(userId, socketId));

  // Renova o TTL para a chave nao ficar orfa apos um crash.
  await redisClient.expire(key, PRESENCE_TTL_SECONDS);
}

export async function removeUserFromPresence(
  workspaceId: string,
  userId: string,
  socketId: string,
): Promise<void> {
  const key = buildPresenceKey(workspaceId);

  await redisClient.srem(key, buildPresenceMember(userId, socketId));
}

export async function getOnlineUsers(
  workspaceId: string,
): Promise<Array<{ id: string; email: string; name: string }>> {
  const key = buildPresenceKey(workspaceId);

  const presenceMembers = await redisClient.smembers(key);
  const userIds = Array.from(
    new Set(presenceMembers.map(getUserIdFromPresenceMember)),
  );

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
  socketId: string,
): Promise<string[]> {
  const keys = await scanPresenceKeys();

  const affectedWorkspacesIds: string[] = [];
  const presenceMember = buildPresenceMember(userId, socketId);

  for (const key of keys) {
    const isMember = await redisClient.sismember(key, presenceMember);

    if (isMember) {
      await redisClient.srem(key, presenceMember);

      const workspaceId = key.replace(PRESENCE_PREFIX, '');
      affectedWorkspacesIds.push(workspaceId);
    }
  }

  return affectedWorkspacesIds;
}
