// Controllers de auth: validam input, chamam o service e respondem HTTP.

import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.services';
import { registerSchema, loginSchema, refreshSchema } from './auth.validators';

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = registerSchema.parse(req.body);

    const result = await authService.register(input);

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
    const result = await authService.login(input);

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
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await authService.refresh(refreshToken);

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
    // O contrato atual aceita refreshToken apenas no body.
    const { refreshToken } = refreshSchema.parse(req.body);
    await authService.logout(refreshToken);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
