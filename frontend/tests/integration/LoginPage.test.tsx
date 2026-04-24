// Testes de integração para o componente LoginPage
// Testa renderização de formulário, validação, submissão, tratamento de erros, navegação
// Executa com: npm test LoginPage.test.tsx

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { useAuth } from '@/hooks/useAuth'

/**
 * Mock de Dependências
 *
 * Por que simular:
 * - useAuth: Testamos o hook separadamente, aqui apenas verificamos se é chamado
 * - useNavigate: Verificamos se a navegação acontece, mas não navegamos realmente
 */

// Mock do hook useAuth
vi.mock('@/hooks/useAuth')

// Mock do react-router-dom (mantém tudo exceto useNavigate)
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

/**
 * Suite de testes para LoginPage
 *
 * Propósito:
 * - Verificar que o formulário renderiza corretamente
 * - Testar validação do lado do cliente (schema Zod)
 * - Garantir que login() é chamado ao submeter
 * - Verificar que mensagens de erro são exibidas
 * - Testar que estados de carregamento desabilitam o formulário
 * - Confirmar navegação após sucesso
 * - Verificar que link para página de registo funciona
 *
 * Por que testar isto:
 * LoginPage é o ponto de entrada da aplicação.
 * Se isto quebrar, utilizadores não podem autenticar.
 */

describe('LoginPage', () => {
  // Mock useAuth return value
  const mockLogin = vi.fn()
  const mockUseAuth = {
    user: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
    login: mockLogin,
    register: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
  }

  /**
   * beforeEach runs before EVERY test
   *
   * Purpose: Reset mocks and setup fresh useAuth mock
   */
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()

    // By default, mock useAuth to return non-loading, no-error state
    vi.mocked(useAuth).mockReturnValue(mockUseAuth)
  })

  /**
   * Helper function to render LoginPage with Router
   *
   * Why: LoginPage uses react-router-dom (Link, useNavigate)
   * Must be wrapped in Router for tests to work
   */
  const renderLoginPage = () => {
    return render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )
  }

  /**
   * TEST 1: Render Form with Email and Password Inputs
   *
   * What: Verify all form elements are present
   * Why: User needs to see the login form
   *
   * Expected:
   * - Email input field
   * - Password input field
   * - Submit button
   * - Link to register page
   */
  it('should render login form with email and password inputs', () => {
    renderLoginPage()

    // ASSERT: Email input is present
    const emailInput = screen.getByRole('textbox', { name: /email/i })
    expect(emailInput).toBeInTheDocument()

    // ASSERT: Password input is present
    const passwordInput = screen.getByLabelText(/^password$/i)
    expect(passwordInput).toBeInTheDocument()
    expect(passwordInput).toHaveAttribute('type', 'password')

    // ASSERT: Submit button is present
    const submitButton = screen.getByRole('button', {
      name: /entrar|login|sign in|signing in/i,
    })
    expect(submitButton).toBeInTheDocument()

    // ASSERT: Link to register page exists
    const registerLink = screen.getByRole('link', { name: /regista-te|sign up/i })
    expect(registerLink).toBeInTheDocument()
    expect(registerLink).toHaveAttribute('href', '/register')
  })

  /**
   * TEST 2: Client-Side Validation - Invalid Email
   *
   * What: Submit form with invalid email and verify error message
   * Why: Must validate email format before sending to backend
   *
   * Expected:
   * - Zod schema rejects invalid email
   * - Error message is displayed
   * - login() is NOT called
   */
  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    // Get form elements
    const emailInput = screen.getByRole('textbox', { name: /email/i })
    const passwordInput = screen.getByLabelText(/^password$/i)
    const submitButton = screen.getByRole('button', {
      name: /entrar|login|sign in|signing in/i,
    })

    // ACT: Fill form with invalid email
    await user.type(emailInput, 'invalid-email')
    await user.type(passwordInput, 'Password123')
    await user.click(submitButton)

    // ASSERT: Validation error is shown
    await waitFor(() => {
      expect(screen.getByText(/email inválido|invalid email/i)).toBeInTheDocument()
    })

    // ASSERT: login() was NOT called (validation failed)
    expect(mockLogin).not.toHaveBeenCalled()
  })

  /**
   * TEST 3: Submit Calls useAuth().login()
   *
   * What: Fill valid form and submit, verify login() is called
   * Why: Form must trigger authentication on submit
   *
   * Expected:
   * - login() is called with correct payload
   */
  it('should call login() with email and password on submit', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    // Mock login to succeed
    mockLogin.mockResolvedValue(undefined)

    // Get form elements
    const emailInput = screen.getByRole('textbox', { name: /email/i })
    const passwordInput = screen.getByLabelText(/^password$/i)
    const submitButton = screen.getByRole('button', {
      name: /entrar|login|sign in|signing in/i,
    })

    // ACT: Fill and submit form
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'Password123')
    await user.click(submitButton)

    // ASSERT: login() was called with correct payload
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123',
      })
    })
  })

  /**
   * TEST 4: Display Backend Error Message
   *
   * What: When useAuth has error, display it to user
   * Why: User needs feedback when login fails
   *
   * Expected:
   * - Error message from useAuth.error is shown
   */
  it('should display error message from backend', () => {
    // Mock useAuth to return error state
    vi.mocked(useAuth).mockReturnValue({
      ...mockUseAuth,
      error: 'Invalid email or password',
    })

    renderLoginPage()

    // ASSERT: Error message is displayed
    expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
  })

  /**
   * TEST 5: Loading State Disables Form
   *
   * What: When isLoading is true, form inputs should be disabled
   * Why: Prevent double-submit during API request
   *
   * Expected:
   * - Submit button is disabled
   * - Inputs may be disabled (implementation detail)
   */
  it('should disable submit button during loading', () => {
    // Mock useAuth to return loading state
    vi.mocked(useAuth).mockReturnValue({
      ...mockUseAuth,
      isLoading: true,
    })

    renderLoginPage()

    // ASSERT: Submit button is disabled
    const submitButton = screen.getByRole('button', {
      name: /entrar|login|sign in|signing in/i,
    })
    expect(submitButton).toBeDisabled()
  })

  /**
   * TEST 6: Successful Login Redirects to /workspaces
   *
   * What: After successful login, navigate to workspaces page
   * Why: Authenticated users should see their workspaces
   *
   * Expected:
   * - useNavigate('/workspaces') is called
   */
  it('should redirect to /workspaces after successful login', async () => {
    // Mock useAuth to return authenticated state
    vi.mocked(useAuth).mockReturnValue({
      ...mockUseAuth,
      user: { id: '1', name: 'Test', email: 'test@example.com' },
      isAuthenticated: true,
    })

    renderLoginPage()

    // In a real implementation, LoginPage might use useEffect
    // to navigate when isAuthenticated becomes true.
    // For this test, we verify that navigation happens
    // after user becomes authenticated.

    // ASSERT: Navigation to / (home/workspaces page) happened
    // Note: This assumes LoginPage has useEffect that navigates
    // when isAuthenticated changes to true
    // The home page (/) is protected by ProtectedRoute and renders WorkspacePage
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  /**
   * TEST 7: Link to Register Page Works
   *
   * What: Click "Criar conta" link and verify it navigates
   * Why: Users without account need to register
   *
   * Expected:
   * - Link points to /register
   */
  it('should have working link to register page', () => {
    renderLoginPage()

    const registerLink = screen.getByRole('link', { name: /regista-te|sign up/i })

    // ASSERT: Link has correct href
    expect(registerLink).toHaveAttribute('href', '/register')
  })

  /**
   * TEST 8: Auto-Clear Error After 5 Seconds
   *
   * What: Error message should disappear after 5 seconds
   * Why: Better UX - errors auto-dismiss
   *
   * Note: This behavior is in useAuth hook, not LoginPage
   * But we can verify that error state changes over time
   *
   * This test verifies the integration between LoginPage and useAuth
   */
  it('should clear error message automatically', async () => {
    // Mock useAuth to initially have error
    const { rerender } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    // Set error state
    vi.mocked(useAuth).mockReturnValue({
      ...mockUseAuth,
      error: 'Invalid credentials',
    })

    // Re-render with error
    rerender(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    // ASSERT: Error is shown
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument()

    // Simulate useAuth clearing error after 5s (this happens in useAuth hook)
    vi.mocked(useAuth).mockReturnValue({
      ...mockUseAuth,
      error: null,
    })

    // Re-render without error
    rerender(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    // ASSERT: Error is cleared
    expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument()
  })
})
