// src/pages/RegisterPage.tsx
// Página de registo. Formulário para o utilizador criar uma conta.
// Valida name + email + password + passwordConfirmation usando Zod
// Após submissão bem-sucedida, faz login automático e navega para workspaces ('/')

import type { ReactElement } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RegisterFormData, registerSchema } from '../schemas/auth'
import { useNavigate, Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/common/Logo'

// RegisterPage: formulário de criação de conta para novos utilizadores
// Valida name + email + password + passwordConfirmation usando Zod
// Após submissão bem-sucedida, faz login automático e navega para workspaces ('/')
export function RegisterPage(): ReactElement {
  const navigate = useNavigate()
  // ========== HOOK DE AUTENTICAÇÃO ==========
  // useAuth encapsula toda a lógica de registo:
  // - isLoading: true durante requisição HTTP
  // - error: mensagem de erro do backend (auto-limpa após 5s)
  // - register: método que cria conta e conecta Socket.io automaticamente
  const { isLoading, error, register: registerUser } = useAuth()

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

  // ========== SUBMISSÃO DE FORMULÁRIO ==========
  /**
   * onSubmit é chamado APENAS após validação Zod bem-sucedida.
   *
   * Fluxo (tudo gerido pelo useAuth hook):
   * 1. Chama registerUser({ name, email, password, passwordConfirmation })
   * 2. Hook faz POST /auth/register
   * 3. Hook armazena tokens no authStore
   * 4. Hook conecta Socket.io automaticamente
   * 5. Se sucesso: navega para /
   * 6. Se erro: hook mostra mensagem via error state
   */
  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    // Chama método register do hook
    // Internamente: ApiClient.register() + setAuth() + SocketService.connect()
    await registerUser(data)

    // Navega para página de workspaces após registo bem-sucedido
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
            Criar Conta
          </h1>

          {/* ========== MENSAGEM DE ERRO ==========
              Mostra erro do backend (ex: "Email já registado")
              useAuth limpa automaticamente após 5 segundos */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Formulário de registo */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* ========== CAMPO NAME ========== */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-cw-text-primary mb-2"
              >
                Nome
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Teu nome completo"
                {...registerField('name')}
                className={errors.name ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

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
                {...registerField('email')}
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
                placeholder="Mínimo 8 caracteres com letra e número"
                {...registerField('password')}
                className={errors.password ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* ========== CAMPO PASSWORD CONFIRMATION ========== */}
            <div>
              <label
                htmlFor="passwordConfirmation"
                className="block text-sm font-medium text-cw-text-primary mb-2"
              >
                Confirmar Password
              </label>
              <Input
                id="passwordConfirmation"
                type="password"
                placeholder="Repete a password"
                {...registerField('passwordConfirmation')}
                className={errors.passwordConfirmation ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.passwordConfirmation && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.passwordConfirmation.message}
                </p>
              )}
            </div>

            {/* ========== BOTÃO DE SUBMIT ========== */}
            <Button type="submit" disabled={isLoading} className="w-full mt-6">
              {isLoading ? 'A registar...' : 'Criar Conta'}
            </Button>
          </form>

          {/* ========== LINK PARA LOGIN ========== */}
          <div className="mt-6 text-center">
            <p className="text-sm text-cw-text-secondary">
              Já tens conta?{' '}
              <Link to="/login" className="font-medium text-cw-accent hover:underline">
                Entra
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
