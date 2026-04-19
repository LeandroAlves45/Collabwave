// src/hooks/useAuth.ts
// Custom hook para gerenciar autenticação de forma centralizada.
// Encapsula authStore + ApiClient + SocketService para simplificar componentes.

import { useCallback, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import ApiClient from '@/services/api'
import SocketService from '@/services/socket'
import type { LoginPayload, RegisterPayload } from '@/types/auth'

let restoreSessionPromise: Promise<void> | null = null

/**
 * Hook de autenticação que expõe estado e métodos para login, register e logout.
 *
 * Funcionalidades:
 * - Gerencia estado de autenticação (user, tokens, loading, error)
 * - Conecta/desconecta Socket.io automaticamente
 * - Limpa erros automaticamente após 5 segundos
 * - Trata refresh token rotation
 *
 * Uso:
 *   const { user, isLoading, error, login, logout } = useAuth()
 *
 * @returns Objeto com estado e métodos de autenticação
 */

export function useAuth() {

  // ================= ESTADO DO ZUSTAND =================

  // Extrair estado e ações do authStore
  const {
    user,
    isLoading,
    error,
    setAuth,
    clearAuth,
    setLoading,
    setError,
  } = useAuthStore()

  // ================= MÉTODO: LOGIN =================

  /**
   * Autentica utilizador com email e password.
   *
   * Fluxo:
   * 1. Define isLoading = true (desativa botão de login)
   * 2. Chama API POST /auth/login
   * 3. Se sucesso: armazena tokens + conecta Socket.io
   * 4. Se erro: mostra mensagem + limpa após 5s
   *
   * @param payload - { email, password }
   * @returns Promise que resolve quando login completo
   * @throws Não lança erro — captura e mostra via setError
   */

  const login = useCallback(
    async (payload: LoginPayload): Promise<void> => {
      try {
        // Inicia loading (desativa botão de submit no formulário)
        setLoading(true)
        setError(null)

        // Chama backend para autenticar
        const response = await ApiClient.login(payload)

        // Armazena utilizador e tokens no authStore
        setAuth(response.user, response.accessToken, response.refreshToken)

        // Conecta Socket.io com o novo access token
        SocketService.connect()

        console.log('[useAuth] Login bem-sucedido:', response.user.email)
      } catch (err) {
        // Captura o erro no backend
        const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer login'
        setError(errorMessage)

        // Limpar erro automaticamente após 5 segundos
        setTimeout(() => setError(null), 5000)

        console.error('[useAuth] Erro ao fazer login:', errorMessage)
      } finally {
        // Sempre desativa loading no final (mesmo se erro)
        setLoading(false)
      }
    },
    [setAuth, setError, setLoading]
  )

  // ================= MÉTODO: REGISTER =================

  /**
   * Cria nova conta de utilizador.
   *
   * Fluxo:
   * 1. Define isLoading = true
   * 2. Chama API POST /auth/register
   * 3. Se sucesso: armazena tokens + conecta Socket.io (registo autentica automaticamente)
   * 4. Se erro: mostra mensagem + limpa após 5s
   *
   * @param payload - { name, email, password, passwordConfirmation? }
   * @returns Promise que resolve quando registo completo
   * @throws Não lança erro — captura e mostra via setError
   */

  const register = useCallback(
    async (payload: RegisterPayload): Promise<void> => {
      try {
        setLoading(true)
        setError(null)

        // Chama backend para criar nova conta
        const response = await ApiClient.register(payload)

        // Backend retorna tokens após registo (auto-login)
        setAuth(response.user, response.accessToken, response.refreshToken)

        // Conecta Socket.io com o novo access token
        SocketService.connect()

        console.log('[useAuth] Registo bem-sucedido:', response.user.email)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao criar conta.'
        setError(errorMessage)

        // Limpar erro automaticamente após 5 segundos
        setTimeout(() => setError(null), 5000)

        console.error('[useAuth] Erro no registo:', errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [setAuth, setError, setLoading]
  )

  // ========== MÉTODO: LOGOUT ==========

  /**
   * Termina sessão do utilizador.
   *
   * Fluxo:
   * 1. Obtém refresh token do authStore
   * 2. Chama API POST /auth/logout para revogar token no backend
   * 3. Desconecta Socket.io
   * 4. Limpa authStore (user, tokens)
   *
   * IMPORTANTE: Logout é idempotente — sempre limpa estado local mesmo que API falhe.
   *
   * @returns Promise que resolve quando logout completo
   */

  const logout = useCallback(async (): Promise<void> => {
    try {
      // Obter refresh token do authStore
      const refreshToken = useAuthStore.getState().refreshToken

      if (refreshToken) {
        // Tenta revogar token no backend
        await ApiClient.logout(refreshToken)
      }

      console.log('[useAuth] Logout bem-sucedido')
    } catch (err) {
      // Ignora erros de logout 
      console.warn('[useAuth] Erro ao revogar token:', err)
    } finally {
      // Desconecta Socket.io e limpa authStore
      SocketService.disconnect()
      clearAuth()
    }
  }, [clearAuth])


  // ========== MÉTODO: REFRESH TOKEN ==========

  /**
   * Renova access token usando refresh token.
   *
   * Fluxo:
   * 1. Obtém refresh token do authStore
   * 2. Chama API POST /auth/refresh
   * 3. Backend retorna novo access token + novo refresh token (rotation)
   * 4. Atualiza tokens no authStore
   *
   * QUANDO USAR:
   * - Access token expira em ~15 minutos
   * - Refresh token expira em ~7 dias
   * - Este método deve ser chamado automaticamente 
   * antes de cada requisição se access token expirou
   *
   * @returns Promise que resolve quando tokens renovados
   * @throws Error se refresh token inválido ou expirado (força logout)
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      const refreshToken = useAuthStore.getState().refreshToken

      if (!refreshToken) {
        throw new Error('Refresh token ausente. Faça login novamente.')
      }

      // Chama backend para renovar tokens
      const response = await ApiClient.refresh(refreshToken)

      // Atualiza tokens + user no authStore (rotation)
      setAuth(response.user, response.accessToken, response.refreshToken)

      console.log('[useAuth] Tokens renovados com sucesso')
    } catch (err) {
      // Se refresh falhar (token inválido/expirado), força logout
      console.error('[useAuth] Erro ao renovar token:', err)
      await logout()
      throw err
    }
  }, [logout, setAuth])

  // ========== EFEITO: AUTO-LIMPAR ERROS ==========

  /**
   * Limpa mensagens de erro automaticamente após 5 segundos.
   * Melhora UX — utilizador não precisa clicar para fechar erro.
   */
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer) // Limpa timer se componente desmontar ou erro mudar
    }
  }, [error, setError])

  // ========== EFEITO: RESTAURAR SESSÃO AO CARREGAR ==========

  /**
   * Ao carregar aplicação, tenta restaurar sessão usando refresh token.
   *
   * Fluxo:
   * 1. Verifica se existe refresh token em localStorage
   * 2. Se sim, tenta obter novo access token
   * 3. Se sucesso, conecta Socket.io
   * 4. Se falha, limpa tokens inválidos
   *
   * Isto permite que utilizador não precise fazer login novamente
   * toda vez que recarrega a página.
   */
  useEffect(() => {
    const restoreSession = async () => {
      const currentAuth = useAuthStore.getState()

      if (currentAuth.user && currentAuth.accessToken) {
        return
      }

      if (restoreSessionPromise) {
        return restoreSessionPromise
      }

      const refreshToken = localStorage.getItem('refreshToken')

      // Se não houver refresh token, nada a restaurar
      if (!refreshToken) {
        return
      }

      restoreSessionPromise = (async () => {
        try {
          const latestAuth = useAuthStore.getState()

          if (latestAuth.user && latestAuth.accessToken) {
            return
          }

          console.log('[useAuth] Tentando restaurar sessão...')

          // Tenta obter novo access token + user do backend
          const response = await ApiClient.refresh(refreshToken)

          // Backend retorna user, não precisa buscar do localStorage
          setAuth(response.user, response.accessToken, response.refreshToken)
          SocketService.connect()
          console.log('[useAuth] Sessão restaurada com sucesso.')
        } catch (err) {
          // Refresh token expirado ou inválido — limpa tokens
          console.warn('[useAuth] Não foi possível restaurar sessão:', err)

          if (localStorage.getItem('refreshToken') === refreshToken) {
            clearAuth()
          }
        } finally {
          restoreSessionPromise = null
        }
      })()

      return restoreSessionPromise
    }

    void restoreSession()
  }, [setAuth, clearAuth])

  // ========== EFEITO: PERSISTIR USER EM LOCALSTORAGE ==========

  /**
   * Sempre que user muda, persiste em localStorage.
   * Necessário para restaurar sessão (ver efeito acima).
   */
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }
  }, [user])

  // ================= RETORNO DO HOOK =================

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshToken,
  }
}
