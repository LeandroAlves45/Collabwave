import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'
import type { Task, TaskWithUsers } from '@/types/task'
import type { AuthUser } from '@/types/auth'

const SOCKET_URL =
  (import.meta as unknown as { env: { VITE_SOCKET_URL?: string } }).env
    ?.VITE_SOCKET_URL || window.location.origin

interface ServerToClientEvents {
  'workspace:presence_update': (data: { onlineUsers: AuthUser[] }) => void
  'task:created': (data: { task: Task | TaskWithUsers }) => void
  'task:updated': (data: { task: Task | TaskWithUsers }) => void
  'task:moved': (data: {
    taskId: string
    targetColumnId: string
    newPosition: number
    movedBy: string
  }) => void
  'task:deleted': (data: { taskId: string; deletedBy: string }) => void
  error: (data: { code: string; message: string }) => void
}

interface ClientToServerEvents {
  'workspace:join': (data: { workspaceId: string }) => void
  'workspace:leave': (data: { workspaceId: string }) => void
  'task:create': (data: {
    workspaceId: string
    columnId: string
    title: string
    description?: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    dueDate?: string
  }) => void
  'task:update': (data: { taskId: string; fields: Partial<Task> }) => void
  'task:move': (data: {
    taskId: string
    targetColumnId: string
    newPosition: number
  }) => void
  'task:delete': (data: { taskId: string }) => void
}

type CollabWaveSocket = Socket<ServerToClientEvents, ClientToServerEvents>

class SocketService {
  private socket: CollabWaveSocket | null = null

  connect(): void {
    const accessToken = useAuthStore.getState().accessToken
    if (!accessToken) {
      throw new Error('Não é possível ligar o Socket.IO sem access token')
    }

    if (this.socket) {
      this.socket.auth = { token: accessToken }
      if (!this.socket.connected) this.socket.connect()
      return
    }

    this.socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    }) as CollabWaveSocket

    this.socket.on('connect_error', (error) => {
      if (
        error.message.toLowerCase().includes('unauthorized') ||
        error.message.toLowerCase().includes('jwt')
      ) {
        useAuthStore.getState().clearAuth()
      }
    })

    // O Manager emite reconnect_attempt. Atualizar aqui evita reutilizar um JWT
    // expirado quando a ligação cai depois de um refresh HTTP.
    this.socket.io.on('reconnect_attempt', () => {
      const latestToken = useAuthStore.getState().accessToken
      this.socket!.auth = { token: latestToken ?? '' }
    })
  }

  disconnect(): void {
    if (!this.socket) return
    this.socket.removeAllListeners()
    this.socket.io.removeAllListeners()
    this.socket.disconnect()
    this.socket = null
  }

  on<E extends keyof ServerToClientEvents>(
    event: E,
    callback: ServerToClientEvents[E]
  ): void {
    const socket = this.socket
    if (!socket) return
    const addListener = socket.on as (
      name: E,
      listener: ServerToClientEvents[E]
    ) => CollabWaveSocket
    addListener.call(socket, event, callback)
  }

  off<E extends keyof ServerToClientEvents>(
    event: E,
    callback: ServerToClientEvents[E]
  ): void {
    const socket = this.socket
    if (!socket) return
    const removeListener = socket.off as (
      name: E,
      listener: ServerToClientEvents[E]
    ) => CollabWaveSocket
    removeListener.call(socket, event, callback)
  }

  emit<E extends keyof ClientToServerEvents>(
    event: E,
    data: Parameters<ClientToServerEvents[E]>[0]
  ): void {
    const socket = this.socket
    if (!socket) return
    const emitEvent = socket.emit as (
      name: E,
      payload: Parameters<ClientToServerEvents[E]>[0]
    ) => CollabWaveSocket
    emitEvent.call(socket, event, data)
  }

  joinWorkspace(workspaceId: string): void {
    this.emit('workspace:join', { workspaceId })
  }

  leaveWorkspace(workspaceId: string): void {
    this.emit('workspace:leave', { workspaceId })
  }

  isConnected(): boolean {
    return Boolean(this.socket?.connected)
  }

  // 'connect'/'disconnect' são eventos nativos do socket.io-client, fora do
  // mapa tipado ServerToClientEvents — expostos à parte para o indicador de
  // ligação da UI. Devolve uma função de unsubscribe.
  onConnectionChange(callback: (connected: boolean) => void): () => void {
    const socket = this.socket
    if (!socket) return () => {}

    const handleConnect = () => callback(true)
    const handleDisconnect = () => callback(false)

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
    }
  }

  reset(): void {
    this.disconnect()
  }
}

export default new SocketService()
