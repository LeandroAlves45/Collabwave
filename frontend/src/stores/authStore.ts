// src/stores/authStore.ts
// Store de autenticação com Zustand. Mantém o estado do utilizador, tokens e erros.

import { create } from 'zustand'
import type { AuthUser } from '../types/auth'

interface AuthState {
  // Estado do utilizador: null = não autenticado
  user: AuthUser | null

  // Access token em memória (nunca em localStorage por segurança)
  accessToken: string | null

  // Refresh token armazenado em localStorage (permite persistência entre sessões)
  refreshToken: string | null

  // Estado de carregamento (true durante requisição HTTP)
  isLoading: boolean

  // Mensagem de erro (mostrada ao utilizador se login falhar)
  error: string | null

  // ========== AÇÕES ==========

  // Atualiza o utilizador e tokens após login/registo bem-sucedido
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void

  // Limpa o estado: utilizado após logout ou expiração de sessão
  clearAuth: () => void

  // Atualiza o access token (após refresh bem-sucedido)
  setAccessToken: (token: string) => void

  // Define estado de carregamento (mostrado ao utilizador na UI)
  setLoading: (loading: boolean) => void

  // Define mensagem de erro (deve ser mostrada e limpa após 5s)
  setError: (error: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  // ========== ESTADO INICIAL ==========
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  error: null,

  // ========== AÇÕES ==========

  // Chamada após login/registo bem-sucedido
  // Armazena utilizador, access token em memória e refresh token em localStorage
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string): void => {
    // Persiste refresh token para recuperar sessão após recarregar página
    localStorage.setItem('refreshToken', refreshToken)
    set({ user, accessToken, refreshToken, error: null })
  },

  // Limpa toda a autenticação (logout ou sessão expirada)
  clearAuth: (): void => {
    localStorage.removeItem('refreshToken')
    set({ user: null, accessToken: null, refreshToken: null, error: null })
  },

  // Atualiza access token (chamado quando refresh token é usado)
  setAccessToken: (token: string): void => set({ accessToken: token }),

  // Define se está a fazer requisição HTTP (mostra spinner/desativa botões)
  setLoading: (loading: boolean): void => set({ isLoading: loading }),

  // Define mensagem de erro para mostrar ao utilizador
  setError: (error: string | null): void => set({ error }),
}))