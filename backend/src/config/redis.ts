import Redis from 'ioredis';
import { env } from './env';

// OPÇÕES PARTILHADAS

const redisOptions = {
  // Configurações de conexão automática
  maxRetriesPerRequest: null,

  // Estratégia de reconexão
  retryStrategy(times: number): number {
    return Math.min(times * 50, 2000); // Exponencial backoff
  },
};

// CLIENTE PRINCIPAL
export const redisClient = new Redis(env.REDIS_URL, redisOptions);

// PUB CLIENTE - para o Socket.io Redis Adapter
export const pubClient = new Redis(env.REDIS_URL, redisOptions);

// SUB CLIENTE - para o Socket.io Redis Adapter
export const subClient = pubClient.duplicate();

// EVENT LISTENER - logging e monitoramento

redisClient.on('connect', () => {
  console.log('[REDIS] Connected successfully');
});

redisClient.on('error', (error: Error) => {
  console.error('[REDIS] Connection error:', error.message);
});

redisClient.on('reconnecting', () => {
  console.warn('[REDIS] Reconnecting...');
});
