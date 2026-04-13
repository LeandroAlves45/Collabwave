// ============================================================
// CollabWave — Socket.io Authentication Middleware
// ============================================================
// Este middleware corre durante o handshake WebSocket,
// ANTES da conexão ser aceite pelo servidor.
//
// FLUXO:
//   1. Cliente envia pedido de conexão com { auth: { token } }
//   2. Este middleware intercepta o pedido
//   3. Valida o JWT
//   4a. Token válido   → preenche socket.data.user e chama next()
//   4b. Token inválido → chama next(new Error(...)) e rejeita a conexão
//
// DIFERENÇA FACE AO MIDDLEWARE HTTP:
//   - Express middleware: corre em cada pedido HTTP
//   - Socket.io middleware: corre uma única vez no handshake
//     A sessão WebSocket persiste após autenticação.
// ============================================================

import type { ExtendedError } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import type { CollabWaveSocket, AuthenticatedUser } from '../sockets.types';

// -------------------------------------------
// Interface do payload do JWT de acesso
// --------------------------------------------
// Deve correponder ao payload criado em auth.service.ts
interface AccessTokenPayload {
  sub: string; // ID do utilizador (UUID)
  email: string; // Email do utilizador
  name: string; // Nome do utilizador
  jti: string; // JWT ID (único por token)
  iat: number; // Timestamp de emissão
  exp: number; // Timestamp de expiração
}

// -------------------------------------------
// socketAuthMiddleware
// --------------------------------------------
// Middleware de autenticação para Socket.io
// Assinatura: (socket, next) — igual ao middleware Express
// mas com ExtendedError em vez de Error para compatibilidade
// com o sistema de erros do Socket.io.

export function socketAuthMiddleware(
  socket: CollabWaveSocket,
  next: (err?: ExtendedError) => void,
): void {
  // -------------------------------------------
  // 1. Extrair o token JWT do handshake
  // --------------------------------------------
  const rawToken = socket.handshake.auth?.token as string | undefined;

  if (!rawToken) {
    // Sem token -> rejeitar conexão
    return next(
      createAuthError('NO_TOKEN', 'Authentication token is required'),
    );
  }

  // Remove o prefixo "Bearer " se estiver presente
  const token = rawToken.startsWith('Bearer ')
    ? rawToken.slice(7) // Remove "Bearer " (7 caracteres)
    : rawToken;

  // -------------------------------------------
  // 2. Validar e descodificar token JWT
  // --------------------------------------------
  // jwt.verify() lança exceção se o token for inválido for inválido
  // expirado , ou tiver sido alterado

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;

    // -------------------------------------------
    // 3. Preencher socket.data com os dados do utilizador autenticado
    // --------------------------------------------
    // socket.data é um objeto associado a este socket específico.
    // Persiste durante toda a vida da conexão Websocket.
    const user: AuthenticatedUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };

    socket.data.user = user;

    // -------------------------------------------
    // 4. Conexão autorizada -> continuar
    // -------------------------------------------
    console.log(
      `[SOCKET.IO] Authenticated user: ${user.email} (socket: ${socket.id})`,
    );
    next();
  } catch (error) {
    // -------------------------------------------
    // Token inválido -> rejeitar conexão
    // -------------------------------------------
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

// -------------------------------------------
// createAuthError -> Helper para criar erros de autenticação
// -------------------------------------------
// Cria um ExtendedError com um campo 'data' adicional para o código de erro específico.
function createAuthError(code: string, message: string): ExtendedError {
  const error = new Error(message) as ExtendedError;
  error.data = { code, message }; // Enviado ao cliente
  return error;
}
