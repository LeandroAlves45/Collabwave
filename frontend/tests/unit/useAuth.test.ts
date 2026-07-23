import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'
import ApiClient from '@/services/api'
import SocketService from '@/services/socket'
import { useAuthStore } from '@/stores/authStore'

vi.mock('@/services/api', () => ({
  default: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}))

vi.mock('@/services/socket', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}))

const user = { id: 'user-1', name: 'Test User', email: 'test@example.com' }
const session = { user, accessToken: 'access-token' }

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isSessionInitialized: true,
      isLoading: false,
      error: null,
    })
  })

  it('logs in, stores only the access session and connects Socket.IO', async () => {
    vi.mocked(ApiClient.login).mockResolvedValue(session)
    const { result } = renderHook(() => useAuth())

    await result.current.login({ email: user.email, password: 'Password123' })

    expect(useAuthStore.getState()).toMatchObject({ user, accessToken: 'access-token' })
    expect(SocketService.connect).toHaveBeenCalledOnce()
    expect(localStorage.length).toBe(0)
  })

  it('registers and connects Socket.IO', async () => {
    vi.mocked(ApiClient.register).mockResolvedValue(session)
    const { result } = renderHook(() => useAuth())

    await result.current.register({
      name: user.name,
      email: user.email,
      password: 'Password123',
    })

    expect(useAuthStore.getState().user).toEqual(user)
    expect(SocketService.connect).toHaveBeenCalledOnce()
  })

  it('always clears state and disconnects when logging out', async () => {
    useAuthStore.getState().setAuth(user, 'access-token')
    vi.mocked(ApiClient.logout).mockRejectedValue(new Error('network'))
    const { result } = renderHook(() => useAuth())

    await expect(result.current.logout()).rejects.toThrow('network')

    expect(useAuthStore.getState().user).toBeNull()
    expect(SocketService.disconnect).toHaveBeenCalledOnce()
  })

  it('restores a session from the cookie without reading localStorage', async () => {
    useAuthStore.setState({ isSessionInitialized: false })
    vi.mocked(ApiClient.refresh).mockResolvedValue(session)
    renderHook(() => useAuth())

    await waitFor(() => expect(useAuthStore.getState().user).toEqual(user))
    expect(ApiClient.refresh).toHaveBeenCalledWith()
    expect(SocketService.connect).toHaveBeenCalledOnce()
    expect(localStorage.length).toBe(0)
  })

  it('clears auth and disconnects when an explicit refresh fails', async () => {
    useAuthStore.getState().setAuth(user, 'expired-token')
    vi.mocked(ApiClient.refresh).mockRejectedValue(new Error('expired'))
    const { result } = renderHook(() => useAuth())

    await expect(result.current.refreshToken()).rejects.toThrow('expired')
    expect(useAuthStore.getState().user).toBeNull()
    expect(SocketService.disconnect).toHaveBeenCalledOnce()
  })
})
