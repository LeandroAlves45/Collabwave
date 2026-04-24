// Testes unitários para o ApiClient (cliente HTTP para comunicação com o backend)
// Testa todos os métodos: autenticação, workspaces, tarefas
// Testa o comportamento de request(): cabeçalhos, tratamento de erros, extração de dados
// Executa com: npm test api.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest'
import ApiClient from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import type { AuthUser, AuthResponse, LoginPayload, RegisterPayload } from '@/types/auth'
import type { Workspace, CreateWorkspacePayload } from '@/types/workspace'
import type { Task, Column } from '@/types/task'

/**
 * Mock do authStore
 *
 * Por que:
 * - ApiClient.getToken() lê de useAuthStore.getState()
 * - Precisamos controlar qual token é devolvido nos testes
 */
vi.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: vi.fn(),
    setState: vi.fn(),
  },
}))

/**
 * Suite de testes para o ApiClient
 *
 * Propósito:
 * - Validar que requisições HTTP são feitas corretamente (URL, método, cabeçalhos, corpo)
 * - Garantir que o token de autenticação é adicionado quando necessário
 * - Verificar que o tratamento de erros extrai mensagens de erro do backend
 * - Testar todos os métodos públicos (autenticação, workspaces, tarefas)
 *
 * Por que testar isto:
 * ApiClient é o único ponto de comunicação com o backend.
 * Se as requisições forem malformadas, toda a app quebra.
 */

describe('ApiClient', () => {
  // Mock fetch function
  let mockFetch: ReturnType<typeof vi.fn>

  // API base URL (from api.ts)
  const API_BASE_URL = 'http://localhost:3001/api'

  // Mock data for tests
  const mockUser: AuthUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  }

  const mockAuthResponse: AuthResponse = {
    user: mockUser,
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  }

  const mockWorkspace: Workspace & { role: string } = {
    id: 'workspace-123',
    name: 'Test Workspace',
    description: 'Test Description',
    ownerId: 'user-123',
    inviteCode: 'ABC123',
    createdAt: new Date().toISOString(),
    role: 'owner',
  }

  const mockColumn: Column = {
    id: 'column-123',
    workspaceId: 'workspace-123',
    title: 'To Do',
    position: 0,
  }

  const mockTask: Task = {
    id: 'task-123',
    columnId: 'column-123',
    title: 'Test Task',
    description: 'Test Description',
    priority: 'medium',
    position: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  /**
   * beforeEach runs before EVERY test
   * 
   * Purpose: Reset mocks and setup fresh fetch mock
   */
  beforeEach(() => {
    vi.clearAllMocks()

    // Create a fresh mock for fetch
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    // By default, mock authStore to return a valid token
    // Individual tests can override this
    vi.mocked(useAuthStore.getState).mockReturnValue({
      user: mockUser,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      isLoading: false,
      error: null,
      setAuth: vi.fn(),
      clearAuth: vi.fn(),
      setAccessToken: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
    })
  })

  /**
   * TEST 1: request() Adds Authorization Header When Token Provided
   * 
   * What: Verify that Authorization header is added when token exists
   * Why: Protected endpoints require Bearer token
   * 
   * Expected:
   * - fetch is called with Authorization: Bearer <token>
   */
  it('should add Authorization header when token is provided', async () => {
    // Mock successful response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: [] }),
    })

    // ACT: Call a method that requires token (listWorkspaces)
    await ApiClient.listWorkspaces()

    // ASSERT: Verify fetch was called with Authorization header
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/workspaces`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-access-token',
        }),
      })
    )
  })

  /**
   * TEST 2: request() Does NOT Add Authorization Header for login/register
   * 
   * What: Verify that login/register don't send Authorization header
   * Why: These endpoints are public (user not authenticated yet)
   * 
   * Expected:
   * - fetch is called WITHOUT Authorization header
   */
  it('should not add Authorization header for login', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: mockAuthResponse }),
    })

    const loginPayload: LoginPayload = {
      email: 'test@example.com',
      password: 'Password123',
    }

    // ACT: Call login (public endpoint)
    await ApiClient.login(loginPayload)

    // ASSERT: Verify fetch was called WITHOUT Authorization header
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/auth/login`,
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header
        },
      })
    )
  })

  /**
   * TEST 3: request() Throws Error When response.ok = false
   * 
   * What: Verify that non-2xx responses throw errors
   * Why: Must handle backend errors (401, 404, 500, etc)
   * 
   * Expected:
   * - Error is thrown with backend error message
   */
  it('should throw error when response is not ok', async () => {
    // Mock failed response (401 Unauthorized)
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        status: 'error',
        message: 'Invalid email or password',
      }),
    })

    const loginPayload: LoginPayload = {
      email: 'wrong@example.com',
      password: 'WrongPass',
    }

    // ACT & ASSERT: Verify error is thrown
    await expect(ApiClient.login(loginPayload)).rejects.toThrow('Invalid email or password')
  })

  /**
   * TEST 4: request() Extracts result.data Correctly
   * 
   * What: Verify that response JSON is parsed and data is extracted
   * Why: Backend wraps responses in { status, data, message }
   * 
   * Expected:
   * - Return value is result.data (not full response)
   */
  it('should extract data from response correctly', async () => {
    // Mock response with nested data
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        data: [mockWorkspace],
      }),
    })

    // ACT: Call listWorkspaces
    const result = await ApiClient.listWorkspaces()

    // ASSERT: Verify result is the extracted data
    expect(result).toEqual([mockWorkspace])
  })

  /**
   * TEST 5: login() - POST /auth/login
   * 
   * What: Verify login makes correct HTTP request
   * Why: Login is the primary authentication method
   * 
   * Expected:
   * - POST to /auth/login
   * - Body contains { email, password }
   * - Returns AuthResponse
   */
  it('should make POST request to /auth/login', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: mockAuthResponse }),
    })

    const loginPayload: LoginPayload = {
      email: 'test@example.com',
      password: 'Password123',
    }

    // ACT: Login
    const result = await ApiClient.login(loginPayload)

    // ASSERT: Verify fetch was called correctly
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload),
      }
    )

    // ASSERT: Verify return value is correct
    expect(result).toEqual(mockAuthResponse)
  })

  /**
   * TEST 6: register() - POST /auth/register
   * 
   * What: Verify register makes correct HTTP request
   * Why: User account creation must work
   * 
   * Expected:
   * - POST to /auth/register
   * - Body contains { name, email, password, passwordConfirmation }
   */
  it('should make POST request to /auth/register', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: mockAuthResponse }),
    })

    const registerPayload: RegisterPayload = {
      name: 'New User',
      email: 'new@example.com',
      password: 'Password123',
      passwordConfirmation: 'Password123',
    }

    // ACT: Register
    const result = await ApiClient.register(registerPayload)

    // ASSERT: Verify fetch was called correctly
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/auth/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerPayload),
      }
    )

    expect(result).toEqual(mockAuthResponse)
  })

  /**
   * TEST 7: logout() - POST /auth/logout (Idempotent)
   * 
   * What: Verify logout is idempotent (doesn't throw on error)
   * Why: Logout should always succeed locally even if backend fails
   * 
   * Expected:
   * - POST to /auth/logout with refreshToken
   * - Does NOT throw error even if backend fails
   */
  it('should make POST request to /auth/logout and handle errors gracefully', async () => {
    // Mock logout to fail (token already revoked)
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ status: 'error', message: 'Token already revoked' }),
    })

    const refreshToken = 'mock-refresh-token'

    // ACT: Logout (should NOT throw)
    await expect(ApiClient.logout(refreshToken)).resolves.toBeUndefined()

    // ASSERT: Verify fetch was called
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/auth/logout`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }
    )
  })

  /**
   * TEST 8: refresh() - POST /auth/refresh
   * 
   * What: Verify refresh token rotation works
   * Why: Access tokens expire, need refresh mechanism
   * 
   * Expected:
   * - POST to /auth/refresh with refreshToken
   * - Returns new user + tokens
   */
  it('should make POST request to /auth/refresh', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: mockAuthResponse }),
    })

    const refreshToken = 'old-refresh-token'

    // ACT: Refresh
    const result = await ApiClient.refresh(refreshToken)

    // ASSERT: Verify fetch was called correctly
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/auth/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }
    )

    expect(result).toEqual(mockAuthResponse)
  })

  /**
   * TEST 9: listWorkspaces() - GET /workspaces
   * 
   * What: Verify workspace listing includes token
   * Why: User workspaces are protected resource
   * 
   * Expected:
   * - GET to /workspaces with Authorization header
   */
  it('should make GET request to /workspaces with token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: [mockWorkspace] }),
    })

    // ACT: List workspaces
    const result = await ApiClient.listWorkspaces()

    // ASSERT: Verify fetch was called with token
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/workspaces`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-access-token',
        },
        body: undefined,
      }
    )

    expect(result).toEqual([mockWorkspace])
  })

  /**
   * TEST 10: createWorkspace() - POST /workspaces
   * 
   * What: Verify workspace creation sends correct payload
   * Why: Users need to create workspaces
   * 
   * Expected:
   * - POST to /workspaces with name + description
   */
  it('should make POST request to /workspaces', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: mockWorkspace }),
    })

    const createPayload: CreateWorkspacePayload = {
      name: 'New Workspace',
      description: 'New Description',
    }

    // ACT: Create workspace
    const result = await ApiClient.createWorkspace(createPayload)

    // ASSERT: Verify fetch was called correctly
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/workspaces`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-access-token',
        },
        body: JSON.stringify(createPayload),
      }
    )

    expect(result).toEqual(mockWorkspace)
  })

  /**
   * TEST 11: getColumns() - GET /workspaces/:id/columns
   * 
   * What: Verify columns are fetched for a workspace
   * Why: Board view needs columns structure
   * 
   * Expected:
   * - GET to /workspaces/:id/columns
   */
  it('should make GET request to /workspaces/:id/columns', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: [mockColumn] }),
    })

    const workspaceId = 'workspace-123'

    // ACT: Get columns
    const result = await ApiClient.getColumns(workspaceId)

    // ASSERT: Verify fetch was called with correct URL
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/workspaces/${workspaceId}/columns`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-access-token',
        },
        body: undefined,
      }
    )

    expect(result).toEqual([mockColumn])
  })

  /**
   * TEST 12: listTasks() - GET /workspaces/:id/tasks
   * 
   * What: Verify tasks are fetched for a workspace
   * Why: Board view needs to display tasks
   * 
   * Expected:
   * - GET to /workspaces/:id/tasks
   */
  it('should make GET request to /workspaces/:id/tasks', async () => {
    const mockTaskColumn = {
      ...mockColumn,
      tasks: [mockTask],
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: [mockTaskColumn] }),
    })

    const workspaceId = 'workspace-123'

    // ACT: List tasks
    const result = await ApiClient.listTasks(workspaceId)

    // ASSERT: Verify fetch was called with correct URL
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/workspaces/${workspaceId}/tasks`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-access-token',
        },
        body: undefined,
      }
    )

    expect(result).toEqual([mockTask])
  })

  /**
   * TEST 13: Error Handling - Extract Backend Message
   * 
   * What: Verify that backend error messages are extracted correctly
   * Why: User needs to see meaningful error messages
   * 
   * Expected:
   * - Error thrown contains backend message
   * - If no message, falls back to HTTP status
   */
  it('should extract error message from backend response', async () => {
    // Mock backend error with custom message
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        status: 'error',
        message: 'Email already exists',
      }),
    })

    const registerPayload: RegisterPayload = {
      name: 'Test User',
      email: 'existing@example.com',
      password: 'Password123',
      passwordConfirmation: 'Password123',
    }

    // ACT & ASSERT: Verify error message is extracted
    await expect(ApiClient.register(registerPayload)).rejects.toThrow('Email already exists')

    // Test fallback to HTTP status when no message
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        status: 'error',
        // No message field
      }),
    })

    await expect(ApiClient.login({ email: 'test@example.com', password: 'test' }))
      .rejects.toThrow('HTTP 500')
  })
})
