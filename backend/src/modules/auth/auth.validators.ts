// ============================================================
// CollabWave - Auth Validators (Zod)
// ============================================================
// Define os schemas de validação para os endpoints de autenticação.
// O Zod valida e faz parse dos dados de entrada, garantindo que
// o serviço recebe sempre dados no formato correcto.
// ============================================================

import { z } from 'zod';

// ----------------------------------------------
// Schema de Registo
// ----------------------------------------------
export const registerSchema = z.object({
  // Nome: obrigatório, string, entre 2 e 100 caracteres
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(100, { message: 'Name must be at most 100 characters' }),

  // Email: obrigatório, string, formato de email, normalizado para lowercase
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email({ message: 'Please provide a valid email address' })
    .toLowerCase(),

  // Password: obrigatório, string, mínimo 8 caracteres, deve conter letras e números
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, { message: 'Password must be at least 8 characters' })
    .regex(/[a-zA-Z]/, { message: 'Password must contain at least one letter' })
    .regex(/\d/, { message: 'Password must contain at least one number' })
    .max(100, { message: 'Password must be at most 100 characters' }),
});

// ----------------------------------------------
// Schema de Login
// ----------------------------------------------
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email({ message: 'Please provide a valid email address' })
    .toLowerCase(),

  password: z
    .string({ required_error: 'Password is required' })
    .min(8, { message: 'Password must be at least 8 characters' })
    .regex(/[a-zA-Z]/, { message: 'Password must contain at least one letter' })
    .regex(/\d/, { message: 'Password must contain at least one number' })
    .max(100, { message: 'Password must be at most 100 characters' }),
});

// ----------------------------------------------
// Schema de Refresh Token
// ----------------------------------------------
// O refresh token é enviado no corpo do pedido
export const refreshSchema = z.object({
  refreshToken: z
    .string({ required_error: 'Refresh token is required' })
    .min(1, { message: 'Refresh token is required' }),
});

// ----------------------------------------------
// Tipos inferidos dos schemas
// -----------------------------------------------
// O Zod pode inferir tipos de TypeScript automaticamente a partir dos schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
