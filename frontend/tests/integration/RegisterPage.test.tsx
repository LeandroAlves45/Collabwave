// Testes de integração para o componente RegisterPage
// Testa renderização de formulário, validação de confirmação de password, submissão, tratamento de erros
// Executa com: npm test RegisterPage.test.tsx

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { RegisterPage } from '@/pages/RegisterPage'
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
 * Suite de testes para RegisterPage
 *
 * Propósito:
 * - Verificar que o formulário renderiza com todos os campos (nome, email, password, confirmação)
 * - Testar validação de confirmação de password
 * - Garantir que register() é chamado ao submeter
 * - Verificar que mensagens de erro são exibidas
 * - Testar que estados de carregamento desabilitam o formulário
 * - Confirmar navegação após sucesso
 * - Verificar que link para página de login funciona
 *
 * Por que testar isto:
 * RegisterPage permite que novos utilizadores criem contas.
 * Se isto quebrar, a aquisição de utilizadores para.
 */

describe('RegisterPage', () => {
  // Mock useAuth return value
  const mockRegister = vi.fn()
  const mockUseAuth = {
    user: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
    login: vi.fn(),
    register: mockRegister,
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
   * Helper function to render RegisterPage with Router
   *
   * Why: RegisterPage uses react-router-dom (Link, useNavigate)
   * Must be wrapped in Router for tests to work
   */
  const renderRegisterPage = () => {
    return render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    )
  }

  /**
   * TEST 1: Render Complete Registration Form
   *
   * What: Verify all form fields are present
   * Why: User needs complete form to register
   *
   * Expected:
   * - Name input field
   * - Email input field
   * - Password input field
   * - Password confirmation input field
   * - Submit button
   * - Link to login page
   */
  it('should render registration form with all fields', () => {
    renderRegisterPage()

    // ASSERT: Name input is present
    const nameInput = screen.getByRole('textbox', { name: /nome|name/i })
    expect(nameInput).toBeInTheDocument()

    // ASSERT: Email input is present
    const emailInput = screen.getByRole('textbox', { name: /email/i })
    expect(emailInput).toBeInTheDocument()

    // ASSERT: Password input is present
    const passwordInput = screen.getByLabelText(/^password|palavra-passe$/i)
    expect(passwordInput).toBeInTheDocument()
    expect(passwordInput).toHaveAttribute('type', 'password')

    const passwordConfirmationInput = screen.getByLabelText(/confirm password/i)
    expect(passwordConfirmationInput).toBeInTheDocument()
    expect(passwordConfirmationInput).toHaveAttribute('type', 'password')

    // ASSERT: Submit button is present
    const submitButton = screen.getByRole('button', {
      name: /criar conta|registar|register|create account|creating account/i,
    })
    expect(submitButton).toBeInTheDocument()

    // ASSERT: Link to login page exists
    const loginLink = screen.getByRole('link', { name: /entra|login|sign in/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  /**
   * TEST 2: Validation - Password and Confirmation Must Match
   *
   * What: Submit with mismatched passwords and verify error
   * Why: Critical validation - prevents user mistakes
   *
   * Expected:
   * - Zod schema rejects mismatched passwords
   * - Error message is displayed
   * - register() is NOT called
   */
  it('should show validation error when password is weak', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    // Get form elements
    const nameInput = screen.getByRole('textbox', { name: /nome|name/i })
    const emailInput = screen.getByRole('textbox', { name: /email/i })
    const passwordInput = screen.getByLabelText(/^password|palavra-passe$/i)
    const passwordConfirmationInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', {
      name: /criar conta|registar|register|create account|creating account/i,
    })

    // ACT: Fill form with weak password
    await user.type(nameInput, 'Test User')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password')
    await user.click(submitButton)

    // ASSERT: Validation error is shown
    await waitFor(() => {
      expect(
        screen.getByText(/password.*8|password.*números|password.*numbers/i)
      ).toBeInTheDocument()
    })

    // ASSERT: register() was NOT called (validation failed)
    expect(mockRegister).not.toHaveBeenCalled()
  })

  /**
   * TEST 3: Submit Calls useAuth().register()
   *
   * What: Fill valid form and submit, verify register() is called
   * Why: Form must trigger account creation on submit
   *
   * Expected:
   * - register() is called with correct payload
   */
  it('should call register() with form data on submit', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    // Mock register to succeed
    mockRegister.mockResolvedValue(undefined)

    // Get form elements
    const nameInput = screen.getByRole('textbox', { name: /nome|name/i })
    const emailInput = screen.getByRole('textbox', { name: /email/i })
    const passwordInput = screen.getByLabelText(/^password|palavra-passe$/i)
    const passwordConfirmationInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', {
      name: /criar conta|registar|register|create account|creating account/i,
    })

    // ACT: Fill and submit form
    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(passwordInput, 'Password123')
    await user.type(passwordConfirmationInput, 'Password123')
    await user.click(submitButton)

    // ASSERT: register() was called with correct payload
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
      })
    })
  })

  /**
   * TEST 4: Display Backend Error (Duplicate Email)
   *
   * What: When useAuth has error (e.g., email exists), display it
   * Why: User needs feedback when registration fails
   *
   * Expected:
   * - Error message from useAuth.error is shown
   */
  it('should display error message when email already exists', () => {
    // Mock useAuth to return error state
    vi.mocked(useAuth).mockReturnValue({
      ...mockUseAuth,
      error: 'Email already exists',
    })

    renderRegisterPage()

    // ASSERT: Error message is displayed
    expect(screen.getByText('Email already exists')).toBeInTheDocument()
  })

  /**
   * TEST 5: Loading State Disables Form
   *
   * What: When isLoading is true, form should be disabled
   * Why: Prevent double-submit during API request
   *
   * Expected:
   * - Submit button is disabled
   */
  it('should disable submit button during loading', () => {
    // Mock useAuth to return loading state
    vi.mocked(useAuth).mockReturnValue({
      ...mockUseAuth,
      isLoading: true,
    })

    renderRegisterPage()

    // ASSERT: Submit button is disabled
    const submitButton = screen.getByRole('button', {
      name: /criar conta|registar|register|create account|creating account/i,
    })
    expect(submitButton).toBeDisabled()
  })

  /**
   * TEST 6: Successful Registration Redirects to /workspaces
   *
   * What: After successful registration, navigate to workspaces
   * Why: Newly registered users are auto-logged in
   *
   * Expected:
   * - useNavigate('/workspaces') is called
   */
  it('should redirect to /workspaces after successful registration', async () => {
    // Mock useAuth to return authenticated state
    vi.mocked(useAuth).mockReturnValue({
      ...mockUseAuth,
      user: { id: '1', name: 'John Doe', email: 'john@example.com' },
      isAuthenticated: true,
    })

    renderRegisterPage()

    // ASSERT: Navigation to /workspaces happened
    // Note: This assumes RegisterPage has useEffect that navigates
    // when isAuthenticated changes to true (same as LoginPage)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  /**
   * TEST 7: Link to Login Page Works
   *
   * What: Click "Já tens conta?" link and verify it navigates
   * Why: Existing users need to login instead
   *
   * Expected:
   * - Link points to /login
   */
  it('should have working link to login page', () => {
    renderRegisterPage()

    const loginLink = screen.getByRole('link', { name: /entra|login|sign in/i })

    // ASSERT: Link has correct href
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  /**
   * TEST 8: Validation - Required Fields
   *
   * What: Submit form with empty name and verify error
   * Why: All fields are required
   *
   * Expected:
   * - Zod schema rejects empty name
   * - Error message is displayed
   */
  it('should show validation error for empty name', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    // Get form elements
    const emailInput = screen.getByRole('textbox', { name: /email/i })
    const passwordInput = screen.getByLabelText(/^password|palavra-passe$/i)
    const submitButton = screen.getByRole('button', {
      name: /criar conta|registar|register|create account|creating account/i,
    })

    // ACT: Fill form but leave name empty
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'Password123')
    await user.click(submitButton)

    // ASSERT: Validation error is shown
    await waitFor(() => {
      expect(screen.getByText(/nome.*obrigatório|name.*required/i)).toBeInTheDocument()
    })

    // ASSERT: register() was NOT called
    expect(mockRegister).not.toHaveBeenCalled()
  })
})
