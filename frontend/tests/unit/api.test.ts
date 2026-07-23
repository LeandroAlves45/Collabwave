import { beforeEach, describe, expect, it, vi } from 'vitest'
import ApiClient from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

const user = { id: 'user-1', name: 'Test User', email: 'test@example.com' }
const session = { user, accessToken: 'new-access-token' }

function response(status: number, data?: unknown, message?: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(
      data === undefined
        ? { status: 'error', message }
        : { status: 'success', data }
    ),
  } as unknown as Response
}

describe('ApiClient authentication', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useAuthStore.setState({
      user,
      accessToken: 'old-access-token',
      isSessionInitialized: true,
      isLoading: false,
      error: null,
    })
  })

  it('uses relative REST paths and includes HttpOnly cookie credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, session))
    vi.stubGlobal('fetch', fetchMock)

    await ApiClient.login({ email: user.email, password: 'Password123' })

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'Password123' }),
      credentials: 'include',
    })
  })

  it('refreshes once for concurrent 401 responses and retries each request once', async () => {
    let refreshCalls = 0
    const attempts = new Map<string, number>()
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/auth/refresh') {
        refreshCalls += 1
        return response(200, session)
      }

      const count = attempts.get(url) ?? 0
      attempts.set(url, count + 1)
      return count === 0 ? response(401, undefined, 'Expired') : response(200, [])
    })
    vi.stubGlobal('fetch', fetchMock)

    await Promise.all([ApiClient.listWorkspaces(), ApiClient.getColumns('workspace-1')])

    expect(refreshCalls).toBe(1)
    expect(attempts.get('/api/workspaces')).toBe(2)
    expect(attempts.get('/api/workspaces/workspace-1/columns')).toBe(2)
    expect(useAuthStore.getState().accessToken).toBe('new-access-token')
  })

  it('does not recursively refresh an authentication endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(401, undefined, 'Invalid'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(ApiClient.refresh()).rejects.toThrow('Invalid')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('sends logout without a token body and remains idempotent', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(401, undefined, 'Missing'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(ApiClient.logout()).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: undefined,
      credentials: 'include',
    })
  })
})
