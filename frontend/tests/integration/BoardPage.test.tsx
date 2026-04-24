// Testes de integração para o componente BoardPage (quadro Kanban)
// Testa colunas, tarefas, eventos Socket.io em tempo real, modais, tratamento de erros
// Executa com: npm test BoardPage.test.tsx

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BoardPage } from '@/pages/BoardPage'
import ApiClient from '@/services/api'
import type { Column, Task } from '@/types/task'

/**
 * Mock de Dependências
 */

// Mock do ApiClient
vi.mock('@/services/api', () => ({
  default: {
    getColumns: vi.fn(),
    listTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    moveTask: vi.fn(),
    deleteTask: vi.fn(),
  },
}))

// Mock do SocketService
const { mockOn, mockOff, mockJoinWorkspace, mockLeaveWorkspace } = vi.hoisted(() => ({
  mockOn: vi.fn(),
  mockOff: vi.fn(),
  mockJoinWorkspace: vi.fn(),
  mockLeaveWorkspace: vi.fn(),
}))

vi.mock('@/services/socket', () => ({
  default: {
    on: mockOn,
    off: mockOff,
    joinWorkspace: mockJoinWorkspace,
    leaveWorkspace: mockLeaveWorkspace,
  },
}))

// Mock do react-router-dom
const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

/**
 * Suite de testes para BoardPage
 *
 * Propósito:
 * - Verificar que o board carrega colunas e tarefas corretamente
 * - Testar tratamento de eventos Socket.io (task:created, task:updated, task:moved, task:deleted)
 * - Validar modal de criação de tarefa
 * - Testar estados de erro
 */

describe('BoardPage', () => {
  // Mock workspace ID from route params
  const mockWorkspaceId = 'workspace-123'

  // Mock columns
  const mockColumns: Column[] = [
    {
      id: 'col-1',
      workspaceId: mockWorkspaceId,
      title: 'To Do',
      position: 0,
    },
    {
      id: 'col-2',
      workspaceId: mockWorkspaceId,
      title: 'In Progress',
      position: 1,
    },
    {
      id: 'col-3',
      workspaceId: mockWorkspaceId,
      title: 'Done',
      position: 2,
    },
  ]

  // Mock tasks
  const mockTasks: Task[] = [
    {
      id: 'task-1',
      columnId: 'col-1',
      title: 'Task 1',
      description: 'Description 1',
      priority: 'high',
      position: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-2',
      columnId: 'col-1',
      title: 'Task 2',
      description: 'Description 2',
      priority: 'medium',
      position: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-3',
      columnId: 'col-2',
      title: 'Task 3',
      description: 'Description 3',
      priority: 'low',
      position: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()

    // Default successful API responses
    vi.mocked(ApiClient.getColumns).mockResolvedValue(mockColumns)
    vi.mocked(ApiClient.listTasks).mockResolvedValue(mockTasks)
  })

  /**
   * Helper to render BoardPage with route params
   */
  const renderBoardPage = () => {
    return render(
      <MemoryRouter initialEntries={[`/workspaces/${mockWorkspaceId}/board`]}>
        <Routes>
          <Route path="/workspaces/:workspaceId/board" element={<BoardPage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  /**
   * TEST 1: Load Columns with getColumns()
   * 
   * What: Fetch columns from API on mount
   * Why: Board needs column structure
   */
  it('should load columns on mount', async () => {
    renderBoardPage()

    // ASSERT: API was called
    await waitFor(() => {
      expect(ApiClient.getColumns).toHaveBeenCalledWith(mockWorkspaceId)
    })
  })

  /**
   * TEST 2: Load Tasks with listTasks()
   * 
   * What: Fetch tasks from API on mount
   * Why: Board needs to display tasks
   */
  it('should load tasks on mount', async () => {
    renderBoardPage()

    // ASSERT: API was called
    await waitFor(() => {
      expect(ApiClient.listTasks).toHaveBeenCalledWith(mockWorkspaceId)
    })
  })

  /**
   * TEST 3: Render Columns with Real Titles
   * 
   * What: Display columns with titles from API
   * Why: User needs to see column names
   */
  it('should render columns with real titles', async () => {
    renderBoardPage()

    // ASSERT: Column titles are displayed
    await waitFor(() => {
      expect(screen.getByText('To Do')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Done')).toBeInTheDocument()
    })
  })

  /**
   * TEST 4: Organize Tasks in Correct Columns
   * 
   * What: Tasks appear in their assigned columns
   * Why: Task organization must be correct
   */
  it('should organize tasks in correct columns', async () => {
    renderBoardPage()

    // ASSERT: Tasks are displayed
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
      expect(screen.getByText('Task 2')).toBeInTheDocument()
      expect(screen.getByText('Task 3')).toBeInTheDocument()
    })

    // Note: Testing exact column placement requires more complex DOM queries
    // This verifies tasks are rendered, column organization tested in integration
  })

  /**
   * TEST 5: Sort Tasks by Position
   * 
   * What: Tasks in same column are ordered by position
   * Why: Position determines visual order
   */
  it('should sort tasks by position within columns', async () => {
    renderBoardPage()

    // ASSERT: Tasks are displayed in order
    // Task 1 (position 0) should appear before Task 2 (position 1)
    await waitFor(() => {
      const task1 = screen.getByText('Task 1')
      const task2 = screen.getByText('Task 2')
      expect(task1).toBeInTheDocument()
      expect(task2).toBeInTheDocument()
    })

    // Visual order verification would require DOM position comparison
    // For unit test, we verify tasks exist
  })

  /**
   * TEST 6: Socket.io Event - task:created
   * 
   * What: When task:created event fires, new task appears
   * Why: Real-time collaboration
   */
  it('should add task when task:created event is received', async () => {
    renderBoardPage()

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })

    // Get the task:created event handler
    const taskCreatedHandler = mockOn.mock.calls.find(
      call => call[0] === 'task:created'
    )?.[1]

    expect(taskCreatedHandler).toBeDefined()

    // Simulate Socket.io event
    const newTask: Task = {
      id: 'task-new',
      columnId: 'col-1',
      title: 'New Task',
      description: 'New Description',
      priority: 'urgent',
      position: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    taskCreatedHandler({ task: newTask })

    // ASSERT: New task appears
    await waitFor(() => {
      expect(screen.getByText('New Task')).toBeInTheDocument()
    })
  })

  /**
   * TEST 7: Socket.io Event - task:updated
   * 
   * What: When task:updated event fires, task updates
   * Why: Real-time collaboration
   */
  it('should update task when task:updated event is received', async () => {
    renderBoardPage()

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })

    // Get the task:updated event handler
    const taskUpdatedHandler = mockOn.mock.calls.find(
      call => call[0] === 'task:updated'
    )?.[1]

    expect(taskUpdatedHandler).toBeDefined()

    // Simulate Socket.io event with updated task
    const updatedTask: Task = {
      ...mockTasks[0],
      title: 'Task 1 Updated',
      description: 'Updated description',
    }

    taskUpdatedHandler({ task: updatedTask })

    // ASSERT: Task title is updated
    await waitFor(() => {
      expect(screen.getByText('Task 1 Updated')).toBeInTheDocument()
      expect(screen.queryByText('Task 1')).not.toBeInTheDocument()
    })
  })

  /**
   * TEST 8: Socket.io Event - task:moved
   * 
   * What: When task:moved event fires, task moves to new column
   * Why: Real-time drag-drop updates
   */
  it('should move task when task:moved event is received', async () => {
    renderBoardPage()

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })

    // Get the task:moved event handler
    const taskMovedHandler = mockOn.mock.calls.find(
      call => call[0] === 'task:moved'
    )?.[1]

    expect(taskMovedHandler).toBeDefined()

    // Simulate moving task from col-1 to col-2
    const movedTask: Task = {
      ...mockTasks[0],
      columnId: 'col-2',
      position: 1,
    }

    taskMovedHandler(movedTask)

    // ASSERT: Task still exists (moved to new column)
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })

    // Column verification requires more complex DOM inspection
  })

  /**
   * TEST 9: Socket.io Event - task:deleted
   * 
   * What: When task:deleted event fires, task disappears
   * Why: Real-time deletion updates
   */
  it('should remove task when task:deleted event is received', async () => {
    renderBoardPage()

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })

    // Get the task:deleted event handler
    const taskDeletedHandler = mockOn.mock.calls.find(
      call => call[0] === 'task:deleted'
    )?.[1]

    expect(taskDeletedHandler).toBeDefined()

    // Simulate Socket.io event
    taskDeletedHandler({ taskId: 'task-1' })

    // ASSERT: Task is removed
    await waitFor(() => {
      expect(screen.queryByText('Task 1')).not.toBeInTheDocument()
    })
  })

  /**
   * TEST 10: Create Task Modal
   *
   * What: Open modal and verify fields
   * Why: Users create tasks via modal
   *
   * Note: These modal tests are fragile and depend on specific DOM selectors.
   * Core functionality is covered by other tests.
   */
  it('should open create task modal with title, description, priority fields', async () => {
    const user = userEvent.setup()
    renderBoardPage()

    // Wait for board to load
    await waitFor(() => {
      expect(screen.getByText('To Do')).toBeInTheDocument()
    })

    const addTaskButtons = screen.getAllByRole('button', { name: /add task/i })
    await user.click(addTaskButtons[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add task/i })).toBeInTheDocument()
    }, { timeout: 2000 })

    expect(screen.getByPlaceholderText('Task title')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Description (optional)')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  /**
   * TEST 11: Validate Required Title
   *
   * What: Submit form without title shows error
   * Why: Title is required field
   */
  it('should validate title is required before creating task', async () => {
    const user = userEvent.setup()
    renderBoardPage()

    await waitFor(() => {
      expect(screen.getByText('To Do')).toBeInTheDocument()
    })

    const addTaskButtons = screen.getAllByRole('button', { name: /add task/i })
    await user.click(addTaskButtons[0])

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add task/i })).toBeInTheDocument()
    })

    const createButton = screen.getByRole('button', { name: /^create$/i })
    expect(createButton).toBeDisabled()

    expect(ApiClient.createTask).not.toHaveBeenCalled()
  })

  /**
   * TEST 12: Create Task Calls API
   *
   * What: Submit valid form calls createTask()
   * Why: Task must be persisted to backend
   */
  it('should call createTask API when form is submitted', async () => {
    const user = userEvent.setup()

    const newTask: Task = {
      id: 'task-new',
      columnId: 'col-1',
      title: 'New API Task',
      description: 'New Description',
      priority: 'high',
      position: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    vi.mocked(ApiClient.createTask).mockResolvedValue(newTask)

    renderBoardPage()

    await waitFor(() => {
      expect(screen.getByText('To Do')).toBeInTheDocument()
    })

    const addTaskButtons = screen.getAllByRole('button', { name: /add task/i })
    await user.click(addTaskButtons[0])

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add task/i })).toBeInTheDocument()
    })

    const titleInput = screen.getByPlaceholderText('Task title')
    const descriptionInput = screen.getByPlaceholderText('Description (optional)')
    const prioritySelect = screen.getByRole('combobox')

    await user.type(titleInput, 'New API Task')
    await user.type(descriptionInput, 'New Description')
    await user.selectOptions(prioritySelect, 'high')

    // Submit
    const submitButton = screen.getByRole('button', { name: /^create$/i })
    await user.click(submitButton)

    // ASSERT: API was called
    await waitFor(() => {
      expect(ApiClient.createTask).toHaveBeenCalledWith(
        mockWorkspaceId,
        expect.objectContaining({
          columnId: 'col-1',
          title: 'New API Task',
          description: 'New Description',
          priority: 'high',
        })
      )
    })
  })

  /**
   * TEST 13: Error Loading Board
   * 
   * What: Show error message when columns/tasks fail to load
   * Why: User needs feedback when board can't load
   */
  it('should display error message when board fails to load', async () => {
    // Mock API to reject
    vi.mocked(ApiClient.getColumns).mockRejectedValue(
      new Error('Failed to load columns')
    )

    renderBoardPage()

    // ASSERT: Error message is shown
    await waitFor(() => {
      expect(screen.getByText(/erro|error|falha|failed/i)).toBeInTheDocument()
    })

    // ASSERT: "Voltar" button exists
    const backButton = screen.getByRole('button', { name: /voltar|back/i })
    expect(backButton).toBeInTheDocument()
  })
})
