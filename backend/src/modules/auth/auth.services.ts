// Logica de auth sem dependencias HTTP: registo, login, refresh e logout.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../../config/database';
import { redisClient } from '../../config/redis';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import type {
  User,
  SafeUser,
  RegisterPayload,
  LoginPayload,
  AuthResponse,
  JwtAccessPayload,
  JwtRefreshPayload,
} from './auth.types';

// Custo do bcrypt: mais alto aumenta seguranca e custo de CPU.
const BCRYPT_ROUNDS = 12;

const REFRESH_TOKEN_PREFIX = 'refresh_token:';

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

function generateAccessToken(
  userId: string,
  email: string,
  name: string,
): string {
  const payload: JwtAccessPayload = { sub: userId, email, name };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

function generateRefreshToken(userId: string): string {
  const jti = crypto.randomUUID(); // JWT ID usado para revogacao.

  const payload: JwtRefreshPayload = { sub: userId, jti };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

async function storeRefreshToken(jti: string, userId: string): Promise<void> {
  const key = `${REFRESH_TOKEN_PREFIX}${jti}`;

  // Expira automaticamente no Redis ao fim do TTL do refresh token.
  await redisClient.set(key, userId, 'EX', REFRESH_TOKEN_TTL_SECONDS);
}

async function deleteRefreshToken(jti: string): Promise<void> {
  const key = `${REFRESH_TOKEN_PREFIX}${jti}`;

  await redisClient.del(key);
}

function sanitizeUser(user: User): SafeUser {
  const { password_hash: _password_hash, ...safeUser } = user;
  return safeUser;
}

export async function register(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  const { name, email, password } = payload;

  const existingUser = await db('users').where({ email }).first();

  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const [user] = await db('users')
    .insert({ name, email, password_hash })
    .returning('*');

  const accessToken = generateAccessToken(user.id, user.email, user.name);
  const refreshToken = generateRefreshToken(user.id);

  const decodedRefresh = jwt.decode(refreshToken) as JwtRefreshPayload;
  await storeRefreshToken(decodedRefresh.jti, user.id);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { email, password } = payload;

  const user = await db('users').where({ email }).first();

  // Mesma mensagem para email/password evita enumeracao de contas.
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const accessToken = generateAccessToken(user.id, user.email, user.name);
  const refreshToken = generateRefreshToken(user.id);

  const decodedRefresh = jwt.decode(refreshToken) as JwtRefreshPayload;
  await storeRefreshToken(decodedRefresh.jti, user.id);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

// Valida o refresh token, invalida o antigo e emite um novo par.
export async function refresh(
  token: string,
): Promise<AuthResponse> {
  let decoded: JwtRefreshPayload;

  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtRefreshPayload;
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // A ausencia no Redis indica token expirado, revogado ou reutilizado.
  const key = `${REFRESH_TOKEN_PREFIX}${decoded.jti}`;
  const storedUserId = await redisClient.get(key);

  if (!storedUserId) {
    throw new AppError('Refresh token has been revoked', 401);
  }

  // Rotacao: invalida o token antigo antes de emitir o novo.
  await deleteRefreshToken(decoded.jti);

  const user = await db('users').where({ id: storedUserId }).first();

  if (!user) {
    throw new AppError('User not found', 401);
  }

  const accessToken = generateAccessToken(user.id, user.email, user.name);
  const newRefreshToken = generateRefreshToken(user.id);

  const newDecoded = jwt.decode(newRefreshToken) as JwtRefreshPayload;
  await storeRefreshToken(newDecoded.jti, user.id);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logout(token: string): Promise<void> {
  try {
    const decoded = jwt.verify(
      token,
      env.JWT_REFRESH_SECRET,
    ) as JwtRefreshPayload;

    await deleteRefreshToken(decoded.jti);
  } catch {
    // Logout e idempotente para o cliente.
  }
}
