// Configura a app Express sem abrir porta.
// server.ts fica responsável pelo servidor HTTP e pelo Socket.io.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes.js';
import workspaceRoutes from './modules/workspaces/workspace.routes.js';
import taskRouter, {
  workspaceScopedTaskRoutes,
} from './modules/tasks/task.routes.js';
import columnRouter, {
  workspaceScopedColumnRoutes,
} from './modules/columns/column.routes.js';
import db from './config/database';
import { redisClient } from './config/redis';
import { AppError } from './middleware/errorHandler';

const app = express();

async function withHealthTimeout<T>(operation: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error('Dependency health check timed out')),
      env.HEALTHCHECK_TIMEOUT_MS,
    );
    timeout.unref();
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

if (env.NODE_ENV === 'production') {
  // Render termina TLS no proxy. Express precisa confiar num único proxy para
  // obter o IP real usado pelo rate limiter sem aceitar headers arbitrários.
  app.set('trust proxy', 1);
}

app.get('/health/live', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/ready', async (_req, res) => {
  try {
    await Promise.all([
      withHealthTimeout(db.raw('SELECT 1')),
      withHealthTimeout(redisClient.ping()),
    ]);
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
    });
  }
});

// Rate limit global para mitigar abuso basico por IP.
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests. Please try again later.',
  },
});

// Middleware global.
app.use(helmet());
app.use(limiter);

// CORS HTTP limitado a origem configurada.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.CORS_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new AppError('Origin is not allowed by CORS', 403));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Body parsers com limite pequeno para reduzir abuso por payloads grandes.
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// Rotas HTTP.
app.use('/api/auth', authRoutes);

// Rotas com sub-paths devem vir ANTES das rotas genéricas /:id
app.use('/api/workspaces', workspaceScopedTaskRoutes);
app.use('/api/workspaces', workspaceScopedColumnRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/tasks', taskRouter);
app.use('/api/columns', columnRouter);

// Deve ser o ultimo middleware para capturar erros das rotas anteriores.
app.use(errorHandler);

export default app;
