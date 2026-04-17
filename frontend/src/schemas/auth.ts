// src/schemas/auth.ts
// Schemas de autenticação. Definem os tipos relacionados com autenticação, como o AuthUser.
// Igual ao backend, repetimos aqui para melhorar a integração e o UX do frontend

import { z } from 'zod'

// Regex valida a password: mínimo 8 caracteres
const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/

// Schema para validação de login
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email é obrigatório' })
    .email({ message: 'Email inválido' }),
  password: z
    .string()
    .min(1, { message: 'Password é obrigatória' })
    .regex(
      passwordRegex,
      'Password deve ter pelo menos 8 caracteres e conter letras e números'
    ),
})

// Type inferido automaticamente do schema para TypeScript
export type LoginFormData = z.infer<typeof loginSchema>

// Schema para validação de registo
export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Nome é obrigatório')
      .max(100, 'Nome deve ter no máximo 100 caracteres'),
    email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),
    password: z
      .string()
      .min(1, 'Password é obrigatória')
      .regex(
        passwordRegex,
        'Password deve ter pelo menos 8 caracteres e conter letras e números'
      ),
    passwordConfirmation: z.string().min(1, 'Confirmação é obrigatória'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Passwords não coincidem',
    path: ['passwordConfirmation'],
  })

// Type inferido automaticamente do schema para TypeScript
export type RegisterFormData = z.infer<typeof registerSchema>
