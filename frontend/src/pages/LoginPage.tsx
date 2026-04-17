// src/pages/LoginPage.tsx
// Página de login: formulário com validação Zod + integração com backend real
// Fluxo: validação local → POST /auth/login → armazena tokens → navega para /workspaces

import { useForm } from 'react-hook-form'
import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { loginSchema, type LoginFormData } from '@/schemas/auth'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/common/Logo'
import ApiClient from '@/services/api'

export function LoginPage(): ReactElement {
  const navigate = useNavigate()

  // ========== ESTADO GLOBAL DE AUTENTICAÇÃO ==========
  // Seleciona 4 valores do store:
  // - isLoading: true enquanto requisição HTTP está em progresso
  // - error: mensagem de erro do backend (ex: "Invalid email or password")
  // - setAuth: função que armazena user + tokens após login bem-sucedido
  // - setLoading/setError: funções auxiliares para atualizar estado
  const isLoading = useAuthStore((state) => state.isLoading)
  const error = useAuthStore((state) => state.error)
  const setAuth = useAuthStore((state) => state.setAuth)
  const setLoading = useAuthStore((state) => state.setLoading)
  const setError = useAuthStore((state) => state.setError)

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

  // ========== LIMPEZA DE ERRO ==========
  // Se houver erro, mostra durante 5 segundos e depois limpa
  // Permite ao utilizador tentar novamente sem ver mensagem antiga
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error, setError])

  // ========== SUBMISSÃO DE FORMULÁRIO ==========
  /**
   * onSubmit é chamado APENAS após validação Zod bem-sucedida.
   * data = { email, password } (garantidos válidos pelo schema)
   *
   * Fluxo:
   * 1. Marca isLoading=true (desativa botão)
   * 2. Chama POST /auth/login com credentials
   * 3. Se sucesso: armazena user + tokens → navega para /workspaces
   * 4. Se erro: mostra mensagem do backend ao utilizador
   */
  const onSubmit = async (data: LoginFormData): Promise<void> => {
    try {
      // Marca início da requisição (mostra "A entrar..." e desativa botão)
      setLoading(true)
      setError(null) // limpa erro anterior

      // ========== CHAMADA HTTP AO BACKEND ==========
      // POST /auth/login com { email, password }
      // Retorna: { user, accessToken, refreshToken }
      const response = await ApiClient.login(data)

      // ========== SUCESSO: ARMAZENA AUTENTICAÇÃO ==========
      // setAuth:
      // - Guarda user no estado (nome, email, ID, etc)
      // - Guarda accessToken em memória (para requisições futuras)
      // - Guarda refreshToken em localStorage (persiste após recarregar página)
      setAuth(response.user, response.accessToken, response.refreshToken)

      // ========== NAVEGA PARA DASHBOARD ==========
      // Após login bem-sucedido, leva utilizador para ver workspaces
      navigate('/')
    } catch (err) {
      // ========== ERRO: MOSTRA MENSAGEM ==========
      // O ApiClient extrai mensagem do backend:
      // - "Invalid email or password" (401)
      // - "Too many requests. Please try again later." (429 rate-limit)
      // - Outros erros HTTP
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(message)
    } finally {
      // Marca fim da requisição (retorna ao estado normal)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-cw-bg-primary">
      {/* Contentor principal: centrado, com padding responsivo */}
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

          {/* ========== MENSAGEM DE ERRO GLOBAL ==========
              Mostra erro do backend (ex: "Invalid email or password")
              Desaparece automaticamente após 5 segundos */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Formulário de login */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* ========== CAMPO EMAIL ==========
                - register('email'): conecta o input ao react-hook-form
                - {...register('email')}: expande para { name, onChange, onBlur, ref }
                - errors.email?.message: mostra erro de validação Zod */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-cw-text-primary mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
                // Borda vermelha se houver erro de validação
                className={errors.email ? 'border-red-500' : ''}
                // Desativa durante requisição HTTP
                disabled={isLoading}
              />
              {/* Mostra mensagem de erro Zod (ex: "Email inválido") */}
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* ========== CAMPO PASSWORD ==========
                Similar ao campo email
                type="password" oculta o texto (bullets) */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-cw-text-primary mb-2">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                {...register('password')}
                // Borda vermelha se houver erro de validação
                className={errors.password ? 'border-red-500' : ''}
                // Desativa durante requisição HTTP
                disabled={isLoading}
              />
              {/* Mostra mensagem de erro Zod */}
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* ========== BOTÃO DE SUBMIT ==========
                - disabled={isLoading}: desativa enquanto requisição em progresso
                - Mostra "A entrar..." durante requisição, "Entrar" caso contrário
                - Impede submissão dupla */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6"
            >
              {isLoading ? 'A entrar...' : 'Entrar'}
            </Button>
          </form>

          {/* ========== LINK PARA REGISTO ==========
              Se utilizador não tem conta, pode navegar para RegisterPage */}
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
