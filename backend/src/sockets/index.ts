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
let io: CollabWaveServer | undefined;

export function initSocketServer(httpServer: HttpServer): Server {
  const socketServer: CollabWaveServer = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS,
      methods: ['GET', 'POST'],
      credentials: true,
    },

    // WebSocket e preferido; polling fica como fallback para redes restritivas.
    transports: ['websocket', 'polling'],

    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Redis Adapter replica eventos de rooms entre instancias do servidor.
  socketServer.adapter(createAdapter(pubClient, subClient));
  console.log('[SOCKET.IO] Redis Adapter configured.');

  // Autenticacao corre antes de qualquer handler de eventos.
  socketServer.use(socketAuthMiddleware);
  console.log('[SOCKET.IO] Authentication middleware registered.');

  socketServer.on('connection', (socket: CollabWaveSocket) => {
    console.log(`[SOCKET.IO] Client connected: ${socket.id}`);

    registerWorkspaceHandler(socketServer, socket);
    registerTaskHandler(socketServer, socket);
  });

  io = socketServer;
  return socketServer;
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

export async function closeSocketServer(): Promise<void> {
  if (!io) return;

  const currentServer = io;
  io = undefined;
  await new Promise<void>((resolve) => currentServer.close(() => resolve()));
}
