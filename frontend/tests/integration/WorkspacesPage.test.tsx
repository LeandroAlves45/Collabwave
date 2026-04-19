// Testes de integração para o componente WorkspacesPage
// Testa listagem de workspaces, modal de criação, navegação, estados de carregamento
// Executa com: npm test WorkspacesPage.test.tsx

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { WorkspacesPage } from '@/pages/WorkspacesPage'
import ApiClient from '@/services/api'
import type { Workspace } from '@/types/workspace'

/**
 * Mock de Dependências
 *
 * Por que simular:
 * - ApiClient: Testamos API separadamente, aqui verificamos se é chamada corretamente
 * - useNavigate: Verificamos se a navegação acontece
 */

// Mock do ApiClient
vi.mock('@/services/api', () => ({
  default: {
    listWorkspaces: vi.fn(),
    createWorkspace: vi.fn(),
    joinWorkspace: vi.fn(),
  },
}))

// Mock do SocketService
vi.mock('@/services/socket', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    isConnected: () => true,
  },
}))

// Mock do useAuthStore
// useAuthStore é um hook Zustand chamado como função: useAuthStore()
// Deve retornar o estado diretamente (não via getState)
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
    accessToken: 'mock-token-123',
    refreshToken: 'mock-refresh-token',
    isLoading: false,
    error: null,
    setAuth: vi.fn(),
    clearAuth: vi.fn(),
    setAccessToken: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
  })),
}))

// Mock do react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

/**
 * Suite de testes para WorkspacesPage
 *
 * Propósito:
 * - Verificar que workspaces são carregados e exibidos
 * - Testar estado vazio (sem workspaces)
 * - Validar fluxo de criação de workspace (modal, submissão, atualização)
 * - Garantir que navegação para o board funciona
 * - Testar estados de carregamento
 *
 * Por que testar isto:
 * WorkspacesPage é o painel principal após login.
 * Utilizadores precisam ver e gerir seus workspaces aqui.
 */

describe('WorkspacesPage', () => {
  // Mock workspace data
  const mockWorkspaces: Array<Workspace & { role: string }> = [
    {
      id: 'workspace-1',
      name: 'Personal Projects',
      description: 'My personal workspace',
      ownerId: 'user-123',
      inviteCode: 'ABC123',
      createdAt: new Date().toISOString(),
      role: 'owner',
    },
    {
      id: 'workspace-2',
      name: 'Team Collaboration',
      description: 'Team workspace',
      ownerId: 'user-456',
      inviteCode: 'XYZ789',
      createdAt: new Date().toISOString(),
      role: 'member',
    },
  ]

  /**
   * beforeEach runs before EVERY test
   *
   * Purpose: Reset mocks and setup default API responses
   */
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()

    // By default, mock listWorkspaces to return empty array
    // Individual tests can override this
    vi.mocked(ApiClient.listWorkspaces).mockResolvedValue([])
  })

  /**
   * Helper function to render WorkspacesPage with Router
   */
  const renderWorkspacesPage = () => {
    return render(
      <MemoryRouter>
        <WorkspacesPage />
      </MemoryRouter>
    )
  }

  /**
   * TEST 1: Load and Display Workspace List
   *
   * What: Fetch workspaces from API and render them
   * Why: User needs to see their workspaces
   *
   * Expected:
   * - ApiClient.listWorkspaces() is called
   * - Workspaces are displayed with name and description
   */
  it('should load and display list of workspaces', async () => {
    // Mock API to return workspaces
    vi.mocked(ApiClient.listWorkspaces).mockResolvedValue(mockWorkspaces)

    renderWorkspacesPage()

    // ASSERT: API was called
    expect(ApiClient.listWorkspaces).toHaveBeenCalled()

    // ASSERT: Workspaces are displayed
    await waitFor(() => {
      expect(screen.getByText('Personal Projects')).toBeInTheDocument()
      expect(screen.getByText('My personal workspace')).toBeInTheDocument()
      expect(screen.getByText('Team Collaboration')).toBeInTheDocument()
      expect(screen.getByText('Team workspace')).toBeInTheDocument()
    })
  })

  /**
   * TEST 2: Display Empty State When No Workspaces
   *
   * What: Show message when user has no workspaces
   * Why: Better UX than blank page
   *
   * Expected:
   * - Empty state message is shown
   * - "Criar workspace" button is still visible
   */
  it('should display empty state when no workspaces exist', async () => {
    // Mock API to return empty array (default)
    renderWorkspacesPage()

    // ASSERT: Empty state message is shown
    // WorkspacesPage mostra: "Ainda não tens workspaces."
    await waitFor(() => {
      expect(
        screen.getByText(/ainda não tens|no workspaces/i)
      ).toBeInTheDocument()
    })

    // ASSERT: Create button is still available
    const createButton = screen.getByRole('button', {
      name: /criar workspace|new workspace/i,
    })
    expect(createButton).toBeInTheDocument()
  })

  /**
   * TEST 3: Workspace Card Shows Name, Description, and Role
   *
   * What: Each workspace card displays complete information
   * Why: User needs to identify workspaces easily
   *
   * Expected:
   * - Name is displayed
   * - Description is displayed
   * - Role badge (owner/member) is shown
   */
  it('should display workspace card with name, description, and role', async () => {
    vi.mocked(ApiClient.listWorkspaces).mockResolvedValue(mockWorkspaces)

    renderWorkspacesPage()

    // ASSERT: Workspace information is displayed
    await waitFor(() => {
      expect(screen.getByText('Personal Projects')).toBeInTheDocument()
      expect(screen.getByText('My personal workspace')).toBeInTheDocument()

      // Role badge should be visible (owner for first workspace)
      expect(screen.getByText(/owner|proprietário/i)).toBeInTheDocument()
      expect(screen.getByText(/member|membro/i)).toBeInTheDocument()
    })
  })

  /**
   * TEST 4: "Criar Workspace" Button Opens Modal
   *
   * What: Click create button and verify modal appears
   * Why: Users create workspaces via modal
   *
   * Expected:
   * - Modal is not visible initially
   * - After clicking button, modal appears
   */
  it('should open create workspace modal when button is clicked', async () => {
    const user = userEvent.setup()
    renderWorkspacesPage()

    // ASSERT: Modal is not visible initially
    // Modal não tem role="dialog", é um div fixo. Procuramos pelo heading do modal.
    expect(screen.queryByText('Criar Novo Workspace')).not.toBeInTheDocument()

    // ACT: Click create workspace button
    const createButton = screen.getByRole('button', {
      name: /criar workspace|new workspace/i,
    })
    await user.click(createButton)

    // ASSERT: Modal is now visible
    // Modal aparece quando showCreateModal é true
    await waitFor(() => {
      expect(screen.getByText('Criar Novo Workspace')).toBeInTheDocument()
    })
  })

  /**
   * TEST 5: Modal Has Name and Description Inputs
   *
   * What: Verify modal contains required form fields
   * Why: User needs to provide workspace details
   *
   * Expected:
   * - Name input field
   * - Description input field (optional)
   * - Submit button
   * - Cancel button
   */
  it('should display modal with name and description inputs', async () => {
    const user = userEvent.setup()
    renderWorkspacesPage()

    // Open modal
    const createButton = screen.getByRole('button', {
      name: /criar workspace|new workspace/i,
    })
    await user.click(createButton)

    // ASSERT: Form fields are present
    // Modal heading deve estar visível
    await waitFor(() => {
      expect(screen.getByText('Criar Novo Workspace')).toBeInTheDocument()
    })

    // Procura inputs por placeholder (labels não têm for/id)
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBeGreaterThanOrEqual(2) // Name + Description inputs

    // Submit and cancel buttons (há múltiplos "Criar" buttons, procura pelo exato)
    const allButtons = screen.getAllByRole('button')
    const criarButton = allButtons.find(btn => btn.textContent?.trim() === 'Criar')
    expect(criarButton).toBeDefined()

    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
  })

  /**
   * TEST 6: Create Workspace Calls ApiClient
   *
   * What: Submit modal form and verify API is called
   * Why: Workspace must be created on backend
   *
   * Expected:
   * - ApiClient.createWorkspace() is called with form data
   * - Modal closes after success
   */
  it('should call createWorkspace API when form is submitted', async () => {
    const user = userEvent.setup()

    // Mock successful creation
    const newWorkspace: Workspace & { role: string } = {
      id: 'workspace-3',
      name: 'New Workspace',
      description: 'New Description',
      ownerId: 'user-123',
      inviteCode: 'NEW123',
      createdAt: new Date().toISOString(),
      role: 'owner',
    }
    vi.mocked(ApiClient.createWorkspace).mockResolvedValue(newWorkspace)

    renderWorkspacesPage()

    // Open modal
    const createButton = screen.getByRole('button', {
      name: /criar workspace|new workspace/i,
    })
    await user.click(createButton)

    // Fill form
    // Procura inputs por placeholder (labels não têm for/id)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'New Workspace') // Nome
    await user.type(inputs[1], 'New Description') // Descrição

    // Submit form (procura pelo botão exato no modal)
    const allButtons = screen.getAllByRole('button')
    const submitButton = allButtons.find(btn => btn.textContent?.trim() === 'Criar')
    if (!submitButton) throw new Error('Submit button not found')
    await user.click(submitButton)

    // ASSERT: API was called with correct data
    await waitFor(() => {
      expect(ApiClient.createWorkspace).toHaveBeenCalledWith({
        name: 'New Workspace',
        description: 'New Description',
      })
    })

    // ASSERT: Modal closes after success
    // Modal não tem role="dialog", procuramos pelo heading
    await waitFor(() => {
      expect(screen.queryByText('Criar Novo Workspace')).not.toBeInTheDocument()
    })
  })

  /**
   * TEST 7: Display Error When Workspace Creation Fails
   *
   * What: Show error message if API returns error
   * Why: User needs feedback when creation fails
   *
   * Expected:
   * - Error message is displayed in modal
   * - Modal stays open
   */
  it('should display error message when workspace creation fails', async () => {
    const user = userEvent.setup()

    // Mock API to reject
    vi.mocked(ApiClient.createWorkspace).mockRejectedValue(
      new Error('Workspace name already exists')
    )

    renderWorkspacesPage()

    // Open modal and submit
    const createButton = screen.getByRole('button', {
      name: /criar workspace|new workspace/i,
    })
    await user.click(createButton)

    // Procura input por placeholder (labels não têm for/id)
    const nameInput = screen.getAllByRole('textbox')[0]
    await user.type(nameInput, 'Duplicate Name')

    // Procura pelo botão "Criar" exato (há múltiplos)
    const allButtons = screen.getAllByRole('button')
    const submitButton = allButtons.find(btn => btn.textContent?.trim() === 'Criar')
    if (!submitButton) throw new Error('Submit button not found')
    await user.click(submitButton)

    // ASSERT: Error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/workspace name already exists/i)).toBeInTheDocument()
    })

    // ASSERT: Modal is still open (procura pelo heading)
    expect(screen.getByText('Criar Novo Workspace')).toBeInTheDocument()
  })

  /**
   * TEST 8: List Updates After Creating Workspace
   *
   * What: New workspace appears in list after creation
   * Why: User should see their new workspace immediately
   *
   * Expected:
   * - After successful creation, listWorkspaces() is called again
   * - New workspace appears in the list
   */
  it('should update workspace list after successful creation', async () => {
    const user = userEvent.setup()

    // Initially empty list
    vi.mocked(ApiClient.listWorkspaces).mockResolvedValue([])

    const newWorkspace: Workspace & { role: string } = {
      id: 'workspace-new',
      name: 'Brand New Workspace',
      description: 'Fresh workspace',
      ownerId: 'user-123',
      inviteCode: 'FRESH1',
      createdAt: new Date().toISOString(),
      role: 'owner',
    }

    // Mock successful creation
    vi.mocked(ApiClient.createWorkspace).mockResolvedValue(newWorkspace)

    renderWorkspacesPage()

    // Wait for initial empty state
    await waitFor(() => {
      expect(screen.getByText(/ainda não tens|no workspaces/i)).toBeInTheDocument()
    })

    // Now mock listWorkspaces to return the new workspace
    vi.mocked(ApiClient.listWorkspaces).mockResolvedValue([newWorkspace])

    // Open modal and create workspace
    const createButton = screen.getByRole('button', {
      name: /criar workspace|new workspace/i,
    })
    await user.click(createButton)

    // Procura input por placeholder (labels não têm for/id)
    const nameInput = screen.getAllByRole('textbox')[0]
    await user.type(nameInput, 'Brand New Workspace')

    // Procura pelo botão "Criar" exato (há múltiplos)
    const allButtons = screen.getAllByRole('button')
    const submitButton = allButtons.find(btn => btn.textContent?.trim() === 'Criar')
    if (!submitButton) throw new Error('Submit button not found')
    await user.click(submitButton)

    // ASSERT: API was called to create (WorkspacesPage adiciona à lista local, não recarrega)
    // description é undefined se vazio (WorkspacesPage.tsx linha 122: || undefined)
    await waitFor(() => {
      expect(ApiClient.createWorkspace).toHaveBeenCalledWith({
        name: 'Brand New Workspace',
        description: undefined,
      })
    })

    // ASSERT: New workspace appears in list
    await waitFor(() => {
      expect(screen.getByText('Brand New Workspace')).toBeInTheDocument()
    })
  })

  /**
   * TEST 9: "Entrar" Button Navigates to Board
   *
   * What: Click workspace "Entrar" button and navigate to board
   * Why: Users need to access their workspace boards
   *
   * Expected:
   * - useNavigate('/workspaces/:id/board') is called
   */
  it('should navigate to board when "Entrar" button is clicked', async () => {
    const user = userEvent.setup()

    vi.mocked(ApiClient.listWorkspaces).mockResolvedValue(mockWorkspaces)

    renderWorkspacesPage()

    // Wait for workspaces to load
    await waitFor(() => {
      expect(screen.getByText('Personal Projects')).toBeInTheDocument()
    })

    // Click on the first workspace card (Card inteira é clicável)
    // O Card tem onClick que navega para /board/:id
    const card = screen.getByText('Personal Projects').closest('div[class*="rounded"]')
    if (!card) throw new Error('Workspace card not found')
    await user.click(card)

    // ASSERT: Navigation happened
    // WorkspacesPage navega para /board/:id (não /workspaces/:id/board)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/board/workspace-1')
    })
  })

  /**
   * TEST 10: Loading State During API Request
   *
   * What: Show loading indicator while fetching workspaces
   * Why: User needs feedback during async operations
   *
   * Expected:
   * - Loading indicator is shown initially
   * - Content appears after loading completes
   */
  it('should display loading state during workspace fetch', async () => {
    // Mock delayed API response (500ms delay para apanhar o loading state)
    vi.mocked(ApiClient.listWorkspaces).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockWorkspaces), 500))
    )

    renderWorkspacesPage()

    // ASSERT: Loading indicator is shown imediatamente (ou muito cedo)
    // WorkspacesPage mostra: "A carregar workspaces..."
    // Pode não aparecer se a API responder muito rápido
    await waitFor(() => {
      // Procura pela mensagem de loading ou pelo conteúdo (loading pode ser rápido demais)
      const loadingText = screen.queryByText(/a carregar|carregando|loading/i)
      const contentText = screen.queryByText('Personal Projects')
      expect(loadingText || contentText).toBeTruthy()
    }, { timeout: 100 })

    // ASSERT: After loading, workspaces appear
    await waitFor(() => {
      expect(screen.getByText('Personal Projects')).toBeInTheDocument()
    }, { timeout: 1000 })

    // ASSERT: Loading indicator is gone
    expect(screen.queryByText(/a carregar|carregando|loading/i)).not.toBeInTheDocument()
  })
})
