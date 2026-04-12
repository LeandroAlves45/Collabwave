// ============================================================
// CollabWave — HTTP Server Entry Point
// ============================================================
// Este ficheiro inicia o servidor HTTP.
// É o ponto de entrada da aplicação quando corremos:
//   - "npm run dev" (desenvolvimento)
//   - "node dist/server.js" (produção)
//
// Separado do app.ts para permitir que os testes importem
// o Express app sem iniciar o servidor numa porta real.
// ============================================================
// ALTERAÇÃO IMPORTANTE::
// Em vez de chamar app.listen() (que cria um servidor HTTP
// implicitamente), criamos agora um http.Server explícito.
// Isto é necessário para o Socket.io, que precisa de aceder
// ao servidor HTTP directamente para interceptar os pedidos
// de "upgrade" de HTTP para WebSocket.
// ============================================================

import http from 'http';
import app from './app';
import { env } from './config/env';
import db from './config/database';
import { initSocketServer } from './sockets';

async function startServer(): Promise<void> {
  try {
    // Verificar a ligação à base de dados antes de iniciar o servidor
    //    knex.raw('SELECT 1') é a query mais simples para testar a ligação
    await db.raw('SELECT 1');
    console.log('[DATABASE] Database connection established successfully.');

    // 2. Criar o servidor HTTP explicitamente
    // ----------------------------------------------------------
    // http.createServer(app) cria um servidor HTTP que delega
    // todos os pedidos HTTP ao Express (app).

    const httpServer = http.createServer(app);

    // 3. Inicializar o Socket.io com o servidor HTTP
    // initSocketServer recebe o httpServer, configura o Socket.io
    // com Redis Adapter e regista todos os handlers de eventos
    initSocketServer(httpServer);
    console.log('[SOCKET.IO] Socket.io server initialized successfully.');

    // 4. Iniciar o servidor na porta configurada
    httpServer.listen(env.PORT, () => {
      console.log(`[SERVER] Server is running on port ${env.PORT}`);
      console.log(`[SERVER] Environment: ${env.NODE_ENV}`);
      console.log(`[SERVER] Health check: http://localhost:${env.PORT}/health`);
    });
  } catch (error) {
    // Se não for possível ligar à base de dados, logar o erro e sair do processo
    console.error('[SERVER] Failed to start server:', error);
    process.exit(1); // Sair com código de erro
  }
}

// Tratamento de erros não capturados e rejeições de promessas
process.on('uncaughtException', (error) => {
  console.error('[SERVER] Uncaught Exception:', error);
  process.exit(1); // Sair com código de erro
});

process.on('unhandledRejection', (reason) => {
  console.error('[SERVER] Unhandled Promise Rejection:', reason);
  process.exit(1); // Sair com código de erro
});

// Iniciar o servidor
startServer();
