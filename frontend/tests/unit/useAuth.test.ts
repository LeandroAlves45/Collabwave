// Testes unitários para o hook useAuth (hook React customizado para autenticação)
// Testa todos os métodos: login, register, logout, refreshToken
// Testa todos os efeitos: limpeza automática de erros, restauração de sessão, persistência de utilizador
// Executa com: npm test useAuth.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'
import ApiClient from '@/services/api'
import SocketService from '@/services/socket'
import { useAuthStore } from '@/stores/authStore'
import type { AuthUser, AuthResponse } from '@/types/auth'

/**
 * Mock de Dependências Externas
 *
 * Por que simular (mock):
 * - ApiClient: Não queremos requisições HTTP reais em testes unitários
 * - SocketService: Não queremos conexões WebSocket reais
 * - Estes serão testados separadamente nos seus próprios arquivos de teste
 *
 * vi.mock() é movido para o topo do arquivo (executa antes dos imports)
 */

// Mock do ApiClient com todos os métodos de autenticação
vi.mock('@/services/api', () => ({
  default: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}))

// Mock do SocketService para evitar conexões WebSocket reais
vi.mock('@/services/socket', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}))

/**
 * Test Suite for useAuth Hook
 * 
 * Purpose:
 * - Validate authentication flows (login, register, logout, refresh)
 * - Ensure Socket.io connects/disconnects correctly
 * - Test error handling and auto-clearing
 * - Verify session restoration and persistence
 * 
 * Why test this:
 * useAuth is the central piece that orchestrates authentication.
 * Pages and components depend on this hook working correctly.
 */

describe('useAuth', () => {
  // Mock data reused across tests
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

  /**
   * beforeEach runs before EVERY test
   *
   * Purpose: Reset all mocks and state to ensure test isolation
   */
  beforeEach(() => {
    // Clear all mock call history and return values
    vi.clearAllMocks()

    // Reset authStore to initial state
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,
    })

    // Clear localStorage to avoid pollution between tests
    localStorage.clear()
  })


  /**
   * TEST 1: Initial State
   * 
   * What: Verify hook returns correct initial state
   * Why: Components depend on initial state being correct
   * 
   * Expected:
   * - user: null (not authenticated)
   * - isLoading: false (no pending operation)
   * - error: null (no error message)
   * - isAuthenticated: false (derived from user)
   */
  it('should return initial state correctly', () => {
    // renderHook allows us to test React hooks outside of components
    const { result } = renderHook(() => useAuth())

    // Assert all initial values are correct
    expect(result.current.user).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  /**
   * TEST 2: login() - Successful Login
   * 
   * What: Call login() with valid credentials and verify success flow
   * Why: This is the primary authentication method - must work correctly
   * 
   * Flow:
   * 1. ApiClient.login() returns user + tokens
   * 2. authStore is updated with setAuth()
   * 3. SocketService.connect() is called
   * 4. isLoading toggles: false → true → false
   * 
   * Expected:
   * - user and tokens are stored
   * - Socket.io connects
   * - no error is set
   */
  it('should login successfully and connect Socket.io', async () => {
    // Mock ApiClient.login to return successful response
    vi.mocked(ApiClient.login).mockResolvedValue(mockAuthResponse)

    // Render the hook
    const { result } = renderHook(() => useAuth())

    // ACT: Call login method
    await result.current.login({
      email: 'test@example.com',
      password: 'Password123',
    })

    // ASSERT: Verify ApiClient.login was called with correct payload
    expect(ApiClient.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123',
    })

    // ASSERT: Verify user and tokens are stored in authStore
    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    // ASSERT: Verify Socket.io connected
    expect(SocketService.connect).toHaveBeenCalled()

    // ASSERT: Verify no error and loading is false
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  /**
   * TEST 3: login() - Error Handling
   * 
   * What: Call login() with invalid credentials and verify error handling
   * Why: Must show user-friendly error messages when login fails
   * 
   * Expected:
   * - error message is set
   * - user remains null
   * - Socket.io does NOT connect
   */
  it('should handle login error and set error message', async () => {
    // Mock ApiClient.login to reject with error
    const errorMessage = 'Invalid email or password'
    vi.mocked(ApiClient.login).mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useAuth())

    // ACT: Call login with invalid credentials
    await result.current.login({
      email: 'wrong@example.com',
      password: 'WrongPass123',
    })

    // ASSERT: Verify error was set
    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage)
    })

    // ASSERT: Verify user is still null (not authenticated)
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)

    // ASSERT: Verify Socket.io did NOT connect (login failed)
    expect(SocketService.connect).not.toHaveBeenCalled()
  })

  /**
   * TEST 4: login() - Socket.io Connection
   * 
   * What: Verify Socket.io connects AFTER successful login
   * Why: Real-time features require Socket.io connection
   * 
   * This is similar to TEST 2 but focuses specifically on Socket.io
   */
  it('should connect Socket.io after successful login', async () => {
    vi.mocked(ApiClient.login).mockResolvedValue(mockAuthResponse)

    const { result } = renderHook(() => useAuth())

    // ACT: Login
    await result.current.login({
      email: 'test@example.com',
      password: 'Password123',
    })

    // ASSERT: Verify Socket.io connect was called
    await waitFor(() => {
      expect(SocketService.connect).toHaveBeenCalled()
    })
  })

  /**
   * TEST 5: register() - Successful Registration
   * 
   * What: Call register() and verify auto-login after account creation
   * Why: After registration, user should be logged in automatically
   * 
   * Expected:
   * - ApiClient.register() is called
   * - user and tokens are stored (auto-login)
   * - Socket.io connects
   */
  it('should register successfully and auto-login', async () => {
    vi.mocked(ApiClient.register).mockResolvedValue(mockAuthResponse)

    const { result } = renderHook(() => useAuth())

    // ACT: Register new account
    await result.current.register({
      name: 'New User',
      email: 'new@example.com',
      password: 'Password123',
      passwordConfirmation: 'Password123',
    })

    // ASSERT: Verify ApiClient.register was called
    expect(ApiClient.register).toHaveBeenCalledWith({
      name: 'New User',
      email: 'new@example.com',
      password: 'Password123',
      passwordConfirmation: 'Password123',
    })

    // ASSERT: Verify user is authenticated (auto-login)
    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    // ASSERT: Verify Socket.io connected
    expect(SocketService.connect).toHaveBeenCalled()
  })

  /**
   * TEST 6: register() - Error Handling (Email Already Exists)
   * 
   * What: Call register() with existing email and verify error
   * Why: Must inform user if email is already registered
   * 
   * Expected:
   * - error message is set
   * - user remains null
   */
  it('should handle register error (duplicate email)', async () => {
    const errorMessage = 'Email already exists'
    vi.mocked(ApiClient.register).mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useAuth())

    // ACT: Try to register with existing email
    await result.current.register({
      name: 'Test User',
      email: 'existing@example.com',
      password: 'Password123',
      passwordConfirmation: 'Password123',
    })

    // ASSERT: Verify error was set
    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage)
    })

    // ASSERT: Verify user is not authenticated
    expect(result.current.user).toBeNull()
  })

  /**
   * TEST 7: logout() - Revoke Token and Disconnect
   * 
   * What: Call logout() and verify cleanup
   * Why: Logout must clear all authentication state and disconnect Socket.io
   * 
   * Expected:
   * - ApiClient.logout() is called with refreshToken
   * - SocketService.disconnect() is called
   * - authStore is cleared (user, tokens → null)
   */
  it('should logout and disconnect Socket.io', async () => {
    // ARRANGE: First login to have a refreshToken
    useAuthStore.setState({
      user: mockUser,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      isLoading: false,
      error: null,
    })

    vi.mocked(ApiClient.logout).mockResolvedValue()

    const { result } = renderHook(() => useAuth())

    // ACT: Logout
    await result.current.logout()

    // ASSERT: Verify ApiClient.logout was called with refreshToken
    expect(ApiClient.logout).toHaveBeenCalledWith('mock-refresh-token')

    // ASSERT: Verify Socket.io disconnected
    expect(SocketService.disconnect).toHaveBeenCalled()

    // ASSERT: Verify authStore was cleared
    await waitFor(() => {
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  /**
   * TEST 8: logout() - Idempotent (No Error if Already Logged Out)
   * 
   * What: Call logout() when no refreshToken exists
   * Why: Logout should be safe to call multiple times
   * 
   * Expected:
   * - ApiClient.logout() is NOT called (no token to revoke)
   * - SocketService.disconnect() is still called
   * - authStore is cleared
   */
  it('should logout safely when no refreshToken exists', async () => {
    // ARRANGE: No refreshToken (already logged out)
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,
    })

    const { result } = renderHook(() => useAuth())

    // ACT: Logout (idempotent)
    await result.current.logout()

    // ASSERT: Verify ApiClient.logout was NOT called (no token)
    expect(ApiClient.logout).not.toHaveBeenCalled()

    // ASSERT: Verify Socket.io disconnected anyway
    expect(SocketService.disconnect).toHaveBeenCalled()

    // ASSERT: Verify state is clean
    expect(result.current.user).toBeNull()
  })

  /**
   * TEST 9: refreshToken() - Successful Token Rotation
   * 
   * What: Call refreshToken() and verify new tokens are stored
   * Why: Access token expires after ~15 minutes, needs refresh
   * 
   * Expected:
   * - ApiClient.refresh() is called with current refreshToken
   * - New tokens are stored in authStore
   * - User remains the same (not re-fetched)
   */
  it('should refresh tokens successfully', async () => {
    // ARRANGE: Set initial state with refreshToken
    useAuthStore.setState({
      user: mockUser,
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
      isLoading: false,
      error: null,
    })

    // Mock refresh response with new tokens
    const newAuthResponse: AuthResponse = {
      user: mockUser,
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    }
    vi.mocked(ApiClient.refresh).mockResolvedValue(newAuthResponse)

    const { result } = renderHook(() => useAuth())

    // ACT: Refresh tokens
    await result.current.refreshToken()

    // ASSERT: Verify ApiClient.refresh was called
    expect(ApiClient.refresh).toHaveBeenCalledWith('old-refresh-token')

    // ASSERT: Verify new tokens are stored
    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('new-access-token')
    expect(state.refreshToken).toBe('new-refresh-token')
  })

  /**
   * TEST 10: refreshToken() - Force Logout on Error
   * 
   * What: Call refreshToken() when refresh token is invalid/expired
   * Why: If refresh fails, user must be logged out (tokens are invalid)
   * 
   * Expected:
   * - ApiClient.refresh() throws error
   * - logout() is called automatically
   * - authStore is cleared
   */
  it('should force logout when refresh token is invalid', async () => {
    // ARRANGE: Set initial state with expired refreshToken
    useAuthStore.setState({
      user: mockUser,
      accessToken: 'access-token',
      refreshToken: 'expired-refresh-token',
      isLoading: false,
      error: null,
    })

    // Mock refresh to fail (expired token)
    vi.mocked(ApiClient.refresh).mockRejectedValue(new Error('Invalid refresh token'))

    const { result } = renderHook(() => useAuth())

    // ACT: Try to refresh (will fail)
    try {
      await result.current.refreshToken()
    } catch {
      // Expected to throw
    }

    // ASSERT: Verify user was logged out
    await waitFor(() => {
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    // ASSERT: Verify Socket.io disconnected
    expect(SocketService.disconnect).toHaveBeenCalled()
  })

  /**
   * TEST 11: Auto-Clear Errors After 5 Seconds
   * 
   * What: Set an error and verify it's cleared after 5 seconds
   * Why: Errors should auto-dismiss to improve UX
   * 
   * Uses vi.useFakeTimers() to control time
   */
  it('should auto-clear error after 5 seconds', async () => {
    // Mock login to fail (set error)
    vi.mocked(ApiClient.login).mockRejectedValue(new Error('Invalid credentials'))

    const { result } = renderHook(() => useAuth())

    // ACT: Login fails → error is set
    await result.current.login({
      email: 'test@example.com',
      password: 'wrong',
    })

    // ASSERT: Error is set immediately
    await waitFor(() => {
      expect(result.current.error).toBe('Invalid credentials')
    })

    // ACT: Wait for auto-clear (5 seconds)
    // The hook clears error automatically via setTimeout
    await waitFor(
      () => {
        expect(result.current.error).toBeNull()
      },
      { timeout: 6000 }
    )
  })

  /**
   * TEST 12: Restore Session on Mount
   * 
   * What: Verify hook attempts to restore session on initial render
   * Why: User should stay logged in after page reload
   * 
   * Expected:
   * - If refreshToken exists in localStorage, ApiClient.refresh() is called
   * - User and tokens are restored
   */
  it('should restore session from localStorage on mount', async () => {
    // ARRANGE: Simulate existing refreshToken in localStorage
    localStorage.setItem('refreshToken', 'stored-refresh-token')

    // Mock refresh to return user data
    vi.mocked(ApiClient.refresh).mockResolvedValue(mockAuthResponse)

    // ACT: Render hook (triggers useEffect → restore session)
    renderHook(() => useAuth())

    // ASSERT: Verify ApiClient.refresh was called with stored token
    await waitFor(
      () => {
        expect(ApiClient.refresh).toHaveBeenCalledWith('stored-refresh-token')
      },
      { timeout: 6000 }
    )

    // ASSERT: Verify session was restored
    await waitFor(
      () => {
        const state = useAuthStore.getState()
        expect(state.user).toEqual(mockUser)
        expect(state.accessToken).toBe('mock-access-token')
      },
      { timeout: 6000 }
    )

    // ASSERT: Verify Socket.io connected
    await waitFor(
      () => {
        expect(SocketService.connect).toHaveBeenCalled()
      },
      { timeout: 6000 }
    )
  })

  /**
   * TEST 13: Persist User to localStorage
   * 
   * What: Verify user is saved to localStorage when authenticated
   * Why: Needed for session restoration after page reload
   * 
   * Expected:
   * - After login, localStorage.setItem('user', ...) is called
   * - After logout, localStorage.removeItem('user') is called
   */
  it('should persist user to localStorage when authenticated', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

    // Mock successful login
    vi.mocked(ApiClient.login).mockResolvedValue(mockAuthResponse)

    const { result } = renderHook(() => useAuth())

    // ACT: Login
    await result.current.login({
      email: 'test@example.com',
      password: 'Password123',
    })

    // ASSERT: Verify user was persisted to localStorage
    await waitFor(
      () => {
        expect(setItemSpy).toHaveBeenCalledWith('user', JSON.stringify(mockUser))
      },
      { timeout: 6000 }
    )

    // ARRANGE: Spy on removeItem
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')

    // ACT: Logout
    await result.current.logout()

    // ASSERT: Verify user was removed from localStorage
    await waitFor(
      () => {
        expect(removeItemSpy).toHaveBeenCalledWith('user')
      },
      { timeout: 6000 }
    )
  })
})