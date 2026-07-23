jest.mock('../../src/config/database.js');

jest.mock('../../src/config/redis.js', () => ({
  redisClient: {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  },
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../src/config/database.js';
import { redisClient } from '../../src/config/redis.js';
import * as authService from '../../src/modules/auth/auth.services.js';

function query(value: unknown) {
  const builder: Record<string, jest.Mock> = {};
  for (const method of ['where', 'insert']) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }
  builder.first = jest.fn().mockResolvedValue(value);
  builder.returning = jest.fn().mockResolvedValue(value);
  return builder;
}

const mockDb = db as unknown as jest.Mock;
const mockRedis = redisClient as unknown as {
  set: jest.Mock;
  get: jest.Mock;
  del: jest.Mock;
};

const dbUser = {
  id: 'user-1',
  name: 'Ana',
  email: 'ana@example.com',
  avatar_url: null,
  created_at: new Date('2026-01-01'),
};

describe('auth.services', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('register', () => {
    it('creates the user and returns a session when the email is free', async () => {
      mockDb
        .mockReturnValueOnce(query(undefined))
        .mockReturnValueOnce(query([{ ...dbUser, password_hash: 'hash' }]));
      mockRedis.set.mockResolvedValue('OK');

      const result = await authService.register({
        name: 'Ana',
        email: 'ana@example.com',
        password: 'Password123',
      });

      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.user.email).toBe('ana@example.com');
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^refresh_token:/),
        'user-1',
        'EX',
        expect.any(Number),
      );
    });

    it('throws AppError 409 when an account already exists for the email', async () => {
      mockDb.mockReturnValueOnce(query({ ...dbUser, password_hash: 'hash' }));

      await expect(
        authService.register({
          name: 'Ana',
          email: 'ana@example.com',
          password: 'Password123',
        }),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('throws AppError 401 when the user does not exist', async () => {
      mockDb.mockReturnValueOnce(query(undefined));

      await expect(
        authService.login({ email: 'ana@example.com', password: 'x' }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws AppError 401 when the password is wrong', async () => {
      const password_hash = await bcrypt.hash('correct-password', 4);
      mockDb.mockReturnValueOnce(query({ ...dbUser, password_hash }));

      await expect(
        authService.login({
          email: 'ana@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('returns a session when the credentials are valid', async () => {
      const password_hash = await bcrypt.hash('Password123', 4);
      mockDb.mockReturnValueOnce(query({ ...dbUser, password_hash }));
      mockRedis.set.mockResolvedValue('OK');

      const result = await authService.login({
        email: 'ana@example.com',
        password: 'Password123',
      });

      expect(result.user.email).toBe('ana@example.com');
      expect(result.accessToken).toEqual(expect.any(String));
    });
  });

  describe('refresh', () => {
    it('throws AppError 401 when the token signature is invalid', async () => {
      await expect(
        authService.refresh('not-a-valid-token'),
      ).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('throws AppError 401 when the token is not stored in Redis (revoked)', async () => {
      const token = jwt.sign(
        { sub: 'user-1', jti: 'jti-1' },
        process.env.JWT_REFRESH_SECRET as string,
        { expiresIn: '7d' },
      );
      mockRedis.get.mockResolvedValue(null);

      await expect(authService.refresh(token)).rejects.toMatchObject({
        statusCode: 401,
      });
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('throws AppError 401 when the token user no longer exists', async () => {
      const token = jwt.sign(
        { sub: 'user-1', jti: 'jti-1' },
        process.env.JWT_REFRESH_SECRET as string,
        { expiresIn: '7d' },
      );
      mockRedis.get.mockResolvedValue('user-1');
      mockRedis.del.mockResolvedValue(1);
      mockDb.mockReturnValueOnce(query(undefined));

      await expect(authService.refresh(token)).rejects.toMatchObject({
        statusCode: 401,
      });
      // O token antigo é sempre invalidado, mesmo que o utilizador já não exista.
      expect(mockRedis.del).toHaveBeenCalledWith('refresh_token:jti-1');
    });

    it('rotates the refresh token and returns a new session', async () => {
      const token = jwt.sign(
        { sub: 'user-1', jti: 'jti-1' },
        process.env.JWT_REFRESH_SECRET as string,
        { expiresIn: '7d' },
      );
      mockRedis.get.mockResolvedValue('user-1');
      mockRedis.del.mockResolvedValue(1);
      mockDb.mockReturnValueOnce(query(dbUser));
      mockRedis.set.mockResolvedValue('OK');

      const result = await authService.refresh(token);

      expect(result.refreshToken).not.toBe(token);
      expect(mockRedis.del).toHaveBeenCalledWith('refresh_token:jti-1');
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^refresh_token:/),
        'user-1',
        'EX',
        expect.any(Number),
      );
    });
  });

  describe('logout', () => {
    it('deletes the refresh token when the token is valid', async () => {
      const token = jwt.sign(
        { sub: 'user-1', jti: 'jti-1' },
        process.env.JWT_REFRESH_SECRET as string,
        { expiresIn: '7d' },
      );
      mockRedis.del.mockResolvedValue(1);

      await authService.logout(token);

      expect(mockRedis.del).toHaveBeenCalledWith('refresh_token:jti-1');
    });

    it('does not throw when the token is invalid (logout is idempotent)', async () => {
      await expect(
        authService.logout('garbage-token'),
      ).resolves.toBeUndefined();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });
});
