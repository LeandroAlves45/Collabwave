// ============================================================
// CollabWave - Auth Service
// ============================================================
// Contém toda a lógica de negócio da autenticação:
//   - Registo de utilizadores
//   - Login com verificação de password
//   - Rotação de refresh tokens
//   - Logout com invalidação de token
//
// Esta camada não conhece HTTP — não acede a req/res.
// Isso facilita os testes unitários: testamos a lógica
// directamente sem precisar de simular pedidos HTTP.
// ============================================================

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

// -------------------------------------------------------------
// Constantes
// -------------------------------------------------------------

// Custo do bcrypt - determina quantas rondas de hashing serão feitas.
const BCRYPT_ROUNDS = 12;

// Prefixo das chaves Redis para refresh tokens
const REFRESH_TOKEN_PREFIX = 'refresh_token:';

// TTL do refresh token em segundos (ex: 7 dias = 604800 segundos)
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

// -------------------------------------------------------------
// Helpers privados
// -------------------------------------------------------------

// Gera um JWT de acesso de curta duração (ex: 15 minutos)
function generateAccessToken(userId: string, email: string): string {
  const payload: JwtAccessPayload = { sub: userId, email };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

// Gera um JWT de refresh de longa duração (ex: 7 dias)
function generateRefreshToken(userId: string): string {
  // crypto.randomUUID() gera um UUID v4, que é um identificador único aleatório
  const jti = crypto.randomUUID(); // JWT ID - usado para revogação

  const payload: JwtRefreshPayload = { sub: userId, jti };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

// Guarda o refresh token no Redis com TTL
async function storeRefreshToken(jti: string, userId: string): Promise<void> {
  const key = `${REFRESH_TOKEN_PREFIX}${jti}`;

  // SET key value EX ttl - armazena com expiração automática
  await redisClient.set(key, userId, 'EX', REFRESH_TOKEN_TTL_SECONDS);
}

// Remove o refresh token do Redis (usado no logout)
async function deleteRefreshToken(jti: string): Promise<void> {
  const key = `${REFRESH_TOKEN_PREFIX}${jti}`;

  // DEL key - remove a chave do Redis
  await redisClient.del(key);
}

// Remove dados sensíveis do objeto User antes de enviar na resposta
function sanitizeUser(user: User): SafeUser {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

// -------------------------------------------------------------
// Serviços públicos
// -------------------------------------------------------------

// -------------------------------------------------------------
// register - Regista um novo utilizador
// -------------------------------------------------------------
// Cria um novo utilizador e devolve tokens de autenticação
export async function register(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  const { name, email, password } = payload;

  // Verificar se o email já está registado
  const existingUser = await db('users').where({ email }).first();

  if (existingUser) {
    // 409 Conflict - email já existe
    throw new AppError('An account with this email already exists', 409);
  }

  // Hash da password com bcrypt
  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Inserir o novo utilizador na base de dados
  // .returning() devolve os campos especificados do utilizador criado
  const [user] = await db('users')
    .insert({ name, email, password_hash })
    .returning('*');

  // Gerar tokens de autenticação
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id);

  // Guardar o refresh token no Redis para controlo de sessão
  const decodedRefresh = jwt.decode(refreshToken) as JwtRefreshPayload;
  await storeRefreshToken(decodedRefresh.jti, user.id);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

// -------------------------------------------------------------
// login - Autentica um utilizador existente
// -------------------------------------------------------------
// Autentica um utilizador e devolve novos tokens de autenticação
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { email, password } = payload;

  // Verificar se o email existe
  const user = await db('users').where({ email }).first();

  // Segurança: Usar a mesma mensagem de erro para email ou password inválidos
  // para evitar dar pistas a atacantes sobre quais emails estão registados
  if (!user) {
    // 401 Unauthorized - credenciais inválidas
    throw new AppError('Invalid email or password', 401);
  }

  // Verificar se a password corresponde ao hash armazenado
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    // 401 Unauthorized - credenciais inválidas
    throw new AppError('Invalid email or password', 401);
  }

  // Gerar tokens de autenticação
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id);

  // Guardar o refresh token no Redis para controlo de sessão
  const decodedRefresh = jwt.decode(refreshToken) as JwtRefreshPayload;
  await storeRefreshToken(decodedRefresh.jti, user.id);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

// -------------------------------------------------------------
// refresh
// -------------------------------------------------------------
// Valida o refresh token, invalida o token antigo e gera novos tokens de autenticação
export async function refresh(
  token: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  // Verifica a assinatura e expiração do refresh token
  let decoded: JwtRefreshPayload;

  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtRefreshPayload;
  } catch {
    // 401 Unauthorized - token inválido ou expirado
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Verificar se o token existe no Redis (não foi revogado)
  const key = `${REFRESH_TOKEN_PREFIX}${decoded.jti}`;
  const storedUserId = await redisClient.get(key);

  if (!storedUserId) {
    // Póssivel reutilização de token - potencial ataque de replay
    throw new AppError('Refresh token has been revoked', 401);
  }

  // Rotação de tokens: Invalida o token antigo e gera novos tokens
  await deleteRefreshToken(decoded.jti);

  // Verifica se o utilizador ainda existe (pode ter sido eliminado)
  const user = await db('users').where({ id: storedUserId }).first();

  if (!user) {
    // 401 Unauthorized - utilizador não encontrado
    throw new AppError('User not found', 401);
  }

  // Gerar novos tokens de autenticação
  const accessToken = generateAccessToken(user.id, user.email);
  const newRefreshToken = generateRefreshToken(user.id);

  // Guardar o novo refresh token no Redis
  const newDecoded = jwt.decode(newRefreshToken) as JwtRefreshPayload;
  await storeRefreshToken(newDecoded.jti, user.id);

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}

// -------------------------------------------------------------
// logout
// -------------------------------------------------------------
// Invalida o refresh token para terminar a sessão do utilizador
export async function logout(token: string): Promise<void> {
  // Verifica a assinatura do refresh token para obter o jti

  try {
    const decoded = jwt.verify(
      token,
      env.JWT_REFRESH_SECRET,
    ) as JwtRefreshPayload;

    await deleteRefreshToken(decoded.jti);
  } catch {
    // Token inválido ou expirado — não há nada a invalidar.
    // Não lançamos erro — logout deve ser sempre "bem sucedido"
    // do ponto de vista do cliente.
  }
}
