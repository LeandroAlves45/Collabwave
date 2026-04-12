// ============================================================
// CollabWave — Auth Routes
// ============================================================
// Define as rotas do módulo de autenticação e aplica
// middleware específico (rate limiting nos endpoints sensíveis).
// ============================================================

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
} from './auth.controller';
import { env } from '../../config/env';

const router = Router();

// ----------------------------------------------
// Rate limiter - proteção contra brute-force
// ----------------------------------------------
// Aplicado especificamente aos endpoints de login e registo
const authRateLimiter = rateLimit({
  // Janela de tempo para contagem (ex: 15 minutos)
  windowMs: env.RATE_LIMIT_WINDOW_MS,

  // Máximo de pedidos por IP dentro da janela (ex: 100 pedidos)
  max: env.RATE_LIMIT_MAX_REQUESTS,

  // Mensagem de erro quando o limite é atingido
  message: {
    status: 'error',
    message: 'Too many requests. Please try again later.',
  },

  // Inclui headers standard de rate limiting na resposta
  standardHeaders: true,

  // Remove os headers legados X-RateLimit-* para evitar confusão
  legacyHeaders: false,
});

// -------------------------------------------------------------
// ROTAS
// -------------------------------------------------------------

// POST /api/auth/register - regista um novo utilizador
router.post('/register', authRateLimiter, registerController);

// POST /api/auth/login - autentica um utilizador
router.post('/login', authRateLimiter, loginController);

// POST /api/auth/refresh - renova tokens de acesso
router.post('/refresh', refreshController);

// POST /api/auth/logout - revoga o refresh token
router.post('/logout', logoutController);

export default router;
