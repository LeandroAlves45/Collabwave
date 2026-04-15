// Entry point HTTP: cria o http.Server usado pelo Express e Socket.io.
// Mantem app.ts importavel em testes sem abrir porta real.

import http from 'http';
import app from './app';
import { env } from './config/env';
import db from './config/database';
import { initSocketServer } from './sockets';

async function startServer(): Promise<void> {
  try {
    // Falha cedo se a base de dados nao estiver disponivel.
    await db.raw('SELECT 1');
    console.log('[DATABASE] Database connection established successfully.');

    // Socket.io precisa do mesmo http.Server para gerir upgrades WebSocket.
    const httpServer = http.createServer(app);

    initSocketServer(httpServer);
    console.log('[SOCKET.IO] Socket.io server initialized successfully.');

    httpServer.listen(env.PORT, () => {
      console.log(`[SERVER] Server is running on port ${env.PORT}`);
      console.log(`[SERVER] Environment: ${env.NODE_ENV}`);
      console.log(`[SERVER] Health check: http://localhost:${env.PORT}/health`);
    });
  } catch (error) {
    console.error('[SERVER] Failed to start server:', error);
    process.exit(1);
  }
}

// Encerrar em erros globais evita manter o processo em estado desconhecido.
process.on('uncaughtException', (error) => {
  console.error('[SERVER] Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[SERVER] Unhandled Promise Rejection:', reason);
  process.exit(1);
});

startServer();
