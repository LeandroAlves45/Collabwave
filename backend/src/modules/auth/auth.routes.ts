// Rotas de auth com rate limiting nos endpoints sensiveis.

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

const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    status: 'error',
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authRateLimiter, registerController);
router.post('/login', authRateLimiter, loginController);
router.post('/refresh', refreshController);
router.post('/logout', logoutController);

export default router;
