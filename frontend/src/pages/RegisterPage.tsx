// src/pages/RegisterPage.tsx
// Página de registo. Formulário para o utilizador criar uma conta.
// Valida name + email + password + passwordConfirmation usando Zod
// Após submissão bem-sucedida, faz login automático e navega para workspaces ('/')

import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RegisterFormData, registerSchema } from '../schemas/auth'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import ApiClient  from '@/services/api'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/common/Logo'


// RegisterPage: formulário de criação de conta para novos utilizadores
// Valida name + email + password + passwordConfirmation usando Zod
// Após submissão bem-sucedida, faz login automático e navega para workspaces ('/')
export function RegisterPage(): ReactElement {
  const navigate = useNavigate()
  const { setAuth, error, setError, isLoading, setLoading } = useAuthStore()

  // react-hook-form inicializado com Zod para validação
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  // Efeito: auto-limpa mensagem de erro após 5 segundos
  // Permite ao utilizador tentar novamente após receber erro
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error, setError])

  // Função chamada quando formulário é submetido para validação Zod
  // data: RegisterFormData = name + email + password + passwordConfirmation
  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    try {
      // Define loading state: desativa botão, mostra "A registar..."
      setLoading(true)

      // Chama endpoint /auth/register
      // Backend retorna: { accessToken, refreshToken, user }
      const response = await ApiClient.register({
        name: data.name,
        email: data.email,
        password: data.password,
        passwordConfirmation: data.passwordConfirmation,
      });

      // Desastrutura resposta: extrai tokens e dados do utilizador
      const { accessToken, refreshToken, user } = response

      // Armazena autenticação no Zustand store
      setAuth(user, accessToken, refreshToken)

      // Limpa erro anterior se existir
      setError(null)

      // Navega para página de workspaces após registo bem-sucedido
      navigate('/')
    } catch (err) {
      // Extrái mensagem de erro do backend ou fallback
      const errMessage =
        err instanceof Error ? err.message : 'Erro desconhecido. Tente novamente.'

      // Armazena erro no store: mostra ao utilizador por 5 segundos
      setError(errMessage)

      // ! Log para debugging: mostra erro no console (produção remover)
      console.error('Erro no registo:', err)
    } finally {
      // Reseta loading state: reativa botão, esconde "A registar..."
      setLoading(false)
    }
  };

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
            Criar Conta
          </h1>

          {/* Mostrar erro de submissão se existir */}
          {/* Erro vem do backend (email já existe, etc) ou erro de conexão */}
          {error && (
            <div className="mb-4 p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Formulário de registo */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Campo name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-cw-text-primary mb-2">
                Nome
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Teu nome completo"
                {...register('name')}
                // className condicional: borda vermelha se houver erro de validação
                className={errors.name ? 'border-red-500' : ''}
              />
              {/* Mostrar mensagem de erro abaixo do campo se existir */}
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Campo email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-cw-text-primary mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
                // className condicional: borda vermelha se houver erro
                className={errors.email ? 'border-red-500' : ''}
              />
              {/* Mostrar mensagem de erro abaixo do campo se existir */}
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Campo password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-cw-text-primary mb-2">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres com letra e número"
                {...register('password')}
                // className condicional: borda vermelha se houver erro
                className={errors.password ? 'border-red-500' : ''}
              />
              {/* Mostrar mensagem de erro abaixo do campo se existir */}
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Campo passwordConfirmation */}
            {/* Validado contra password usando .refine() no schema Zod */}
            <div>
              <label htmlFor="passwordConfirmation" className="block text-sm font-medium text-cw-text-primary mb-2">
                Confirmar Password
              </label>
              <Input
                id="passwordConfirmation"
                type="password"
                placeholder="Repete a password"
                {...register('passwordConfirmation')}
                // className condicional: borda vermelha se houver erro
                className={errors.passwordConfirmation ? 'border-red-500' : ''}
              />
              {/* Mostrar mensagem de erro abaixo do campo se existir */}
              {errors.passwordConfirmation && (
                <p className="text-sm text-red-500 mt-1">{errors.passwordConfirmation.message}</p>
              )}
            </div>

            {/* Botão submit */}
            {/* Desativado enquanto o formulário está sendo submetido (isLoading = true) */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6"
            >
              {/* Mostrar loading state enquanto submete */}
              {isLoading ? 'A registar...' : 'Criar Conta'}
            </Button>
          </form>

          {/* Link para página de login */}
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
  );
}
