// Controllers de auth: validam input, chamam o service e respondem HTTP.

import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.services';
import { registerSchema, loginSchema } from './auth.validators';
import {
  clearRefreshCookie,
  getRefreshTokenCookie,
  setRefreshCookie,
} from './auth.cookies';

function exposeSession(
  res: Response,
  session: Awaited<ReturnType<typeof authService.login>>,
): Omit<typeof session, 'refreshToken'> {
  const { refreshToken, ...response } = session;
  setRefreshCookie(res, refreshToken);
  return response;
}

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = registerSchema.parse(req.body);

    const result = exposeSession(res, await authService.register(input));

    res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const result = exposeSession(res, await authService.login(input));

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = getRefreshTokenCookie(req);
    const tokens = exposeSession(res, await authService.refresh(refreshToken));

    res.status(200).json({
      status: 'success',
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
}

export async function logoutController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = getRefreshTokenCookie(req);
    await authService.logout(refreshToken);
    clearRefreshCookie(res);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
