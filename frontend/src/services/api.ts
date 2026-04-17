// src/services/api.ts
// Cliente HTTP para comunicação com o backend. Todas as requisições passam por aqui.
// Adiciona automaticamente o access token aos headers e trata erros genéricos.

import type { AuthResponse, LoginPayload, RegisterPayload } from '../types/auth'

// URL base do backend (variável de ambiente do Vite ou fallback local)
const API_BASE_URL = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env?.VITE_API_URL || 'http://localhost:3000/api'

/**
 * Classe com métodos estáticos para requisições HTTP autenticadas.
 * Reutiliza fetch nativo com tratamento de erros centralizado.
 */
class ApiClient {
  /**
   * Método auxiliar privado para fazer requisições HTTP.
   * Adiciona automaticamente:
   * - Content-Type: application/json
   * - Authorization header (se token existe)
   *
   * @param endpoint - URL relativa (ex: /auth/login)
   * @param method - Método HTTP (GET, POST, etc)
   * @param body - Dados para enviar (opcional)
   * @param token - Access token para autorização (opcional)
   * @returns Resposta JSON parseada
   * @throws Error se resposta não for sucesso
   */
  private static async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown,
    token?: string,
  ): Promise<T> {
    // Constrói a URL completa
    const url = `${API_BASE_URL}${endpoint}`

    // Headers padrão: sempre JSON
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Adiciona token de autenticação se existe
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    try {
      // Faz a requisição
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })

      // Parse a resposta JSON
      const data = await response.json()

      // Se status não é sucesso (2xx), lança erro
      if (!response.ok) {
        // Backend retorna { status, message, code }
        // Exemplo: { status: 'error', message: 'Invalid email or password' }
        const errorMessage = data.message || data.error || `HTTP ${response.status}`
        throw new Error(errorMessage)
      }

      // Retorna dados da resposta (data.data contém o payload real)
      return data.data as T
    } catch (error) {
      // Re-lança erros de rede ou parsing
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown error occurred')
    }
  }

  /**
   * POST /auth/login
   * Autentica utilizador com email e password.
   *
   * @param payload - { email, password }
   * @returns { user, accessToken, refreshToken }
   * @throws Error com mensagem do backend se falhar
   */
  static async login(payload: LoginPayload): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', 'POST', payload)
  }

  /**
   * POST /auth/register
   * Cria nova conta de utilizador.
   *
   * @param payload - { name, email, password }
   * @returns { user, accessToken, refreshToken }
   * @throws Error se email já existe (409) ou validação falha (400)
   */
  static async register(payload: RegisterPayload): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', 'POST', payload)
  }

  /**
   * POST /auth/refresh
   * Obtém novo access token usando refresh token.
   * Chamado automaticamente quando access token expira.
   *
   * @param refreshToken - Refresh token armazenado
   * @returns { accessToken, refreshToken }
   * @throws Error se refresh token inválido ou expirado
   */
  static async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    return this.request<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      'POST',
      { refreshToken },
    )
  }

  /**
   * POST /auth/logout
   * Revoga refresh token no backend (limpa sessão).
   *
   * @param refreshToken - Refresh token a revogar
   */
  static async logout(refreshToken: string): Promise<void> {
    // Logout é idempotente: não falha mesmo se token já expirou
    try {
      await this.request<void>('/auth/logout', 'POST', { refreshToken })
    } catch {
      // Ignora erros (token já expirado é OK)
    }
  }
}

export default ApiClient
