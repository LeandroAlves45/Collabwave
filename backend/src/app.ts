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

const app = express();

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
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Body parsers com limite pequeno para reduzir abuso por payloads grandes.
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Rotas HTTP.
app.use('/api/auth', authRoutes);

app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces', workspaceScopedTaskRoutes);
app.use('/api/tasks', taskRouter);
app.use('/api/workspaces', workspaceScopedColumnRoutes);
app.use('/api/columns', columnRouter);

// Deve ser o ultimo middleware para capturar erros das rotas anteriores.
app.use(errorHandler);

export default app;
