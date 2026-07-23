import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/authStore'

const user = { id: 'user-1', name: 'Test User', email: 'test@example.com' }

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isSessionInitialized: false,
      isLoading: false,
      error: null,
    })
  })

  it('keeps authentication exclusively in memory', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    useAuthStore.getState().setAuth(user, 'access-token')

    expect(useAuthStore.getState()).toMatchObject({
      user,
      accessToken: 'access-token',
      isSessionInitialized: true,
    })
    expect(setItem).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
  })

  it('clears the in-memory session without touching localStorage', () => {
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem')
    useAuthStore.getState().setAuth(user, 'access-token')
    useAuthStore.getState().clearAuth()

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(removeItem).not.toHaveBeenCalled()
  })

  it('updates loading, errors and the access token independently', () => {
    useAuthStore.getState().setAuth(user, 'old-token')
    useAuthStore.getState().setAccessToken('new-token')
    useAuthStore.getState().setLoading(true)
    useAuthStore.getState().setError('failure')

    expect(useAuthStore.getState()).toMatchObject({
      user,
      accessToken: 'new-token',
      isLoading: true,
      error: 'failure',
    })
  })
})
