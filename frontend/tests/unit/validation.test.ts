// Testes de validação dos schemas Zod com vitest
// Valida os esquemas de autenticação (login e registo)
// Executa com: npm test

import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema } from '@/schemas/auth'

// Suite de testes para o schema de login
describe('loginSchema', () => {
  // Testa validação bem-sucedida com email e password válidos
  it('valida email + password válidos', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'ValidPass123' })
    expect(result.success).toBe(true)
  })

  // Testa rejeição de email mal formatado
  it('rejeita email inválido', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'ValidPass123' })
    expect(result.success).toBe(false)
    expect((result as any).error.issues[0].message).toContain('Email')
  })

  // Testa rejeição de password com menos de 8 caracteres
  it('rejeita password < 8 caracteres', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'Short1' })
    expect(result.success).toBe(false)
    expect((result as any).error.issues[0].message).toContain('8 caracteres')
  })

  // Testa rejeição de password sem nenhuma letra
  it('rejeita password sem letra', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '12345678' })
    expect(result.success).toBe(false)
    expect((result as any).error.issues[0].message).toContain('letras')
  })

  // Testa rejeição de password sem nenhum número
  it('rejeita password sem número', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'NoNumbers' })
    expect(result.success).toBe(false)
    expect((result as any).error.issues[0].message).toContain('números')
  })
})

// Suite de testes para o schema de registo
describe('registerSchema', () => {
  // Testa validação bem-sucedida com todos os campos obrigatórios
  it('valida registo completo com passwords iguais', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'ValidPass123',
      passwordConfirmation: 'ValidPass123',
    })
    expect(result.success).toBe(true)
  })

  // Testa rejeição quando as passwords não coincidem
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

  // Testa rejeição quando o campo nome está vazio
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
