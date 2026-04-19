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
  TaskWithUsers,
  UserInfo,
  Column,
  ColumnWithTasks,
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
  success?: boolean
  data: T
  message?: string
}

type RawRecord = Record<string, unknown>

/**
 * Classe com métodos estáticos para requisições HTTP autenticadas.
 * Reutiliza fetch nativo com tratamento de erros centralizado.
 * Todos os endpoints requerem access token (excepto auth/login e auth/register).
 */
class ApiClient {
  private static normalizeWorkspace<T extends RawRecord>(
    workspace: T,
    fallbackRole?: string
  ): Workspace & { role: string } {
    return {
      id: String(workspace.id),
      name: String(workspace.name),
      description:
        typeof workspace.description === 'string' ? workspace.description : undefined,
      ownerId: String(workspace.ownerId ?? workspace.owner_id ?? ''),
      inviteCode: String(workspace.inviteCode ?? workspace.invite_code ?? ''),
      createdAt: String(workspace.createdAt ?? workspace.created_at ?? ''),
      role: String(workspace.role ?? fallbackRole ?? 'member'),
    }
  }

  private static normalizeColumn(column: RawRecord): Column {
    return {
      id: String(column.id),
      workspaceId: String(column.workspaceId ?? column.workspace_id ?? ''),
      title: String(column.title),
      position: Number(column.position ?? 0),
    }
  }

  private static normalizeUserInfo(value: unknown): UserInfo | undefined {
    if (!value || typeof value !== 'object') return undefined

    const user = value as RawRecord
    if (
      typeof user.id !== 'string' ||
      typeof user.name !== 'string' ||
      typeof user.initials !== 'string'
    ) {
      return undefined
    }

    return {
      id: user.id,
      name: user.name,
      initials: user.initials,
    }
  }

  private static normalizeTask(task: RawRecord): Task | TaskWithUsers {
    const normalized: Task = {
      id: String(task.id),
      columnId: String(task.columnId ?? task.column_id ?? ''),
      title: String(task.title),
      description:
        typeof task.description === 'string' ? task.description : undefined,
      assigneeId:
        typeof (task.assigneeId ?? task.assignee_id) === 'string'
          ? String(task.assigneeId ?? task.assignee_id)
          : undefined,
      priority:
        task.priority === 'low' ||
        task.priority === 'medium' ||
        task.priority === 'high' ||
        task.priority === 'urgent'
          ? task.priority
          : 'medium',
      dueDate:
        typeof (task.dueDate ?? task.due_date) === 'string'
          ? String(task.dueDate ?? task.due_date)
          : undefined,
      position: Number(task.position ?? 0),
      createdAt: String(task.createdAt ?? task.created_at ?? ''),
      updatedAt: String(task.updatedAt ?? task.updated_at ?? ''),
    }

    const createdBy = this.normalizeUserInfo(task.createdBy)
    if (!createdBy) return normalized

    const assignee = this.normalizeUserInfo(task.assignee)
    return {
      ...normalized,
      createdBy,
      ...(assignee ? { assignee } : {}),
    }
  }

  private static normalizeColumnWithTasks(column: RawRecord): ColumnWithTasks {
    const tasks = Array.isArray(column.tasks) ? column.tasks : []

    return {
      ...this.normalizeColumn(column),
      tasks: tasks.map((task) => this.normalizeTask(task as RawRecord)),
    }
  }

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

      // 204 No Content não tem body, retorna void sem parsing
      if (response.status === 204) {
        return undefined as T
      }

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
    const workspaces = await this.request<RawRecord[]>(
      '/workspaces',
      'GET',
      undefined,
      this.getToken()
    )

    return workspaces.map((workspace) => this.normalizeWorkspace(workspace))
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
    const workspace = await this.request<RawRecord>(
      '/workspaces',
      'POST',
      payload,
      this.getToken()
    )

    return this.normalizeWorkspace(workspace, 'owner')
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
    const workspace = await this.request<RawRecord>(
      '/workspaces/join',
      'POST',
      payload,
      this.getToken()
    )

    return this.normalizeWorkspace(workspace, 'member')
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
   * GET /workspaces/:id/columns
   * Lista todas as colunas de um workspace.
   * Retorna colunas com seus títulos e posições.
   *
   * @param workspaceId - ID do workspace
   * @returns Array de colunas do workspace
   * @throws Error se workspace não existir ou acesso negado
   */
  static async getColumns(workspaceId: string): Promise<Column[]> {
    const columns = await this.request<RawRecord[]>(
      `/workspaces/${workspaceId}/columns`,
      'GET',
      undefined,
      this.getToken()
    )

    return columns.map((column) => this.normalizeColumn(column))
  }

  static async createColumn(
    workspaceId: string,
    payload: { title: string }
  ): Promise<Column> {
    const column = await this.request<RawRecord>(
      `/workspaces/${workspaceId}/columns`,
      'POST',
      payload,
      this.getToken()
    )

    return this.normalizeColumn(column)
  }

  static async deleteColumn(workspaceId: string, columnId: string): Promise<void> {
    await this.request<void>(
      `/workspaces/${workspaceId}/columns/${columnId}`,
      'DELETE',
      undefined,
      this.getToken()
    )
  }

  /**
   * GET /workspaces/:id/tasks
   * Lista todas as tasks de um workspace.
   * Retorna task organizadas por coluna
   *
   * @param workspaceId - ID do workspace
   * @returns Array de tasks organizadas por coluna
   * @throws Error se workspace não existir ou acesso negado
   */
  static async listTaskColumns(workspaceId: string): Promise<ColumnWithTasks[]> {
    const columns = await this.request<RawRecord[]>(
      `/workspaces/${workspaceId}/tasks`,
      'GET',
      undefined,
      this.getToken()
    )

    return columns.map((column) => this.normalizeColumnWithTasks(column))
  }

  static async listTasks(workspaceId: string): Promise<(Task | TaskWithUsers)[]> {
    const columns = await this.listTaskColumns(workspaceId)

    return columns.flatMap((column) => column.tasks)
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
  ): Promise<Task | TaskWithUsers> {
    const task = await this.request<RawRecord>(
      `/workspaces/${workspaceId}/tasks`,
      'POST',
      payload,
      this.getToken()
    )

    return this.normalizeTask(task)
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
  ): Promise<Task | TaskWithUsers> {
    const task = await this.request<RawRecord>(
      `/workspaces/${workspaceId}/tasks/${taskId}`,
      'PATCH',
      payload,
      this.getToken()
    )

    return this.normalizeTask(task)
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
    const task = await this.request<RawRecord>(
      `/workspaces/${workspaceId}/tasks/${taskId}/move`,
      'PATCH',
      payload,
      this.getToken()
    )

    return this.normalizeTask(task)
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
