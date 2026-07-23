import http, { type Server } from 'http';
import app from './app';
import { env } from './config/env';
import db from './config/database';
import { pubClient, redisClient, subClient } from './config/redis';
import { closeSocketServer, initSocketServer } from './sockets';

let httpServer: Server | undefined;
let shutdownPromise: Promise<void> | undefined;

export async function startServer(): Promise<Server> {
  await Promise.all([db.raw('SELECT 1'), redisClient.ping()]);

  httpServer = http.createServer(app);
  initSocketServer(httpServer);

  await new Promise<void>((resolve, reject) => {
    httpServer!.once('error', reject);
    httpServer!.listen(env.PORT, () => {
      httpServer!.off('error', reject);
      resolve();
    });
  });

  console.log(`[SERVER] Listening on port ${env.PORT} (${env.NODE_ENV})`);
  return httpServer;
}

async function closeRedisClients(): Promise<void> {
  await Promise.all(
    [redisClient, pubClient, subClient].map(async (client) => {
      if (client.status === 'end') return;
      if (client.status === 'wait') {
        client.disconnect();
        return;
      }
      await client.quit();
    }),
  );
}

export function shutdown(reason: string): Promise<void> {
  if (shutdownPromise) return shutdownPromise;

  shutdownPromise = (async () => {
    console.log(`[SERVER] Graceful shutdown started: ${reason}`);

    const closeHttp = httpServer
      ? new Promise<void>((resolve, reject) => {
          httpServer!.close((error) => (error ? reject(error) : resolve()));
        })
      : Promise.resolve();

    await closeSocketServer();
    await closeHttp;
    await db.destroy();
    await closeRedisClients();
    console.log('[SERVER] Graceful shutdown completed');
  })();

  return shutdownPromise;
}

async function shutdownAndExit(signal: string): Promise<void> {
  const timeout = new Promise<never>((_, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Graceful shutdown timed out')),
      env.SHUTDOWN_TIMEOUT_MS,
    );
    timer.unref();
  });

  try {
    await Promise.race([shutdown(signal), timeout]);
    process.exit(0);
  } catch (error) {
    console.error('[SERVER] Shutdown failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  process.once('SIGTERM', () => void shutdownAndExit('SIGTERM'));
  process.once('SIGINT', () => void shutdownAndExit('SIGINT'));

  startServer().catch((error) => {
    console.error('[SERVER] Failed to start:', error);
    void shutdownAndExit('startup failure');
  });
}
