// src/services/socket.ts
// Cliente Socket.io para comunicação em tempo real com o backend.
// Gerencia autenticação JWT, reconexão automática e eventos type-safe.

import { io } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'
import type { Task, TaskWithUsers } from '@/types/task'
import type { AuthUser } from '@/types/auth'

// URL base do Socket.io (variável de ambiente do Vite ou fallback local)
const SOCKET_URL =
  (import.meta as unknown as { env: { VITE_SOCKET_URL: string } }).env?.VITE_SOCKET_URL ||
  'http://localhost:3001'

// ========= INTERFACES DE EVENTOS SOCKET.IO =========

// Eventos que o SERVIDOR EMITE e o frontend ouve
interface ServerToClientEvents {
  // Workspace presence: lista de utilizadores online atualizada
  'workspace:presence_update': (data: { onlineUsers: AuthUser[] }) => void

  // Task criada: nova Task adicionada ao dashboard
  'task:created': (data: { task: Task | TaskWithUsers }) => void

  // Task atualizada: Task existente modificada
  'task:updated': (data: { task: Task | TaskWithUsers }) => void

  // Task movida: Task movida entre colunas ou reordenada
  'task:moved': (data: {
    taskId: string
    targetColumnId: string
    newPosition: number
    movedBy: string
  }) => void

  // Task removida: Task removida do dashboard
  'task:deleted': (data: { taskId: string; deletedBy: string }) => void

  // Notificação: nova notificação para o utilizador
  'notification:new': (data: { notification: unknown }) => void

  // Erro: erro genérico do servidor
  error: (data: { code: string; message: string }) => void
}

// Eventos que o frontend EMITE e o servidor ouve
interface ClientToServerEvents {
  // Entrar numa workspace room para receber atualizações em tempo real
  'workspace:join': (data: { workspaceId: string }) => void

  // Sair de uma workspace room
  'workspace:leave': (data: { workspaceId: string }) => void

  // Criar uma nova Task
  'task:create': (data: {
    workspaceId: string
    columnId: string
    title: string
    description?: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    dueDate?: string
  }) => void

  // Atualizar uma Task existente
  'task:update': (data: { taskId: string; fields: Partial<Task> }) => void

  // Mover uma Task para outra coluna ou posição
  'task:move': (data: {
    taskId: string
    targetColumnId: string
    newPosition: number
  }) => void

  // Remover uma Task
  'task:delete': (data: { taskId: string }) => void
}

/**
 * Classe singleton para gerenciar a conexão Socket.io.
 * Uso:
 *  import SocketService from '@/services/socket'
 *  SocketService.connect()
 *  SocketService.on('task:created', (data) => { ... })
 *  SocketService.emit('workspace:join', { workspaceId: '...' })
 */
class SocketService {
  // Instância única do Socket.io
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private socket: any = null

  // Indica se estamos atualmente conectados ao servidor
  private connected = false

  // Indica se uma conexão já foi iniciada e ainda não terminou
  private connecting = false

  /**
   * Conecta ao servidor Socket.io com autenticação JWT.
   * Chama este método após login bem-sucedido.
   *
   * Comportamento:
   * - Se já conectado, não faz nada
   * - Obtém access token do authStore
   * - Cria conexão com auth via query string
   * - Configura reconexão automática
   *
   * @throws Error se não houver access token (utilizador não autenticado)
   */
  connect(): void {
    // Se já está connectado, não faz nada
    if (this.socket && (this.connected || this.connecting)) {
      console.log('[Socket] Já conectado ou conectando, ignorando connect()')
      return
    }

    // Obter access token do authStore
    const accessToken = useAuthStore.getState().accessToken
    if (!accessToken) {
      throw new Error('Não é possível conectar ao Socket.io sem access token')
    }

    console.log('[Socket] Conectando ao servidor Socket.io')
    this.connecting = true

    // Criar conexão Socket.io com configuração específica
    this.socket = io(SOCKET_URL, {
      // Enviar token JWT como query string para autenticação
      auth: {
        token: accessToken,
      },

      // Transports: WebSocket preferencialmente, fallback para polling
      transports: ['websocket', 'polling'],
      // Reconexão automática habilitada
      reconnection: true,
      // Delay entre tentativas de reconexão
      reconnectionDelay: 1000,
      // Número máximo de tentativas de reconexão
      reconnectionAttempts: Infinity,
    })

    // Registar listeners quando socket está pronto
    // Pequeno delay para garantir que os métodos estão disponíveis
    this.registerListeners()
  }

  /**
   * Registra os event listeners do socket.
   * Chamado automaticamente após criar a conexão.
   */
  private registerListeners(): void {
    // Verificar se socket existe e tem os métodos prontos
    if (!this.socket || typeof this.socket.on !== 'function') {
      // Socket ainda não está pronto, tentar novamente em 50ms
      setTimeout(() => this.registerListeners(), 50)
      return
    }

    try {
      // Evento: conexão bem-sucedida
      this.socket.on('connect', () => {
        console.log('[Socket] Conectado com sucesso:', this.socket?.id)
        this.connected = true
        this.connecting = false
      })

      // Evento: desconexão
      this.socket.on('disconnect', (reason: string) => {
        console.warn('[Socket] Desconectado:', reason)
        this.connected = false
        this.connecting = false

        // Se a desconexão foi forçada pelo servidor, tenta reconectar
        if (reason === 'io server disconnect') {
          console.log('[Socket] Desconexão forçada pelo servidor, reconectando...')
          this.socket?.connect()
        }
      })

      // Evento: erro de conexão
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.socket as any).on('connect_error', (error: Error) => {
        console.error('[Socket] Erro de conexão:', error.message)
        this.connecting = false

        // Se o erro for relacionado à autenticação, limpar authStore
        if (error.message.includes('unauthorized') || error.message.includes('jwt')) {
          console.error('[Socket] Token inválido, limpando autenticação...')
          useAuthStore.getState().clearAuth()
        }
      })

      // Evento: tentativa de reconexão
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.socket as any).on('reconnect_attempt', (attempt: number) => {
        console.log(`[Socket] Tentativa de reconexão #${attempt}`)
        this.connecting = true
      })

      // Evento: reconexão bem-sucedida
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.socket as any).on('reconnect', (attempt: number) => {
        console.log(`[Socket] Reconectado com sucesso após ${attempt} tentativas`)
        this.connected = true
        this.connecting = false
      })

      // Evento: erro genérico do servidor
      this.socket.on('error', (data: unknown) => {
        console.error('[Socket] Erro do servidor:', data)
      })
    } catch {
      // Se houver erro ao registar listeners, tentar novamente em 50ms
      setTimeout(() => this.registerListeners(), 50)
    }
  }

  /**
   * Desconecta do servidor Socket.io.
   * Chama este método ao fazer logout ou quando não precisar mais de updates em tempo real.
   *
   * Comportamento:
   * - Desconecta socket se conectado
   * - Limpa listeners registados
   *
   */
  disconnect(): void {
    if (!this.socket) {
      console.log('[Socket] Não conectado, ignorando disconnect()')
      return
    }

    console.log('[Socket] Desconectando do servidor Socket.io')
    this.socket.disconnect()
    this.socket = null
    this.connected = false
    this.connecting = false
  }

  /**
   * Regista um listener para um evento emitido pelo servidor.
   * Type-safe: TypeScript vai sugerir eventos válidos e estrutura de dados.
   *
   * Exemplo:
   *   SocketService.on('task:created', (data) => {
   *     console.log('Nova task:', data.task)
   *   })
   *
   * @param event - Nome do evento (ex: 'task:created')
   * @param callback - Função a executar quando evento for recebido
   */
  on<E extends keyof ServerToClientEvents>(
    event: E,
    callback: ServerToClientEvents[E]
  ): void {
    if (!this.socket) {
      console.warn(`[Socket] Tentativa de registar listener '${event}' sem conexão`)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket.on(event, callback as any)
    console.log(`[Socket] Listener registado para '${event}'`)
  }

  /**
   * Remove um listener específico de um evento.
   * Útil para limpar listeners quando componente desmonta.
   *
   * Exemplo:
   *   SocketService.off('task:created', callback)
   *
   * @param event - Nome do evento
   * @param callback - Função previamente registada (mesma referência)
   */
  off<E extends keyof ServerToClientEvents>(
    event: E,
    callback: ServerToClientEvents[E]
  ): void {
    if (!this.socket) {
      console.warn(`[Socket] Tentativa de remover listener '${event}' sem conexão`)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket.off(event, callback as any)
    console.log(`[Socket] Listener removido para '${event}'`)
  }

  /**
   * Emite um evento para o servidor.
   * Type-safe: TypeScript valida estrutura do payload.
   *
   * Exemplo:
   *   SocketService.emit('workspace:join', { workspaceId: 'abc-123' })
   *
   * @param event - Nome do evento
   * @param data - Payload do evento (validado por TypeScript)
   */
  emit<E extends keyof ClientToServerEvents>(
    event: E,
    data: Parameters<ClientToServerEvents[E]>[0]
  ): void {
    if (!this.socket) {
      console.warn(`[Socket] Tentativa de emitir evento '${event}' sem conexão ativa`)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.socket as any).emit(event, data)
    console.log(`[Socket] Evento emitido: '${event}' com dados:`, data)
  }

  /**
   * Atalho para entrar numa workspace room.
   * Necessário para receber eventos de tasks dessa workspace.
   *
   * Internamente emite 'workspace:join' com workspaceId.
   *
   * @param workspaceId - ID da workspace a entrar
   */
  joinWorkspace(workspaceId: string): void {
    this.emit('workspace:join', { workspaceId })
  }

  /**
   * Atalho para sair de uma workspace room.
   * Usado quando utilizador navega para outra workspace ou sai da aplicação.
   *
   * Internamente emite 'workspace:leave' com workspaceId.
   *
   * @param workspaceId - ID da workspace a sair
   */
  leaveWorkspace(workspaceId: string): void {
    this.emit('workspace:leave', { workspaceId })
  }

  /**
   * Retorna se a conexão Socket.io está ativa.
   * Útil para mostrar indicador de status na UI.
   *
   * @returns true se conectado, false caso contrário
   */
  isConnected(): boolean {
    return this.connected
  }

  // Método de reset para testes
  reset(): void {
    this.socket = null
    this.connected = false
    this.connecting = false
  }
}

// Exporta instância única (singleton)
export default new SocketService()
