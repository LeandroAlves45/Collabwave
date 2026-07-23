import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';

const durationUnits: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

function parseDurationToSeconds(value: string): number {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) return numericValue;

  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid refresh duration: ${value}`);
  return Number(match[1]) * durationUnits[match[2]];
}

export const REFRESH_TOKEN_TTL_SECONDS = parseDurationToSeconds(
  env.JWT_REFRESH_EXPIRES_IN,
);

export const REFRESH_COOKIE_NAME = 'collabwave_refresh';

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
};

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, cookieOptions);
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
}

export function getRefreshTokenCookie(req: Request): string {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    throw new AppError('Refresh session is missing', 401);
  }

  const encodedToken = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim().split('='))
    .find(([name]) => name === REFRESH_COOKIE_NAME)?.[1];

  if (!encodedToken) {
    throw new AppError('Refresh session is missing', 401);
  }

  try {
    return decodeURIComponent(encodedToken);
  } catch {
    throw new AppError('Refresh session is invalid', 401);
  }
}
