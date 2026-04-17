import Redis from 'ioredis';
import { env } from './env';

// Opcoes partilhadas pelos clientes Redis. Usar o mesmo objeto evita que o
// cliente principal, publisher e subscriber tenham comportamentos diferentes.
const redisOptions = {
  // Mantem comandos pendentes enquanto o Redis estiver indisponivel. Isso e
  // importante para o Socket.io adapter, que trabalha com conexoes longas.
  maxRetriesPerRequest: null,

  // Em testes, evita ligar ao Redis real durante o import.
  lazyConnect: env.NODE_ENV === 'test',

  retryStrategy(times: number): number {
    // Reconnect progressivo: tenta rapido no inicio e limita a espera maxima
    // para a aplicacao conseguir recuperar sem criar loops agressivos.
    return Math.min(times * 50, 2000); // Backoff limitado a 2s.
  },
};

// Cliente principal usado pela aplicacao para operacoes diretas em Redis,
// como cache, presenca ou dados temporarios.
export const redisClient = new Redis(env.REDIS_URL, redisOptions);

// Clientes dedicados ao Redis Adapter do Socket.io. O adapter precisa de um
// canal para publicar eventos e outro para subscrever, por isso duplicamos.
export const pubClient = new Redis(env.REDIS_URL, redisOptions);
export const subClient = pubClient.duplicate();

// Logs simples de ciclo de vida ajudam a perceber rapidamente se o backend
// conseguiu conectar ao Redis e se esta tentando recuperar a conexao.
redisClient.on('connect', () => {
  console.log('[REDIS] Connected successfully');
});

redisClient.on('error', (error: Error) => {
  console.error('[REDIS] Connection error:', error.message);
});

redisClient.on('reconnecting', () => {
  console.warn('[REDIS] Reconnecting...');
});
