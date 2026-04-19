// src/pages/LoginPage.tsx
// Página de login: formulário com validação Zod + integração com backend real
// Fluxo: validação local → POST /auth/login → armazena tokens → navega para /workspaces

import { useForm } from 'react-hook-form'
import { useEffect, type ReactElement } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { loginSchema, type LoginFormData } from '@/schemas/auth'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/common/Logo'
import { WaveLine } from '@/components/common/WaveLine'

export function LoginPage(): ReactElement {
  const navigate = useNavigate()

  // ========== HOOK DE AUTENTICAÇÃO ==========
  // useAuth encapsula toda a lógica de login:
  // - isLoading: true durante requisição HTTP
  // - error: mensagem de erro do backend (auto-limpa após 5s)
  // - login: método que autentica e conecta Socket.io automaticamente
  // - isAuthenticated: true quando utilizador fez login com sucesso
  const { isLoading, error, login, isAuthenticated } = useAuth()

  // ========== REACT-HOOK-FORM ==========
  // register: adiciona input aos campos
  // handleSubmit: valida com Zod antes de chamar onSubmit
  // formState: {errors} = mensagens de erro de validação
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur', // valida ao sair de cada campo (melhor UX)
  })

  // ========== SUBMISSÃO DE FORMULÁRIO ==========
  /**
   * onSubmit é chamado APENAS após validação Zod bem-sucedida.
   *
   * Fluxo (tudo gerido pelo useAuth hook):
   * 1. Chama login({ email, password })
   * 2. Hook faz POST /auth/login
   * 3. Hook armazena tokens no authStore (user, accessToken, refreshToken)
   * 4. Hook conecta Socket.io automaticamente
   * 5. Hook atualiza isAuthenticated para true
   * 6. Se erro: hook mostra mensagem via error state (não navega)
   *
   * Nota: NÃO navegamos aqui - deixamos o useEffect abaixo fazer a navegação
   * quando isAuthenticated muda para true. Assim, o componente React está
   * sempre sincronizado com o estado da autenticação.
   */
  const onSubmit = async (data: LoginFormData): Promise<void> => {
    // O hook centraliza tokens, user e socket; a pagina so reage ao estado autenticado.
    // Chama método login do hook useAuth
    // Este método cuida de: requisição HTTP, armazenar tokens, conectar Socket.io
    await login(data)
    // Não navegamos aqui - o useEffect abaixo cuidará disso
  }

  // ========== NAVEGAR APÓS LOGIN BEM-SUCEDIDO ==========
  /**
   * useEffect que monitora mudanças em isAuthenticated.
   *
   * Quando o utilizador faz login com sucesso:
   * 1. useAuth atualiza isAuthenticated para true
   * 2. Este efeito é disparado (dependency array: [isAuthenticated])
   * 3. Se isAuthenticated === true, navegamos para /workspaces
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
            Welcome back
          </h1>
          <p className="mb-6 text-center text-sm text-cw-text-muted">
            Sign in to your account to continue
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
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
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
                placeholder="Enter your password"
                {...register('password')}
                className={errors.password ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Botão de submit */}
            <Button type="submit" disabled={isLoading} className="w-full font-bold">
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {/* Link para registo */}
          <div className="mt-6 border-t border-cw-border pt-4 text-center">
            <p className="text-sm text-cw-text-muted">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-medium text-cw-accent hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
