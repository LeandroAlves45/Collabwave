import { create } from 'zustand'
import type { AuthUser } from '../types/auth'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isSessionInitialized: boolean
  isLoading: boolean
  error: string | null
  setAuth: (user: AuthUser, accessToken: string) => void
  clearAuth: () => void
  setAccessToken: (token: string) => void
  setSessionInitialized: (initialized: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isSessionInitialized: false,
  isLoading: false,
  error: null,
  // O refresh token nunca fica acessível a JavaScript; o browser gere o cookie.
  setAuth: (user, accessToken) =>
    set({ user, accessToken, error: null, isSessionInitialized: true }),
  clearAuth: () => set({ user: null, accessToken: null, error: null }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setSessionInitialized: (isSessionInitialized) => set({ isSessionInitialized }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
