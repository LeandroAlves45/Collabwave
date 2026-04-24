// Integration tests for WorkspacesPage

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { WorkspacesPage } from '@/pages/WorkspacesPage'
import ApiClient from '@/services/api'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import type { Workspace } from '@/types/workspace'

vi.mock('@/services/api', () => ({
  default: {
    listWorkspaces: vi.fn(),
    createWorkspace: vi.fn(),
    joinWorkspace: vi.fn(),
  },
}))

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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('WorkspacesPage', () => {
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

  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    useWorkspaceStore.getState().reset()
    vi.mocked(ApiClient.listWorkspaces).mockResolvedValue([])
  })

  const renderWorkspacesPage = () =>
    render(
      <MemoryRouter>
        <WorkspacesPage />
      </MemoryRouter>
    )

  const getPrimaryCreateButton = () =>
    screen.getAllByRole('button', { name: /new workspace/i })[0]

  it('should load and display list of workspaces', async () => {
    vi.mocked(ApiClient.listWorkspaces).mockResolvedValue(mockWorkspaces)

    renderWorkspacesPage()

    expect(ApiClient.listWorkspaces).toHaveBeenCalled()

    await waitFor(() => {
      expect(screen.getByText('Personal Projects')).toBeInTheDocument()
      expect(screen.getByText('My personal workspace')).toBeInTheDocument()
      expect(screen.getByText('Team Collaboration')).toBeInTheDocument()
      expect(screen.getByText('Team workspace')).toBeInTheDocument()
    })
  })

  it('should display empty state when no workspaces exist', async () => {
    renderWorkspacesPage()

    await waitFor(() => {
      expect(screen.getByText(/no workspaces/i)).toBeInTheDocument()
    })

    expect(getPrimaryCreateButton()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create your first workspace/i })).toBeInTheDocument()
  })

  it('should display workspace card with name, description, and role', async () => {
    vi.mocked(ApiClient.listWorkspaces).mockResolvedValue(mockWorkspaces)

    renderWorkspacesPage()

    await waitFor(() => {
      expect(screen.getByText('Personal Projects')).toBeInTheDocument()
      expect(screen.getByText('My personal workspace')).toBeInTheDocument()
      expect(screen.getByText('1 member')).toBeInTheDocument()
      expect(screen.getByText('member')).toBeInTheDocument()
    })
  })

  it('should open create workspace modal when button is clicked', async () => {
    const user = userEvent.setup()
    renderWorkspacesPage()

    expect(screen.queryByRole('heading', { name: /create new workspace/i })).not.toBeInTheDocument()

    await waitFor(() => {
      expect(getPrimaryCreateButton()).toBeInTheDocument()
    })

    await user.click(getPrimaryCreateButton())

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create new workspace/i })).toBeInTheDocument()
    })
  })

  it('should display modal with name and description inputs', async () => {
    const user = userEvent.setup()
    renderWorkspacesPage()

    await waitFor(() => {
      expect(getPrimaryCreateButton()).toBeInTheDocument()
    })

    await user.click(getPrimaryCreateButton())

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create new workspace/i })).toBeInTheDocument()
    })

    expect(screen.getByPlaceholderText('Workspace name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Description (optional)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^create$/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('should call createWorkspace API when form is submitted', async () => {
    const user = userEvent.setup()
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

    await waitFor(() => {
      expect(getPrimaryCreateButton()).toBeInTheDocument()
    })

    await user.click(getPrimaryCreateButton())

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create new workspace/i })).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Workspace name'), 'New Workspace')
    await user.type(screen.getByPlaceholderText('Description (optional)'), 'New Description')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(ApiClient.createWorkspace).toHaveBeenCalledWith({
        name: 'New Workspace',
        description: 'New Description',
      })
    })

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /create new workspace/i })).not.toBeInTheDocument()
    })
  })

  it('should display error message when workspace creation fails', async () => {
    const user = userEvent.setup()
    vi.mocked(ApiClient.createWorkspace).mockRejectedValue(
      new Error('Workspace name already exists')
    )

    renderWorkspacesPage()

    await waitFor(() => {
      expect(getPrimaryCreateButton()).toBeInTheDocument()
    })

    await user.click(getPrimaryCreateButton())

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create new workspace/i })).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Workspace name'), 'Duplicate Name')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(screen.getByText(/workspace name already exists/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /create new workspace/i })).toBeInTheDocument()
  })

  it('should update workspace list after successful creation', async () => {
    const user = userEvent.setup()
    const newWorkspace: Workspace & { role: string } = {
      id: 'workspace-new',
      name: 'Brand New Workspace',
      description: 'Fresh workspace',
      ownerId: 'user-123',
      inviteCode: 'FRESH1',
      createdAt: new Date().toISOString(),
      role: 'owner',
    }

    vi.mocked(ApiClient.createWorkspace).mockResolvedValue(newWorkspace)

    renderWorkspacesPage()

    await waitFor(() => {
      expect(screen.getByText(/no workspaces/i)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(getPrimaryCreateButton()).toBeInTheDocument()
    })

    await user.click(getPrimaryCreateButton())

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create new workspace/i })).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Workspace name'), 'Brand New Workspace')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(ApiClient.createWorkspace).toHaveBeenCalledWith({
        name: 'Brand New Workspace',
        description: undefined,
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Brand New Workspace')).toBeInTheDocument()
    })
  })

  it('should navigate to board when "Entrar" button is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(ApiClient.listWorkspaces).mockResolvedValue(mockWorkspaces)

    renderWorkspacesPage()

    await waitFor(() => {
      expect(screen.getByText('Personal Projects')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /personal projects/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/board/workspace-1')
    })
  })

  it('should display loading state during workspace fetch', async () => {
    vi.mocked(ApiClient.listWorkspaces).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockWorkspaces), 500))
    )

    renderWorkspacesPage()

    expect(screen.queryByText('Personal Projects')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Personal Projects')).toBeInTheDocument()
    }, { timeout: 1000 })
  })
})
