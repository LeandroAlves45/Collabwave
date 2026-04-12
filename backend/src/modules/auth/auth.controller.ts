// ============================================================
// CollabWave — Auth Controller
// ============================================================
// Os controllers são responsáveis por:
//   1. Validar os dados de entrada com Zod
//   2. Chamar o serviço apropriado
//   3. Enviar a resposta HTTP ao cliente
//
// Os controllers NÃO contêm lógica de negócio — delegam tudo
// para o serviço. Isto mantém os controllers pequenos e
// focados na camada HTTP.
// ============================================================

import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.services';
import { registerSchema, loginSchema, refreshSchema } from './auth.validators';

// -------------------------------------------------------------
// POST /api/auth/register
// -------------------------------------------------------------

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validar e fazer parse do body com Zod
    const input = registerSchema.parse(req.body);

    // Chamar o serviço de registo
    const result = await authService.register(input);

    // Responder com 201 Created e os dados de autenticação
    res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    // Passa o erro para o error handler global
    next(error);
  }
}

// -------------------------------------------------------------
// POST /api/auth/login
// -------------------------------------------------------------

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

// -------------------------------------------------------------
// POST /api/auth/refresh
// -------------------------------------------------------------

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

// -------------------------------------------------------------
// POST /api/auth/logout
// -------------------------------------------------------------

export async function logoutController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // O refresh token pode vir no body ou no header Authorization (por consistência usamos body)
    const { refreshToken } = refreshSchema.parse(req.body);
    await authService.logout(refreshToken);

    res.status(204).send(); // No Content
  } catch (error) {
    next(error);
  }
}
