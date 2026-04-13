// ============================================================
// CollabWave — Presence Service
// ============================================================
// Este serviço gere o estado de presença dos utilizadores
// em tempo real, utilizando Redis Sets.
//
// CONCEITO — Redis Set:
//   Um Set é uma colecção de strings únicas sem ordem definida.
//   Chave usada: "presence:{workspaceId}"
//   Valor:       conjunto de userIds actualmente online
//
// EXEMPLO no Redis:
//   presence:abc-123  →  { "user-1", "user-2", "user-5" }
//
// PORQUÊ Redis e não PostgreSQL?
//   Presença é efémera (desaparece ao desligar), de alta frequência
//   (muda a cada connect/disconnect), e precisa de ser partilhada
//   entre instâncias do servidor. Redis é ideal para este padrão.
// ============================================================

import { redisClient } from '../config/redis';
import db from '../config/database';

// -----------------------------------------------------------
// Constantes
// -----------------------------------------------------------

// TTL (Time To Live) para as chaves de presença no Redis
// Valor: 24 horas (86400 segundos) -> proteção contra entradas órfãs
const PRESENCE_TTL_SECONDS = 86400;

// Prefixo das chaves de presença no Redis
const PRESENCE_PREFIX = 'presence:';

// -----------------------------------------------------------
// buildPresenceKey
// ------------------------------------------------------------
// Helper privado que constrói a chave Redis para um workspace específico
function buildPresenceKey(workspaceId: string): string {
  return `${PRESENCE_PREFIX}${workspaceId}`;
}

// -----------------------------------------------------------
// addUserToPresence
// ------------------------------------------------------------
// Adiciona um utilizador ao Set de presença de um workspace
// SADD é idempotente: adicionar o mesmo userId várias vezes não causa duplicados
export async function addUserToPresence(
  workspaceId: string,
  userId: string,
): Promise<void> {
  const key = buildPresenceKey(workspaceId);

  // SADD: adiciona userId ao Set identificado por key
  await redisClient.sadd(key, userId);

  // EXPIRE: define o TTL da chave.
  // Chamado após cada SADD para renovar o tempo de vida
  // e garantir que a chave não fica orfã após um crash
  await redisClient.expire(key, PRESENCE_TTL_SECONDS);
}

// -----------------------------------------------------------
// removeUserFromPresence
// -----------------------------------------------------------
// Remove um utilizador do Set de presença de um workspace
export async function removeUserFromPresence(
  workspaceId: string,
  userId: string,
): Promise<void> {
  const key = buildPresenceKey(workspaceId);

  // SREM: remove userId do Set identificado por key
  await redisClient.srem(key, userId);
}

// -----------------------------------------------------------
// getOnlineUsers
// -----------------------------------------------------------
// Devolve a lista completa de utilizadores online num workspace,
// com os seus dados (id, email, name) para enviar ao cliente.
//
// FLUXO:
//   1. SMEMBERS → obtém array de userIds do Redis Set
//   2. Se Set vazio → devolve []
//   3. Query à BD → busca os dados dos utilizadores pelos IDs
//   4. Devolve array de { id, email, name }

export async function getOnlineUsers(
  workspaceId: string,
): Promise<Array<{ id: string; email: string; name: string }>> {
  const key = buildPresenceKey(workspaceId);

  // 1. SMEMBERS: obtém array de userIds do Redis Set
  const userIds = await redisClient.smembers(key);

  // 2. Se Set vazio → devolve []
  if (userIds.length === 0) {
    return [];
  }

  // 3. Query à BD → busca os dados dos utilizadores pelos IDs
  const users = await db('users')
    .select('id', 'email', 'name')
    .whereIn('id', userIds);

  // 4. Devolve array de { id, email, name }
  return users;
}

// -----------------------------------------------------------
// removeUserFromAllWorkspaces
// ------------------------------------------------------------
// Remove um utilizador de TODOS os Sets de presença onde esteja.
// Chamado no evento 'disconnect' do socket, quando o cliente
// se desliga sem ter feito workspace:leave explícito.
//
// FLUXO:
//   1. KEYS presence:* → encontra todas as chaves de presença
//   2. Para cada chave → SREM userId de cada Set

export async function removeUserFromAllWorkspaces(
  userId: string,
): Promise<string[]> {
  // 1. KEYS presence:* → encontra todas as chaves de presença
  const keys = await redisClient.keys(`${PRESENCE_PREFIX}*`);

  // 2. Lista de workspaceIds de onde o utilizador foi removido
  const affectedWorkspacesIds: string[] = [];

  for (const key of keys) {
    // SISMEMBER: verifica se userId está presente no Set
    const isMember = await redisClient.sismember(key, userId);

    if (isMember) {
      // SREM: remove userId do Set identificado por key
      await redisClient.srem(key, userId);

      // Extrai workspaceId da chave (removendo o prefixo)
      const workspaceId = key.replace(PRESENCE_PREFIX, '');
      affectedWorkspacesIds.push(workspaceId);
    }
  }

  return affectedWorkspacesIds;
}
