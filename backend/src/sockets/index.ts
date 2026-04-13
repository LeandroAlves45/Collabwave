// ============================================================
// CollabWave — Socket.io Server Initialization
// ============================================================
// Este módulo inicializa o servidor Socket.io e configura
// o Redis Adapter para suporte a múltiplas instâncias.
//
// RESPONSABILIDADES DESTE FICHEIRO:
// 1. Criar a instância Server do Socket.io
// 2. Configurar CORS para WebSocket (separado do CORS HTTP)
// 3. Configurar o Redis Adapter (pub/sub entre instâncias)
// 4. Registar os middlewares de autenticação
// 5. Registar os handlers de eventos por domínio (ex: workspace.handler)
// ============================================================

import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Server as HttpServer } from 'http';
import { pubClient, subClient } from '../config/redis';
import { env } from '../config/env';
import { socketAuthMiddleware } from './middleware/socketAuth';
import { registerWorkspaceHandler } from './handlers/workspace.handler';
import type { CollabWaveSocket, CollabWaveServer } from './sockets.types';


// Variável de módulo que armazena a instância do Socket.io
// após inicialização. Acedida externamente via getIO().
let io: CollabWaveServer;

// initSocketServer 
// Função principal para inicializar o servidor Socket.io
export function initSocketServer(httpServer: HttpServer): Server {

    // 1. Criar a instância do Socket.io ligada ao servidor HTTP
    io = new Server(httpServer, {
        // Configurações de CORS para WebSocket
        cors: {
            origin: env.CORS_ORIGIN, // Permitir apenas a origem configurada
            methods: ['GET', 'POST'],
            credentials: true, // Permitir cookies para autenticação
        },

        // Configuração de transports
        // 'websocket' é o protocolo principal; 'polling' actua como fallback automático
        // para redes que bloqueiam WebSocket (proxies corporativos, etc.)
        transports: ['websocket', 'polling'],

        // Configurações de ping/pong para detecção de conexões ativas
        pingInterval: 10000, // Enviar ping a cada 20 segundos
        pingTimeout: 5000, // Considerar desconectado se não receber pong em 5 segundos
    });

    // 2. Configurar o Redis Adapter para suporte a múltiplas instâncias
    // O Redis Adapter substitui o in-memory adapter padrão.
    // Com ele, eventos emitidos para uma room são publicados
    // no Redis, permitindo que outras instâncias do servidor
    // os recebam e reencaminhem aos seus sockets locais.

    io.adapter(createAdapter(pubClient, subClient));
    console.log('[SOCKET.IO] Redis Adapter configured.');

    // ------------------------------------------
    // 3. Registar middleware de autenticação
    // ------------------------------------------
    // io.use() regista um middleware que corre para TODAS
    // as conexões antes de qualquer evento ser processado.
    // Se socketAuthMiddleware chamar next(error), a conexão
    // é rejeitada e o cliente recebe o evento 'connect_error'.

    io.use(socketAuthMiddleware);
    console.log('[SOCKET.IO] Authentication middleware registered.');

    // ------------------------------------------
    // 4. Handler principal de conexões
    // ------------------------------------------
    // Este handler é chamado para cada nova conexão WebSocket
    // bem-sucedida (após passar pelo middleware de autenticação).

    // ? Ajuste no middleware: 
    // ? CollabWaveSocket é o tipo específico do socket com dados tipados
    io.on('connection', (socket: CollabWaveSocket) => {
        const user = socket.data.user; // Sempre preenchido aqui(garantido pelo middleware)
        console.log(`[SOCKET:IO] Connected: ${user.email} (socket: ${socket.id})`);

        // ----------------------------------------------------------
        // Registar handler de workspace neste socket
        // ----------------------------------------------------------
        // registerWorkspaceHandler recebe io e socket e regista
        // internamente os listeners para:
        //   - workspace:join
        //   - workspace:leave
        //   - disconnect (cleanup de presença)
        registerWorkspaceHandler(io, socket);
    });

    return io;
}

// -------------------------------------------
// getIO - Acesso á instância do Socket.io fora deste módulo
// -------------------------------------------
// Função segura que verifica se o servidor foi inicializado
// antes de retornar a instância do Socket.io. Útil para handlers
export function getIO(): CollabWaveServer {
    if (!io) {
        throw new Error(
            '[SOCKET:IO] Socket.io server not initialized. Call initSocketServer first.'
        );
    }
    return io;
}