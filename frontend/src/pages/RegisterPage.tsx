// src/pages/RegisterPage.tsx
// Página de registo. Formulário para o utilizador criar uma conta.
// Valida name + email + password usando Zod
// Após submissão bem-sucedida, faz login automático e navega para workspaces ('/')

import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RegisterFormData, registerSchema } from '../schemas/auth'
import { useNavigate, Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/common/Logo'
import { WaveLine } from '@/components/common/WaveLine'

// RegisterPage: formulário de criação de conta para novos utilizadores
// Valida name + email + password usando Zod
// Após submissão bem-sucedida, faz login automático e navega para workspaces ('/')
export function RegisterPage(): ReactElement {
  const navigate = useNavigate()
  // ========== HOOK DE AUTENTICAÇÃO ==========
  // useAuth encapsula toda a lógica de registo:
  // - isLoading: true durante requisição HTTP
  // - error: mensagem de erro do backend (auto-limpa após 5s)
  // - register: método que cria conta e conecta Socket.io automaticamente
  const { isLoading, error, isAuthenticated, register: registerUser } = useAuth()

  // ========== REACT-HOOK-FORM ==========
  // Validação Zod antes de submeter formulário
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur', // valida ao sair de cada campo (melhor UX)
  })
  // ========== NAVEGAR APÓS LOGIN BEM-SUCEDIDO ==========
  /**
   * useEffect que monitora mudanças em isAuthenticated.
   *
   * Quando o utilizador faz login com sucesso:
   * 1. useAuth atualiza isAuthenticated para true
   * 2. Este efeito é disparado (dependency array: [isAuthenticated])
   * 3. Se isAuthenticated === true, navegamos para /
   * 4. Se o utilizador já estava autenticado (ao abrir página), também navega
   *
   * Vantagens desta abordagem:
   * - Componente React fica síncrono com estado de autenticação
   * - Evita navegação duplicada (não coloca lógica em onSubmit)
   * - Funciona mesmo se a página recarregar (session restoration)
   */
  useEffect(() => {
    if (isAuthenticated) {
      // Navega para a página de workspaces (rota protegida: /)
      // ProtectedRoute em App.tsx valida se utilizador está autenticado
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  // ========== SUBMISSÃO DE FORMULÁRIO ==========
  /**
   * onSubmit é chamado APENAS após validação Zod bem-sucedida.
   *
   * Fluxo (tudo gerido pelo useAuth hook):
   * 1. Chama registerUser({ name, email, password })
   * 2. Hook faz POST /auth/register
   * 3. Hook armazena tokens no authStore
   * 4. Hook conecta Socket.io automaticamente
   * 5. Se sucesso: navega para /
   * 6. Se erro: hook mostra mensagem via error state
   */
  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    // O schema atual nao tem confirmacao de password; se o campo voltar, atualizar schema e UI juntos.
    // Chama método register do hook
    // Internamente: ApiClient.register() + setAuth() + SocketService.connect()
    await registerUser(data)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center overflow-y-auto bg-cw-bg-primary px-4 py-16">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        {/* Card de autenticação */}
        <Card className="rounded-lg border-0 bg-cw-bg-secondary p-6">
          {/* Linha decorativa animada */}
          <WaveLine className="mb-6" />

          <h1 className="mb-3 text-center font-heading text-3xl font-bold text-cw-text-primary">
            Create account
          </h1>
          <p className="mb-6 text-center text-sm text-cw-text-muted">
            Join CollabWave and start collaborating
          </p>

          {/* Mensagem de erro */}
          {error && (
            <div className="mb-4">
              <div className="rounded-md border border-cw-error/40 bg-cw-error/10 p-3 text-sm text-cw-error">
                {error}
              </div>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full name */}
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-cw-text-secondary"
              >
                Full name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Your full name"
                {...registerField('name')}
                className={errors.name ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-cw-text-secondary"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...registerField('email')}
                className={errors.email ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-cw-text-secondary"
              >
                Password
              </label>
              <PasswordInput
                id="password"
                placeholder="Create a password"
                {...registerField('password')}
                className={errors.password ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Botão de submit */}
            <Button type="submit" disabled={isLoading} className="w-full font-bold">
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          {/* Link para login */}
          <div className="mt-6 border-t border-cw-border pt-4 text-center">
            <p className="text-sm text-cw-text-muted">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-cw-accent hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
