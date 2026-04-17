// src/pages/LoginPage.tsx
// Página de login: formulário com validação Zod + integração com backend real
// Fluxo: validação local → POST /auth/login → armazena tokens → navega para /workspaces

import { useForm } from 'react-hook-form'
import type { ReactElement } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { loginSchema, type LoginFormData } from '@/schemas/auth'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/common/Logo'

export function LoginPage(): ReactElement {
  const navigate = useNavigate()

  // ========== HOOK DE AUTENTICAÇÃO ==========
  // useAuth encapsula toda a lógica de login:
  // - isLoading: true durante requisição HTTP
  // - error: mensagem de erro do backend (auto-limpa após 5s)
  // - login: método que autentica e conecta Socket.io automaticamente
  const { isLoading, error, login } = useAuth()

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
   * 3. Hook armazena tokens no authStore
   * 4. Hook conecta Socket.io automaticamente
   * 5. Se sucesso: navega para /
   * 6. Se erro: hook mostra mensagem via error state
   */
  const onSubmit = async (data: LoginFormData): Promise<void> => {
    // Chama método login do hook
    await login(data)

    // ========== NAVEGA PARA DASHBOARD ==========
    // Após login bem-sucedido, leva utilizador para ver workspaces
    navigate('/')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-cw-bg-primary">
      <div className="w-full max-w-md px-4">
        {/* Logo no topo */}
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        {/* Card com formulário */}
        <Card className="p-6">
          <h1 className="text-2xl font-bold text-cw-text-primary mb-6 text-center">
            Entrar
          </h1>

          {/* ========== MENSAGEM DE ERRO ==========
              Mostra erro do backend (ex: "Invalid email or password")
              useAuth limpa automaticamente após 5 segundos */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Formulário de login */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* ========== CAMPO EMAIL ========== */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-cw-text-primary mb-2"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* ========== CAMPO PASSWORD ========== */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-cw-text-primary mb-2"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                {...register('password')}
                className={errors.password ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* ========== BOTÃO DE SUBMIT ========== */}
            <Button type="submit" disabled={isLoading} className="w-full mt-6">
              {isLoading ? 'A entrar...' : 'Entrar'}
            </Button>
          </form>

          {/* ========== LINK PARA REGISTO ========== */}
          <div className="mt-6 text-center">
            <p className="text-sm text-cw-text-secondary">
              Não tens conta?{' '}
              <Link to="/register" className="font-medium text-cw-accent hover:underline">
                Regista-te
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
