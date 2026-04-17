// Middleware HTTP stateless: valida o Bearer token em cada pedido protegido.
// Ao contrario de uma sessao persistente, cada request precisa trazer o token
// no header Authorization.

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errorHandler';

// Deve corresponder ao payload criado em auth.service.ts. O campo `sub` e o
// identificador padrao do JWT para "subject", aqui usado como id do utilizador.
interface AccessTokenPayload {
  sub: string; // UUID do utilizador
  email: string; // Email do utilizador
  name: string; // Nome do utilizador
  jti: string; // JWT ID unico
  iat: number; // Timestamp de emissao
  exp: number; // Timestamp de expiracao
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const authHeader = req.headers.authorization;

    // O formato esperado e: Authorization: Bearer <token>.
    // Sem esse prefixo, nao tentamos validar para evitar aceitar formatos
    // ambiguos ou acidentais.
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication token is required.', 401);
    }

    // Remove "Bearer " e fica apenas com o JWT.
    const token = authHeader.slice(7);

    // jwt.verify lanca se o token for invalido ou expirado.
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;

    // Depois da validacao, anexamos o utilizador a request. As rotas seguintes
    // podem acessar req.user sem precisar decodificar o token novamente.
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };

    next();
  } catch (error) {
    // Token expirado e token malformado sao tratados separadamente para o
    // frontend poder reagir melhor, por exemplo pedindo novo login.
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Authentication token has expired.', 401));
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid authentication token.', 401));
    }

    next(error);
  }
}
