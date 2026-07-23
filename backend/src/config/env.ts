import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// npm executa os scripts backend com cwd=backend. Este caminho também funciona
// depois de compilar para dist, ao contrário de um caminho baseado em __dirname.
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const durationSchema = z.string().regex(
  /^[1-9]\d*(s|m|h|d)?$/,
  'must be seconds or a duration such as 15m or 7d',
);

const rawSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3001),
  DATABASE_URL: z.string().url(),
  DATABASE_SSL: z.enum(['true', 'false']).optional(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: durationSchema.default('15m'),
  JWT_REFRESH_EXPIRES_IN: durationSchema.default('7d'),
  CORS_ORIGINS: z.string().min(1),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  HEALTHCHECK_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
});

const parsed = rawSchema.safeParse({
  ...process.env,
  // Mantém compatibilidade durante a transição do nome singular.
  CORS_ORIGINS:
    process.env.CORS_ORIGINS ??
    process.env.CORS_ORIGIN ??
    'http://localhost:5173',
});

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

if (parsed.data.JWT_SECRET === parsed.data.JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
}

const corsOrigins = parsed.data.CORS_ORIGINS
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (
  corsOrigins.length === 0 ||
  corsOrigins.some((origin) => {
    try {
      return new URL(origin).origin !== origin;
    } catch {
      return true;
    }
  })
) {
  throw new Error('CORS_ORIGINS must contain exact, comma-separated origins');
}

export const env = {
  ...parsed.data,
  DATABASE_SSL:
    parsed.data.DATABASE_SSL === undefined
      ? parsed.data.NODE_ENV === 'production'
      : parsed.data.DATABASE_SSL === 'true',
  CORS_ORIGINS: corsOrigins,
  // Alias temporário para módulos que ainda consomem uma única origem.
  CORS_ORIGIN: corsOrigins[0],
} as const;

export type Env = typeof env;
