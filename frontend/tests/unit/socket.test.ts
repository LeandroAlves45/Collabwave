import { beforeEach, describe, expect, it, vi } from 'vitest'
import { io } from 'socket.io-client'
import SocketService from '@/services/socket'
import { useAuthStore } from '@/stores/authStore'

vi.mock('socket.io-client', () => ({ io: vi.fn() }))

describe('SocketService', () => {
  const managerHandlers = new Map<string, () => void>()
  const socket = {
    auth: {} as Record<string, string>,
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
    io: {
      on: vi.fn((event: string, handler: () => void) => managerHandlers.set(event, handler)),
      removeAllListeners: vi.fn(),
    },
  }

  beforeEach(() => {
    SocketService.reset()
    vi.clearAllMocks()
    managerHandlers.clear()
    useAuthStore.setState({
      user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      accessToken: 'first-token',
      isSessionInitialized: true,
      isLoading: false,
      error: null,
    })
    vi.mocked(io).mockReturnValue(socket as unknown as ReturnType<typeof io>)
  })

  it('creates a typed connection with the current access token', () => {
    SocketService.connect()

    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: { token: 'first-token' } })
    )
  })

  it('updates socket.auth before a reconnection attempt', () => {
    SocketService.connect()
    useAuthStore.getState().setAccessToken('refreshed-token')
    managerHandlers.get('reconnect_attempt')?.()

    expect(socket.auth).toEqual({ token: 'refreshed-token' })
  })

  it('removes socket and manager listeners on disconnect', () => {
    SocketService.connect()
    SocketService.disconnect()

    expect(socket.removeAllListeners).toHaveBeenCalledOnce()
    expect(socket.io.removeAllListeners).toHaveBeenCalledOnce()
    expect(socket.disconnect).toHaveBeenCalledOnce()
  })
})
