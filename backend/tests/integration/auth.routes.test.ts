jest.mock('../../src/config/database.js', () => {
  const database = Object.assign(jest.fn(), {
    raw: jest.fn(),
    destroy: jest.fn(),
  });
  return { __esModule: true, default: database };
});

jest.mock('../../src/config/redis.js', () => {
  const client = {
    on: jest.fn(),
    ping: jest.fn(),
    status: 'wait',
    disconnect: jest.fn(),
    quit: jest.fn(),
  };
  return {
    redisClient: client,
    pubClient: { ...client },
    subClient: { ...client },
  };
});

jest.mock('../../src/modules/auth/auth.services.js', () => ({
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
}));

import request from 'supertest';
import app from '../../src/app.js';
import db from '../../src/config/database.js';
import { redisClient } from '../../src/config/redis.js';
import * as authService from '../../src/modules/auth/auth.services.js';

const session = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    avatar_url: null,
    created_at: new Date(),
  },
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};

describe('authentication cookie contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authService.login).mockResolvedValue(session);
    jest.mocked(authService.refresh).mockResolvedValue({
      ...session,
      refreshToken: 'rotated-refresh-token',
    });
    jest.mocked(authService.logout).mockResolvedValue();
  });

  it('sets refresh token as HttpOnly cookie and excludes it from JSON', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ email: 'test@example.com', password: 'Password123' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      user: expect.objectContaining({
        id: session.user.id,
        email: session.user.email,
      }),
      accessToken: 'access-token',
    });
    expect(response.body.data).not.toHaveProperty('refreshToken');
    expect(response.headers['set-cookie'][0]).toContain(
      'collabwave_refresh=refresh-token',
    );
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).toContain('SameSite=Lax');
    expect(response.headers['set-cookie'][0]).toContain('Path=/api/auth');
  });

  it('reads and rotates the refresh cookie', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', 'collabwave_refresh=refresh-token');

    expect(response.status).toBe(200);
    expect(authService.refresh).toHaveBeenCalledWith('refresh-token');
    expect(response.headers['set-cookie'][0]).toContain(
      'collabwave_refresh=rotated-refresh-token',
    );
  });

  it('rejects a cookie operation from an origin outside the allowlist', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Origin', 'https://evil.example')
      .set('Cookie', 'collabwave_refresh=refresh-token');

    expect(response.status).toBe(403);
    expect(authService.refresh).not.toHaveBeenCalled();
  });

  it('revokes the cookie session and clears the cookie on logout', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', 'collabwave_refresh=refresh-token');

    expect(response.status).toBe(204);
    expect(authService.logout).toHaveBeenCalledWith('refresh-token');
    expect(response.headers['set-cookie'][0]).toContain(
      'collabwave_refresh=;',
    );
  });
});

describe('health endpoints', () => {
  it('reports ready only when PostgreSQL and Redis respond', async () => {
    jest.mocked(db.raw).mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    jest.mocked(redisClient.ping).mockResolvedValueOnce('PONG');

    await request(app).get('/health/live').expect(200);
    await request(app).get('/health/ready').expect(200);
  });

  it('reports 503 when a readiness dependency fails', async () => {
    jest.mocked(db.raw).mockRejectedValueOnce(new Error('database unavailable'));
    jest.mocked(redisClient.ping).mockResolvedValueOnce('PONG');

    await request(app).get('/health/ready').expect(503);
  });
});
