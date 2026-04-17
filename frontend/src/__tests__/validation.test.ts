// src/__tests__/validation.test.ts
// Testes de validação dos schemas Zod com vitest
// Executa com: npm test

import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema } from '../schemas/auth'

describe('loginSchema', () => {
  it('valida email + password válidos', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'ValidPass123' })
    expect(result.success).toBe(true)
  })

  it('rejeita email inválido', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'ValidPass123' })
    expect(result.success).toBe(false)
    expect((result as any).error.issues[0].message).toContain('Email')
  })

  it('rejeita password < 8 caracteres', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'Short1' })
    expect(result.success).toBe(false)
    expect((result as any).error.issues[0].message).toContain('8 caracteres')
  })

  it('rejeita password sem letra', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '12345678' })
    expect(result.success).toBe(false)
    expect((result as any).error.issues[0].message).toContain('letras')
  })

  it('rejeita password sem número', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'NoNumbers' })
    expect(result.success).toBe(false)
    expect((result as any).error.issues[0].message).toContain('números')
  })
})

describe('registerSchema', () => {
  it('valida registo completo com passwords iguais', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'ValidPass123',
      passwordConfirmation: 'ValidPass123',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita passwords diferentes', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'ValidPass123',
      passwordConfirmation: 'DifferentPass123',
    })
    expect(result.success).toBe(false)
    expect((result as any).error.issues[0].message).toContain('não coincidem')
  })

  it('rejeita name vazio', () => {
    const result = registerSchema.safeParse({
      name: '',
      email: 'john@example.com',
      password: 'ValidPass123',
      passwordConfirmation: 'ValidPass123',
    })
    expect(result.success).toBe(false)
    expect((result as any).error.issues[0].message).toContain('obrigatório')
  })
})
