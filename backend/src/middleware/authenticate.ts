// ============================================================
// CollabWave — HTTP Authentication Middleware
// ============================================================
// Middleware Express que protege rotas HTTP autenticadas.
// Valida o JWT Bearer token no header Authorization e
// preenche req.user com os dados do utilizador autenticado.
//
// DIFERENÇA FACE AO socketAuthMiddleware:
//   - socketAuthMiddleware: corre uma vez no handshake WS
//     e a sessão persiste enquanto a conexão estiver aberta
//   - authenticate: corre em CADA pedido HTTP individualmente
//     porque HTTP é stateless — cada pedido é independente
//
// FLUXO:
//   1. Extrair token do header: Authorization: Bearer <token>
//   2. Verificar e descodificar o JWT
//   3a. Válido   → preenche req.user e chama next()
//   3b. Inválido → lança AppError 401
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errorHandler';

// --------------------------------------------------------------
// Interface do payload do JWT do acesso
// ----------------------------------------------------------------
// Deve corresponder ao payload criado em auth.service.ts quando o token é gerado.
interface AccessTokenPayload {
  sub: string; // UUID do utilizador
  email: string; // Email do utilizador
  name: string; // Nome do utilizador
  jti: string; // JWT ID único
  iat: number; // Timestamp de emissão
  exp: number; // Timestamp de expiração
}

// --------------------------------------------------------------
// authenticate Middleware
// ----------------------------------------------------------------
// Middleware que valida o JWT e preenche o req.user.
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    // ------------------------------------------------
    // 1. Extrair o token do header Authorization
    // ------------------------------------------------
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication token is required.', 401);
    }

    // Remover o prefixo \
    const token = authHeader.slice(7);

    // ------------------------------------------------
    // 2. Verificar e descodificar o JWT
    // ------------------------------------------------
    // jwt.verify lança um erro se o token for inválido ou expirado

    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;

    // ------------------------------------------------
    // 3. Preencher req.user com os dados do utilizador autenticado
    // ------------------------------------------------
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };

    // Token válido → continua para o próximo middleware ou controller
    next();
  } catch (error) {
    // Tratamento de erros JWT
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Authentication token has expired.', 401));
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid authentication token.', 401));
    }

    // Qualquer outro erro → encaminhar para o errorHandler global
    next(error);
  }
}
