import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value : defaultValue;
}

export const env = {
  NODE_ENV: getOptionalEnv('NODE_ENV', 'development'),

  PORT: parseInt(getOptionalEnv('PORT', '3000'), 10),

  DATABASE_URL: getRequiredEnv('DATABASE_URL'),

  REDIS_URL: getRequiredEnv('REDIS_URL'),

  JWT_SECRET: getRequiredEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: getRequiredEnv('JWT_REFRESH_SECRET'),
  JWT_EXPIRES_IN: getOptionalEnv('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: getOptionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),

  CORS_ORIGIN: getOptionalEnv('CORS_ORIGIN', 'http://localhost:5173'),

  RATE_LIMIT_WINDOW_MS: parseInt(
    getOptionalEnv('RATE_LIMIT_WINDOW_MS', '900000'),
    10,
  ),
  RATE_LIMIT_MAX_REQUESTS: parseInt(
    getOptionalEnv('RATE_LIMIT_MAX_REQUESTS', '100'),
    10,
  ),
} as const;

export type Env = typeof env;
