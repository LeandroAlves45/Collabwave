jest.mock('../../src/config/database.js', () => ({
  __esModule: true,
  default: {
    raw: jest.fn(),
    destroy: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockRedisClient = {
  status: 'wait',
  ping: jest.fn(),
  disconnect: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

jest.mock('../../src/config/redis.js', () => ({
  redisClient: mockRedisClient,
  pubClient: { ...mockRedisClient },
  subClient: { ...mockRedisClient },
}));

const mockCloseSocketServer = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/sockets', () => ({
  initSocketServer: jest.fn(),
  closeSocketServer: mockCloseSocketServer,
}));

import db from '../../src/config/database.js';
import { shutdown } from '../../src/server.js';

describe('graceful shutdown', () => {
  it('is idempotent and closes shared resources once', async () => {
    const first = shutdown('test');
    const second = shutdown('duplicate');

    expect(first).toBe(second);
    await first;
    expect(mockCloseSocketServer).toHaveBeenCalledTimes(1);
    expect(db.destroy).toHaveBeenCalledTimes(1);
  });
});
