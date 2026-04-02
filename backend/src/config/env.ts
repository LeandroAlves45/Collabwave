import 'dotenv/config';

// HELPER - getRequiredEnv
function getRequiredEnv(key: string): string {
  const value = process.env[key];

  // Se o valor for undefined, lança um erro
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

// HELPER - getOptionalEnv
function getOptionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value : defaultValue;
}

// CONFIGURAÇÃO - Exporta as variáveis de ambiente necessárias
export const env = {
  // Ambiente de execução (development, staging, production)
  NODE_ENV: getOptionalEnv('NODE_ENV', 'development'),

  // Porta do servidor
  PORT: parseInt(getOptionalEnv('PORT', '3000'), 10),

  // DATABASE
  DATABASE_URL: getRequiredEnv('DATABASE_URL'),

  // REDIS
  REDIS_URL: getRequiredEnv('REDIS_URL'),

  // JWT
  JWT_SECRET: getRequiredEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: getRequiredEnv('JWT_REFRESH_SECRET'),
  JWT_EXPIRES_IN: getOptionalEnv('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: getOptionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),

  // CORS
  CORS_ORIGIN: getOptionalEnv('CORS_ORIGIN', 'http://localhost:5173'),

  // RATE LIMITING
  RATE_LIMIT_WINDOW_MS: parseInt(
    getOptionalEnv('RATE_LIMIT_WINDOW_MS', '900000'),
    10,
  ), // 15 minutos
  RATE_LIMIT_MAX_REQUESTS: parseInt(
    getOptionalEnv('RATE_LIMIT_MAX_REQUESTS', '100'),
    10,
  ), // 100 requests
} as const;

// TYPE EXPORT
export type Env = typeof env;
