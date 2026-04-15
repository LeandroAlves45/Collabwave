// Autenticacao Socket.io: valida o JWT no handshake e preenche socket.data.

import type { ExtendedError } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import type { CollabWaveSocket, AuthenticatedUser } from '../sockets.types';

// Deve corresponder ao payload criado em auth.service.ts.
interface AccessTokenPayload {
  sub: string; // ID do utilizador (UUID)
  email: string; // Email do utilizador
  name: string; // Nome do utilizador
  jti: string; // JWT ID (único por token)
  iat: number; // Timestamp de emissão
  exp: number; // Timestamp de expiração
}

export function socketAuthMiddleware(
  socket: CollabWaveSocket,
  next: (err?: ExtendedError) => void,
): void {
  const rawToken = socket.handshake.auth?.token as string | undefined;

  if (!rawToken) {
    return next(
      createAuthError('NO_TOKEN', 'Authentication token is required'),
    );
  }

  const token = rawToken.startsWith('Bearer ')
    ? rawToken.slice(7)
    : rawToken;

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;

    const user: AuthenticatedUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };

    socket.data.user = user;

    console.log(
      `[SOCKET.IO] Authenticated user: ${user.email} (socket: ${socket.id})`,
    );
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(
        createAuthError('TOKEN_EXPIRED', 'Authentication token has expired'),
      );
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return next(
        createAuthError('TOKEN_INVALID', 'Authentication token is invalid'),
      );
    }

    console.error('[SOCKET.IO] Unexpected auth error:', error);
    return next(createAuthError('AUTH_ERROR', 'Authentication failed.'));
  }
}

function createAuthError(code: string, message: string): ExtendedError {
  const error = new Error(message) as ExtendedError;
  error.data = { code, message };
  return error;
}
