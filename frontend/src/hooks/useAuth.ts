import { useCallback, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import ApiClient from '@/services/api'
import SocketService from '@/services/socket'
import type { LoginPayload, RegisterPayload } from '@/types/auth'

let restoreSessionPromise: Promise<void> | null = null

export function useAuth() {
  const {
    user,
    isLoading,
    isSessionInitialized,
    error,
    setAuth,
    clearAuth,
    setSessionInitialized,
    setLoading,
    setError,
  } = useAuthStore()

  const login = useCallback(async (payload: LoginPayload): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const response = await ApiClient.login(payload)
      setAuth(response.user, response.accessToken)
      SocketService.connect()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }, [setAuth, setError, setLoading])

  const register = useCallback(async (payload: RegisterPayload): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const response = await ApiClient.register(payload)
      setAuth(response.user, response.accessToken)
      SocketService.connect()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }, [setAuth, setError, setLoading])

  const logout = useCallback(async (): Promise<void> => {
    try {
      await ApiClient.logout()
    } finally {
      SocketService.disconnect()
      clearAuth()
      setSessionInitialized(true)
    }
  }, [clearAuth, setSessionInitialized])

  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      const response = await ApiClient.refresh()
      setAuth(response.user, response.accessToken)
      SocketService.connect()
    } catch (error) {
      SocketService.disconnect()
      clearAuth()
      throw error
    }
  }, [clearAuth, setAuth])

  useEffect(() => {
    if (!error) return
    const timer = window.setTimeout(() => setError(null), 5000)
    return () => window.clearTimeout(timer)
  }, [error, setError])

  useEffect(() => {
    if (isSessionInitialized || restoreSessionPromise) return

    restoreSessionPromise = (async () => {
      try {
        const response = await ApiClient.refresh()
        setAuth(response.user, response.accessToken)
        SocketService.connect()
      } catch {
        clearAuth()
      } finally {
        setSessionInitialized(true)
        restoreSessionPromise = null
      }
    })()
  }, [clearAuth, isSessionInitialized, setAuth, setSessionInitialized])

  return {
    user,
    isLoading,
    error,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    refreshToken,
  }
}
