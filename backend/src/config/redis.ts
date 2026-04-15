import Redis from 'ioredis';
import { env } from './env';

// Opcoes partilhadas pelos clientes Redis.

const redisOptions = {
  maxRetriesPerRequest: null,

  // Em testes, evita ligar ao Redis real durante o import.
  lazyConnect: env.NODE_ENV === 'test',

  retryStrategy(times: number): number {
    return Math.min(times * 50, 2000); // Backoff limitado a 2s.
  },
};

// Cliente principal usado pela aplicacao.
export const redisClient = new Redis(env.REDIS_URL, redisOptions);

// Clientes dedicados ao Redis Adapter do Socket.io.
export const pubClient = new Redis(env.REDIS_URL, redisOptions);
export const subClient = pubClient.duplicate();

redisClient.on('connect', () => {
  console.log('[REDIS] Connected successfully');
});

redisClient.on('error', (error: Error) => {
  console.error('[REDIS] Connection error:', error.message);
});

redisClient.on('reconnecting', () => {
  console.warn('[REDIS] Reconnecting...');
});
