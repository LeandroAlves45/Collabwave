// Rotas de auth com rate limiting nos endpoints sensiveis.

import { NextFunction, Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
} from './auth.controller';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

function validateCookieOrigin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const origin = req.get('origin');

  // Browsers always send Origin for the cross-origin requests that matter here.
  // Missing Origin remains accepted outside production for tests and CLI clients.
  if (
    (!origin && env.NODE_ENV === 'production') ||
    (origin && !env.CORS_ORIGINS.includes(origin))
  ) {
    next(new AppError('Request origin is not allowed', 403));
    return;
  }

  next();
}

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

router.post('/register', authRateLimiter, validateCookieOrigin, registerController);
router.post('/login', authRateLimiter, validateCookieOrigin, loginController);
router.post('/refresh', validateCookieOrigin, refreshController);
router.post('/logout', validateCookieOrigin, logoutController);

export default router;
