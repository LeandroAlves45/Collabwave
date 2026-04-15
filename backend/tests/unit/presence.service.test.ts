// ============================================================
// CollabWave — Unit Tests: presence.service.ts
// ============================================================
// Testa o serviço de presença em isolamento.
// Redis e base de dados são mockados — sem conexões reais.
//
// COBERTURA DOS TESTESq:
//   addUserToPresence        → SADD + EXPIRE com chave correcta
//   removeUserFromPresence   → SREM com chave correcta
//   getOnlineUsers           → SMEMBERS + query BD; caso vazio
//   removeUserFromAllWorkspaces → KEYS + SISMEMBER + SREM; devolve ids afectados
// ============================================================

jest.mock('../../src/config/redis.js');
jest.mock('../../src/config/database.js');

import * as presenceService from '../../src/sockets/presence.service.js';
import { redisClient } from '../../src/config/redis.js';
import db from '../../src/config/database.js';

// Tipagem dos mocks
const mockRedis = redisClient as unknown as {
  sadd: jest.Mock;
  srem: jest.Mock;
  smembers: jest.Mock;
  expire: jest.Mock;
  keys: jest.Mock;
  sismember: jest.Mock;
};

const mockDb = db as unknown as jest.MockedFunction<typeof db>;

// Garante que todas as funções Redis são mocks após cada clearAllMocks
beforeEach(() => {
  jest.clearAllMocks();
  mockRedis.sadd = jest.fn().mockResolvedValue(1);
  mockRedis.srem = jest.fn().mockResolvedValue(1);
  mockRedis.smembers = jest.fn().mockResolvedValue([]);
  mockRedis.expire = jest.fn().mockResolvedValue(1);
  mockRedis.keys = jest.fn().mockResolvedValue([]);
  mockRedis.sismember = jest.fn().mockResolvedValue(0);
});

// ----------------------------------------------------------------
// SUITE: addUserToPresence
// ----------------------------------------------------------------
describe('addUserToPresence', () => {
  it('calls SADD with the correct presence key and userId', async () => {
    await presenceService.addUserToPresence('ws-1', 'user-1');

    expect(mockRedis.sadd).toHaveBeenCalledWith('presence:ws-1', 'user-1');
  });

  it('calls EXPIRE on the same key after SADD to renew TTL', async () => {
    await presenceService.addUserToPresence('ws-1', 'user-1');

    expect(mockRedis.expire).toHaveBeenCalledWith('presence:ws-1', 86400);
  });

  it('uses distinct keys for different workspaces', async () => {
    await presenceService.addUserToPresence('ws-A', 'user-1');
    await presenceService.addUserToPresence('ws-B', 'user-1');

    expect(mockRedis.sadd).toHaveBeenNthCalledWith(1, 'presence:ws-A', 'user-1');
    expect(mockRedis.sadd).toHaveBeenNthCalledWith(2, 'presence:ws-B', 'user-1');
  });
});

// ----------------------------------------------------------------
// SUITE: removeUserFromPresence
// ----------------------------------------------------------------
describe('removeUserFromPresence', () => {
  it('calls SREM with the correct presence key and userId', async () => {
    await presenceService.removeUserFromPresence('ws-1', 'user-1');

    expect(mockRedis.srem).toHaveBeenCalledWith('presence:ws-1', 'user-1');
  });

  it('does not call SADD or EXPIRE', async () => {
    await presenceService.removeUserFromPresence('ws-1', 'user-1');

    expect(mockRedis.sadd).not.toHaveBeenCalled();
    expect(mockRedis.expire).not.toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------
// SUITE: getOnlineUsers
// ----------------------------------------------------------------
describe('getOnlineUsers', () => {
  it('returns empty array when Redis Set is empty', async () => {
    mockRedis.smembers.mockResolvedValue([]);

    const result = await presenceService.getOnlineUsers('ws-1');

    expect(result).toEqual([]);
    // Confirmar que não vai à BD quando não há userIds
    expect(mockDb).not.toHaveBeenCalled();
  });

  it('queries the database with the userIds from Redis', async () => {
    mockRedis.smembers.mockResolvedValue(['user-1', 'user-2']);

    const users = [
      { id: 'user-1', email: 'a@test.com', name: 'Alice' },
      { id: 'user-2', email: 'b@test.com', name: 'Bob' },
    ];

    const qb = {
      select: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockResolvedValue(users),
    };
    (mockDb as unknown as jest.Mock).mockReturnValue(qb);

    const result = await presenceService.getOnlineUsers('ws-1');

    expect(qb.whereIn).toHaveBeenCalledWith('id', ['user-1', 'user-2']);
    expect(result).toHaveLength(2);
    expect(result[0].email).toBe('a@test.com');
  });

  it('calls SMEMBERS with the correct presence key', async () => {
    mockRedis.smembers.mockResolvedValue([]);

    await presenceService.getOnlineUsers('ws-xyz');

    expect(mockRedis.smembers).toHaveBeenCalledWith('presence:ws-xyz');
  });
});

// ----------------------------------------------------------------
// SUITE: removeUserFromAllWorkspaces
// ----------------------------------------------------------------
describe('removeUserFromAllWorkspaces', () => {
  it('returns empty array when there are no presence keys', async () => {
    mockRedis.keys.mockResolvedValue([]);

    const result = await presenceService.removeUserFromAllWorkspaces('user-1');

    expect(result).toEqual([]);
    expect(mockRedis.srem).not.toHaveBeenCalled();
  });

  it('scans using the correct key pattern', async () => {
    mockRedis.keys.mockResolvedValue([]);

    await presenceService.removeUserFromAllWorkspaces('user-1');

    expect(mockRedis.keys).toHaveBeenCalledWith('presence:*');
  });

  it('removes user only from workspaces where they are a member', async () => {
    mockRedis.keys.mockResolvedValue(['presence:ws-1', 'presence:ws-2']);
    // user-1 está em ws-1 mas não em ws-2
    mockRedis.sismember
      .mockResolvedValueOnce(1) // ws-1 → é membro
      .mockResolvedValueOnce(0); // ws-2 → não é membro

    const result = await presenceService.removeUserFromAllWorkspaces('user-1');

    expect(mockRedis.srem).toHaveBeenCalledTimes(1);
    expect(mockRedis.srem).toHaveBeenCalledWith('presence:ws-1', 'user-1');
    expect(result).toEqual(['ws-1']);
  });

  it('returns all affected workspaceIds where user was removed', async () => {
    mockRedis.keys.mockResolvedValue([
      'presence:ws-A',
      'presence:ws-B',
      'presence:ws-C',
    ]);
    // user está em ws-A e ws-C, mas não em ws-B
    mockRedis.sismember
      .mockResolvedValueOnce(1) // ws-A
      .mockResolvedValueOnce(0) // ws-B
      .mockResolvedValueOnce(1); // ws-C

    const result = await presenceService.removeUserFromAllWorkspaces('user-1');

    expect(result).toEqual(['ws-A', 'ws-C']);
    expect(mockRedis.srem).toHaveBeenCalledTimes(2);
  });

  it('returns always an array — never undefined', async () => {
    mockRedis.keys.mockResolvedValue([]);

    const result = await presenceService.removeUserFromAllWorkspaces('user-x');

    expect(Array.isArray(result)).toBe(true);
  });
});