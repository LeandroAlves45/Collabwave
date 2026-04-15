// Middleware HTTP stateless: valida o Bearer token em cada pedido.
// Ao contrario do socketAuthMiddleware, nao ha sessao persistente.

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errorHandler';

// Deve corresponder ao payload criado em auth.service.ts.
interface AccessTokenPayload {
  sub: string; // UUID do utilizador
  email: string; // Email do utilizador
  name: string; // Nome do utilizador
  jti: string; // JWT ID único
  iat: number; // Timestamp de emissão
  exp: number; // Timestamp de expiração
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication token is required.', 401);
    }

    const token = authHeader.slice(7);

    // jwt.verify lanca se o token for invalido ou expirado.
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;

    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Authentication token has expired.', 401));
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid authentication token.', 401));
    }

    next(error);
  }
}
