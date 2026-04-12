// ============================================================
// CollabWave — Express Application Setup
// ============================================================
// Este ficheiro configura e exporta a aplicação Express.
//
// SEPARAÇÃO app.ts / server.ts:
// Separamos a configuração do Express (app.ts) do arranque
// do servidor HTTP (server.ts). Isto é fundamental para os
// testes de integração — o Supertest pode importar o app
// sem iniciar o servidor numa porta real.
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';

const app = express();

// -------------------------------------------------------------
// Middleware Global
// -------------------------------------------------------------

// Helmet - conjunto de headers HTTP para segurança
app.use(helmet());

// CORS - Configuração de Cross-Origin Resource Sharing
// Permite pedidos cross-origin apenas de origem especificada
app.use(
  cors({
    origin: env.CORS_ORIGIN, // Ex: 'http://localhost:3000'
    // Permite os métodos HTTP necessários para a API
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    // Permite os headers necessários para autenticação e outros
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Faz parte do corpo dos pedidos como JSON
// limit: "10kb" protege contra ataques de payloads grandes
app.use(express.json({ limit: '10kb' }));

// Faz parte de form data (application/x-www-form-urlencoded)
// extended: false usa querystring para parsing, adequado para dados simples
app.use(express.urlencoded({ extended: false }));

// -------------------------------------------------------------
// HEALTH CHECK
// -------------------------------------------------------------
// Rota simples para verificar se a API está operacional
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// ROTAS
// --------------------------------------------------------------
// Prefixo /api/auth para rotas de autenticação
app.use('/api/auth', authRoutes);

// -------------------------------------------------------------
// Middleware de tratamento de erros
// --------------------------------------------------------------
// Deve ser o último middleware adicionado, para capturar erros de rotas anteriores
app.use(errorHandler);

export default app;
