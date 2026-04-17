// src/services/api.ts
// Cliente HTTP para comunicação com o backend. Todas as requisições passam por aqui.
// Adiciona automaticamente o access token aos headers e trata erros genéricos.

import type { AuthResponse, LoginPayload, RegisterPayload } from '@/types/auth'
import type {
  Workspace,
  CreateWorkspacePayload,
  JoinWorkspacePayload,
  WorkspaceMember,
} from '@/types/workspace'
import type {
  Task,
  CreateTaskPayload,
  UpdateTaskPayload,
  MoveTaskPayload,
} from '@/types/task'
import { useAuthStore } from '@/stores/authStore'

// URL base do backend (variável de ambiente do Vite ou fallback local)
const API_BASE_URL =
  (import.meta as unknown as { env: { VITE_API_URL?: string } }).env?.VITE_API_URL ||
  'http://localhost:3001/api'

// Tipo de resposta padrão do backend
// Todos os endpoints retornam: { status, data: T, message? }
interface ApiResponse<T> {
  status: 'success' | 'error'
  data: T
  message?: string
}

/**
 * Classe com métodos estáticos para requisições HTTP autenticadas.
 * Reutiliza fetch nativo com tratamento de erros centralizado.
 * Todos os endpoints requerem access token (excepto auth/login e auth/register).
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
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown,
    token?: string
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

      // Parse a resposta JSON com tipo genérico
      const result: ApiResponse<T> = await response.json()

      // Se status não é sucesso (2xx), lança erro
      if (!response.ok) {
        // Backend retorna { status, message }
        // Exemplo: { status: 'error', message: 'Invalid email or password' }
        const errorMessage = result.message || `HTTP ${response.status}`
        throw new Error(errorMessage)
      }

      // Retorna dados desembrulhados (result.data contém o payload real)
      return result.data
    } catch (error) {
      // Re-lança erros de rede ou parsing
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown error occurred')
    }
  }

  private static getToken(): string {
    // Access token é armazenado em memória no authStore
    const token = useAuthStore.getState().accessToken
    if (!token) {
      throw new Error('Não autenticado. Por favor, faça login novamente.')
    }
    return token
  }

  // ========== AUTENTICAÇÃO ==========

  /**
   * POST /auth/login
   * Autentica utilizador com email e password.
   * Retorna access token (memória) + refresh token (localStorage).
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
   * Retorna access token + refresh token (registo automático autentica).
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
   * @returns { user, accessToken, refreshToken }
   * @throws Error se refresh token inválido ou expirado
   */
  static async refresh(
    refreshToken: string
  ): Promise<AuthResponse> {
    return this.request<AuthResponse>(
      '/auth/refresh',
      'POST',
      { refreshToken }
    )
  }

  /**
   * POST /auth/logout
   * Revoga refresh token no backend (limpa sessão).
   * Idempotente: não falha se token já expirou.
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

  // ========== WORKSPACES ==========

  /**
   * GET /workspaces
   * Lista todos os workspaces do utilizador autenticado.
   * Cada workspace inclui role do utilizador (owner/admin/member) para controle de UI.
   *
   * @returns Array de workspaces com role
   * @throws Error se falhar (ex: token inválido)
   */
  static async listWorkspaces(): Promise<Array<Workspace & { role: string }>> {
    return this.request<Array<Workspace & { role: string }>>(
      '/workspaces',
      'GET',
      undefined,
      this.getToken()
    )
  }

  /**
   * POST /workspaces
   * Cria um novo workspace.
   * Retorna o workspace criado com role 'owner'.
   *
   * @param payload - { name, description }
   * @returns Workspace criado com role 'owner'
   * @throws Error se falhar (ex: nome já existe)
   */
  static async createWorkspace(
    payload: CreateWorkspacePayload
  ): Promise<Workspace & { role: string }> {
    return this.request<Workspace & { role: string }>(
      '/workspaces',
      'POST',
      payload,
      this.getToken()
    )
  }

  /**
   * POST /workspaces/join
   * Entra em um workspace usando código de convite.
   * Utilizador torna-se membro com role 'member'.
   *
   * @param payload - { inviteCode }
   * @returns Workspace unido com role 'member'
   * @throws Error se código de convite for inválido
   */
  static async joinWorkspace(
    payload: JoinWorkspacePayload
  ): Promise<Workspace & { role: string }> {
    return this.request<Workspace & { role: string }>(
      '/workspaces/join',
      'POST',
      payload,
      this.getToken()
    )
  }

  /**
   * GET /workspaces/:id/members
   * Lista membros de um workspace específico.
   * Requer acesso ao workspace (ser membro).
   *
   * @param workspaceId - ID do workspace
   * @returns Array de membros do workspace
   * @throws Error se workspace não existir ou acesso negado
   */
  static async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return this.request<WorkspaceMember[]>(
      `/workspaces/${workspaceId}/members`,
      'GET',
      undefined,
      this.getToken()
    )
  }

  // ========== TASKS ==========

  /**
   * GET /workspaces/:id/tasks
   * Lista todas as tasks de um workspace.
   * Retorna task organizadas por coluna
   *
   * @param workspaceId - ID do workspace
   * @returns Array de tasks organizadas por coluna
   * @throws Error se workspace não existir ou acesso negado
   */
  static async listTasks(workspaceId: string): Promise<Task[]> {
    return this.request<Task[]>(
      `/workspaces/${workspaceId}/tasks`,
      'GET',
      undefined,
      this.getToken()
    )
  }

  /**
   * POST /workspaces/:id/tasks
   * Cria uma nova task em um workspace.
   * Utilizador criador torna-se proprietário.
   *
   * @param workspaceId - ID do workspace
   * @param payload - { title, description?, priority, columnId }
   * @returns Task criada com detalhes completos
   * @throws Error se falhar (ex: coluna inválida)
   */
  static async createTask(
    workspaceId: string,
    payload: CreateTaskPayload
  ): Promise<Task> {
    return this.request<Task>(
      `/workspaces/${workspaceId}/tasks`,
      'POST',
      payload,
      this.getToken()
    )
  }

  /**
   * PATCH /workspaces/:workspaceId/tasks/:taskId
   * Atualiza detalhes de uma task (título, descrição, etc).
   * Requer ser proprietário ou admin do workspace.
   *
   * @param workspaceId - ID do workspace
   * @param taskId - ID da task a atualizar
   * @param payload - Campos a atualizar (title?, description?, etc)
   * @returns Task atualizada com detalhes completos
   * @throws Error se falhar (ex: task não encontrada, acesso negado)
   */
  static async updateTask(
    workspaceId: string,
    taskId: string,
    payload: UpdateTaskPayload
  ): Promise<Task> {
    return this.request<Task>(
      `/workspaces/${workspaceId}/tasks/${taskId}`,
      'PATCH',
      payload,
      this.getToken()
    )
  }

  /**
   * PATCH /workspaces/:workspaceId/tasks/:taskId/move
   * Move uma task para outra coluna ou posição.
   * Requer ser proprietário ou admin do workspace.
   *
   * @param workspaceId - ID do workspace
   * @param taskId - ID da task a mover
   * @param payload - { targetColumnId, newPosition }
   * @returns Task movida com detalhes completos
   * @throws Error se falhar (ex: coluna alvo inválida, acesso negado)
   */
  static async moveTask(
    workspaceId: string,
    taskId: string,
    payload: MoveTaskPayload
  ): Promise<Task> {
    return this.request<Task>(
      `/workspaces/${workspaceId}/tasks/${taskId}/move`,
      'PATCH',
      payload,
      this.getToken()
    )
  }

  /**
   * DELETE /workspaces/:workspaceId/tasks/:taskId
   * Exclui uma task.
   * Requer ser proprietário ou admin do workspace.
   *
   * @param workspaceId - ID do workspace
   * @param taskId - ID da task a excluir
   * @throws Error se falhar (ex: task não encontrada, acesso negado)
   */
  static async deleteTask(workspaceId: string, taskId: string): Promise<void> {
    await this.request<void>(
      `/workspaces/${workspaceId}/tasks/${taskId}`,
      'DELETE',
      undefined,
      this.getToken()
    )
  }
}

export default ApiClient
