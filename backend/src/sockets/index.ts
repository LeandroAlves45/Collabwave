// Inicializa Socket.io com CORS, Redis Adapter, auth e handlers.

import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Server as HttpServer } from 'http';
import { pubClient, subClient } from '../config/redis';
import { env } from '../config/env';
import { socketAuthMiddleware } from './middleware/socketAuth';
import { registerWorkspaceHandler } from './handlers/workspace.handler';
import { registerTaskHandler } from './handlers/task.handler.js';
import type { CollabWaveSocket, CollabWaveServer } from './sockets.types';

// Instancia partilhada apos initSocketServer.
let io: CollabWaveServer;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },

    // WebSocket e preferido; polling fica como fallback para redes restritivas.
    transports: ['websocket', 'polling'],

    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Redis Adapter replica eventos de rooms entre instancias do servidor.
  io.adapter(createAdapter(pubClient, subClient));
  console.log('[SOCKET.IO] Redis Adapter configured.');

  // Autenticacao corre antes de qualquer handler de eventos.
  io.use(socketAuthMiddleware);
  console.log('[SOCKET.IO] Authentication middleware registered.');

  io.on('connection', (socket: CollabWaveSocket) => {
    const user = socket.data.user;
    console.log(`[SOCKET:IO] Connected: ${user.email} (socket: ${socket.id})`);

    registerWorkspaceHandler(io, socket);
    registerTaskHandler(io, socket);
  });

  return io;
}

// Acesso seguro a instancia ja inicializada.
export function getIO(): CollabWaveServer {
  if (!io) {
    throw new Error(
      '[SOCKET:IO] Socket.io server not initialized. Call initSocketServer first.',
    );
  }
  return io;
}
