import type { ReactElement } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import ApiClient from '@/services/api'
import SocketService from '@/services/socket'
import type { Task, ColumnWithTasks, TaskWithUsers, UserInfo } from '@/types/task'
import { KanbanColumn } from '@/components/common/KanbanColumn'
import { PresenceStack } from '@/components/common/PresenceAvatar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Loader2, X, Plus } from 'lucide-react'
import type { AuthUser } from '@/types/auth'

// Task recem-atualizada por outro utilizador mostra o flash por esta duracao,
// alinhada com a animacao `task-flash` (0.6s) definida em globals.css.
const TASK_FLASH_DURATION_MS = 600

function isUserInfo(value: unknown): value is UserInfo {
  if (!value || typeof value !== 'object') return false

  const user = value as Record<string, unknown>
  return (
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.initials === 'string'
  )
}

const normalizeBoardTask = (
  task: Task | Record<string, unknown>
): Task | TaskWithUsers => {
  // REST e Socket podem devolver camelCase ou snake_case; a UI trabalha sempre com camelCase.
  const raw = task as Record<string, unknown>

  const normalized: Task = {
    id: String(raw.id),
    columnId: String(raw.columnId ?? raw.column_id ?? ''),
    title: String(raw.title),
    description: typeof raw.description === 'string' ? raw.description : undefined,
    assigneeId:
      typeof (raw.assigneeId ?? raw.assignee_id) === 'string'
        ? String(raw.assigneeId ?? raw.assignee_id)
        : undefined,
    priority:
      raw.priority === 'low' ||
      raw.priority === 'medium' ||
      raw.priority === 'high' ||
      raw.priority === 'urgent'
        ? raw.priority
        : 'medium',
    dueDate:
      typeof (raw.dueDate ?? raw.due_date) === 'string'
        ? String(raw.dueDate ?? raw.due_date)
        : undefined,
    position: Number(raw.position ?? 0),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ''),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ''),
  }

  if (isUserInfo(raw.createdBy)) {
    // Mantem os dados do criador quando o payload vem enriquecido pelo backend.
    return {
      ...normalized,
      createdBy: raw.createdBy,
      ...(isUserInfo(raw.assignee) ? { assignee: raw.assignee } : {}),
    }
  }

  return normalized
}

export function BoardPage(): ReactElement {
  const { id, workspaceId: legacyWorkspaceId } = useParams<{
    id?: string
    workspaceId?: string
  }>()
  const workspaceId = id ?? legacyWorkspaceId
  const navigate = useNavigate()
  useAuth()

  const [columns, setColumns] = useState<ColumnWithTasks[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [selectedColumnId, setSelectedColumnId] = useState<string>('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<
    'low' | 'medium' | 'high' | 'urgent'
  >('medium')
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingPriority, setEditingPriority] = useState<
    'low' | 'medium' | 'high' | 'urgent'
  >('medium')

  const [isCreatingColumn, setIsCreatingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')

  const [onlineUsers, setOnlineUsers] = useState<AuthUser[]>([])
  const [recentlyUpdatedTaskIds, setRecentlyUpdatedTaskIds] = useState<Set<string>>(
    new Set()
  )

  // Marca uma task como recem-atualizada para acionar o flash visual em
  // TaskCard; remove-a do conjunto depois da duracao da animacao.
  const flashTask = useCallback((taskId: string) => {
    setRecentlyUpdatedTaskIds((prev) => new Set(prev).add(taskId))
    setTimeout(() => {
      setRecentlyUpdatedTaskIds((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }, TASK_FLASH_DURATION_MS)
  }, [])

  const loadColumns = useCallback(async () => {
    if (!workspaceId) return

    try {
      setIsLoading(true)
      setError(null)

      const columns = await ApiClient.getColumns(workspaceId)
      const tasks = await ApiClient.listTasks(workspaceId)

      // Protecao contra duplicados vindos da API antes de montar o estado local.
      const uniqueColumns = Array.from(
        new Map(columns.map((col) => [col.id, col])).values()
      )

      setColumns(
        uniqueColumns.map((column) => ({
          ...column,
          tasks: tasks.filter((task) => task.columnId === column.id),
        }))
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar board'
      setError(errorMessage)
      console.error('[BoardPage]Erro ao carregar board:', err)
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    if (!workspaceId) {
      navigate('/')
      return
    }

    loadColumns()
    // Entra na sala do workspace para receber eventos de tasks em tempo real.
    SocketService.joinWorkspace(workspaceId)

    const handleTaskCreated = (data: { task: Task | TaskWithUsers }) => {
      const normalizedTask = normalizeBoardTask(data.task)
      setColumns((prevColumns) => {
        return prevColumns.map((col) => {
          if (col.id === normalizedTask.columnId) {
            // Evita duplicar quando a task ja entrou no estado por outro caminho.
            if (col.tasks.some((task) => task.id === normalizedTask.id)) {
              return col
            }
            return {
              ...col,
              tasks: [...col.tasks, normalizedTask],
            }
          }
          return col
        })
      })
    }

    const handleTaskUpdated = (data: { task: Task | TaskWithUsers }) => {
      const normalizedTask = normalizeBoardTask(data.task)
      setColumns((prevColumns) => {
        return prevColumns.map((col) => ({
          ...col,
          tasks: col.tasks.map((task) =>
            task.id === normalizedTask.id ? normalizedTask : task
          ),
        }))
      })
      flashTask(normalizedTask.id)
    }

    const handlePresenceUpdate = (data: { onlineUsers: AuthUser[] }) => {
      setOnlineUsers(data.onlineUsers)
    }

    const handleTaskMoved = (data: {
      taskId: string
      targetColumnId: string
      newPosition: number
    }) => {
      setColumns((prevColumns) => {
        let movedTask: Task | null = null
        const withoutTask = prevColumns.map((col) => {
          const filtered = col.tasks.filter((task) => {
            if (task.id === data.taskId) {
              movedTask = task as Task
              return false
            }
            return true
          })
          return { ...col, tasks: filtered }
        })

        if (!movedTask) return prevColumns

        // O evento de move traz destino e posicao final; a task local preserva o resto dos campos.
        const updatedTask: Task = {
          ...(movedTask as Task),
          columnId: data.targetColumnId,
          position: data.newPosition,
        }

        return withoutTask.map((col) => {
          if (col.id === data.targetColumnId) {
            const tasks = [...col.tasks]
            tasks.splice(data.newPosition, 0, updatedTask)
            return {
              ...col,
              tasks: tasks.map((task, position) => ({ ...task, position })),
            }
          }
          return {
            ...col,
            tasks: col.tasks.map((task, position) => ({ ...task, position })),
          }
        })
      })
      flashTask(data.taskId)
    }

    const handleTaskDeleted = (data: { taskId: string }) => {
      setColumns((prevColumns) => {
        return prevColumns.map((col) => ({
          ...col,
          tasks: col.tasks.filter((task) => task.id !== data.taskId),
        }))
      })
    }

    SocketService.on('task:created', handleTaskCreated)
    SocketService.on('task:updated', handleTaskUpdated)
    SocketService.on('task:moved', handleTaskMoved)
    SocketService.on('task:deleted', handleTaskDeleted)
    SocketService.on('workspace:presence_update', handlePresenceUpdate)

    return () => {
      // Sai da room antes de remover handlers para não receber eventos do board anterior.
      SocketService.leaveWorkspace(workspaceId)
      SocketService.off('task:created', handleTaskCreated)
      SocketService.off('task:updated', handleTaskUpdated)
      SocketService.off('task:moved', handleTaskMoved)
      SocketService.off('task:deleted', handleTaskDeleted)
      SocketService.off('workspace:presence_update', handlePresenceUpdate)
      setOnlineUsers([])
    }
  }, [workspaceId, navigate, loadColumns, flashTask])

  const handleAddTask = (columnId: string) => {
    setSelectedColumnId(columnId)
    setIsCreatingTask(true)
  }

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !selectedColumnId || !workspaceId) return

    try {
      setIsSubmittingTask(true)
      const createdTask = await ApiClient.createTask(workspaceId, {
        columnId: selectedColumnId,
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        priority: newTaskPriority,
      })
      const normalizedTask = normalizeBoardTask(createdTask)

      setColumns((prevColumns) =>
        prevColumns.map((col) => {
          if (col.id !== normalizedTask.columnId) return col
          if (col.tasks.some((task) => task.id === normalizedTask.id)) return col

          return {
            ...col,
            tasks: [...col.tasks, normalizedTask],
          }
        })
      )

      setNewTaskTitle('')
      setNewTaskDescription('')
      setNewTaskPriority('medium')
      setIsCreatingTask(false)
      setSelectedColumnId('')
    } catch (err) {
      console.error('[BoardPage]Erro ao criar task:', err)
    } finally {
      setIsSubmittingTask(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!workspaceId) return

    try {
      await ApiClient.deleteTask(workspaceId, taskId)
      setColumns((prevColumns) =>
        prevColumns.map((col) => ({
          ...col,
          tasks: col.tasks.filter((task) => task.id !== taskId),
        }))
      )
    } catch (err) {
      console.error('[BoardPage]Erro ao deletar task:', err)
    }
  }

  const handleTaskMoveRequest = async (
    taskId: string,
    targetColumnId: string,
    newPosition: number
  ) => {
    if (!workspaceId) return
    try {
      await ApiClient.moveTask(workspaceId, taskId, { targetColumnId, newPosition })
      setColumns((prevColumns) => {
        let movedTask: Task | TaskWithUsers | null = null
        const withoutTask = prevColumns.map((col) => {
          const filtered = col.tasks.filter((task) => {
            if (task.id === taskId) {
              movedTask = { ...task, columnId: targetColumnId, position: newPosition }
              return false
            }
            return true
          })
          return { ...col, tasks: filtered }
        })

        if (!movedTask) return prevColumns

        return withoutTask.map((col) => {
          if (col.id !== targetColumnId) return col

          const tasks = [...col.tasks]
          tasks.splice(newPosition, 0, movedTask as Task | TaskWithUsers)
          return {
            ...col,
            tasks: tasks.map((task, position) => ({ ...task, position })),
          }
        })
      })
    } catch (err) {
      console.error('[BoardPage]Erro ao mover task:', err)
    }
  }

  const handleDeleteColumn = async (columnId: string) => {
    if (!workspaceId) return
    if (!confirm('Tem a certeza que deseja deletar esta coluna?')) return
    try {
      await ApiClient.deleteColumn(workspaceId, columnId)
      setColumns((prev) => prev.filter((col) => col.id !== columnId))
    } catch (err) {
      console.error('[BoardPage]Erro ao deletar coluna:', err)
    }
  }

  const handleCreateColumn = async () => {
    if (!newColumnTitle.trim() || !workspaceId) return

    try {
      const newColumn = await ApiClient.createColumn(workspaceId, {
        title: newColumnTitle.trim(),
      })
      // Colunas ainda sao atualizadas localmente; nao ha listener de socket para columns aqui.
      setColumns((prev) => [...prev, { ...newColumn, tasks: [] }])
      setNewColumnTitle('')
      setIsCreatingColumn(false)
    } catch (err) {
      console.error('[BoardPage]Erro ao criar coluna:', err)
    }
  }

  const openEditPriority = (
    taskId: string,
    currentPriority: 'low' | 'medium' | 'high' | 'urgent'
  ) => {
    setEditingTaskId(taskId)
    setEditingPriority(currentPriority)
  }

  const handleSavePriority = async () => {
    if (!editingTaskId || !workspaceId) return
    try {
      const updatedTask = await ApiClient.updateTask(workspaceId, editingTaskId, {
        priority: editingPriority,
      })
      const normalizedTask = normalizeBoardTask(updatedTask)
      setColumns((prevColumns) =>
        prevColumns.map((col) => ({
          ...col,
          tasks: col.tasks.map((task) =>
            task.id === normalizedTask.id ? normalizedTask : task
          ),
        }))
      )
      setEditingTaskId(null)
    } catch (err) {
      console.error('[BoardPage]Erro ao atualizar prioridade:', err)
    }
  }

  const handleCancel = () => {
    setIsCreatingTask(false)
    setNewTaskTitle('')
    setNewTaskDescription('')
    setNewTaskPriority('medium')
    setSelectedColumnId('')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cw-base">
        <Loader2 className="h-8 w-8 animate-spin text-cw-wave" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] min-h-0 flex-col bg-cw-base">
      {/* Header */}
      <header className="border-b border-cw-border p-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-cw-primary">Board</h1>
          <p className="text-sm text-cw-muted mt-1">Collaborate in real-time</p>
        </div>
        <div className="flex items-center gap-4">
          <PresenceStack users={onlineUsers} />
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="text-cw-muted hover:text-cw-primary"
          >
            ← Back to Workspaces
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-x-auto p-6">
        {error && (
          <div className="mb-6 rounded-md border border-cw-danger/40 bg-cw-danger/10 p-3 text-sm text-cw-danger">
            {error}
          </div>
        )}

        <div className="flex gap-4 pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
              onTaskMoved={handleTaskMoveRequest}
              onEditPriority={openEditPriority}
              onDeleteColumn={handleDeleteColumn}
              recentlyUpdatedTaskIds={recentlyUpdatedTaskIds}
            />
          ))}

          {/* Add Column Button */}
          <div className="w-80 shrink-0">
            <Button
              onClick={() => setIsCreatingColumn(true)}
              variant="outline"
              className="w-full border-cw-muted/50 text-cw-muted hover:text-cw-secondary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add column
            </Button>
          </div>
        </div>
      </main>

      {/* Create Column Modal */}
      {isCreatingColumn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-cw-surface border border-cw-border rounded-lg p-6 w-80">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-cw-primary">Add Column</h2>
              <button
                onClick={() => setIsCreatingColumn(false)}
                className="text-cw-muted hover:text-cw-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <Input
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Column title"
                autoFocus
                className="bg-cw-base border-cw-border"
              />

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleCreateColumn}
                  disabled={!newColumnTitle.trim()}
                  className="bg-cw-wave text-cw-base hover:bg-cw-wave/90"
                >
                  Create
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsCreatingColumn(false)}
                  className="text-cw-muted hover:text-cw-secondary"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Priority Modal */}
      {editingTaskId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-cw-surface border border-cw-border rounded-lg p-6 w-80">
            <h2 className="font-heading font-bold text-cw-primary mb-4">Edit Priority</h2>
            <select
              value={editingPriority}
              onChange={(e) =>
                setEditingPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')
              }
              className="w-full px-3 py-2 bg-cw-base border border-cw-border rounded text-cw-primary text-sm mb-4"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent Priority</option>
            </select>
            <div className="flex gap-2">
              <Button
                onClick={handleSavePriority}
                className="bg-cw-wave text-cw-base hover:bg-cw-wave/90"
              >
                Save
              </Button>
              <Button
                variant="ghost"
                onClick={() => setEditingTaskId(null)}
                className="text-cw-muted hover:text-cw-secondary"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isCreatingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-cw-surface border border-cw-border rounded-lg p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-cw-primary">Add Task</h2>
              <button
                onClick={handleCancel}
                className="text-cw-muted hover:text-cw-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title"
                autoFocus
                className="bg-cw-base border-cw-border"
              />
              <Input
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Description (optional)"
                className="bg-cw-base border-cw-border"
              />

              <select
                value={newTaskPriority}
                onChange={(e) =>
                  setNewTaskPriority(
                    e.target.value as 'low' | 'medium' | 'high' | 'urgent'
                  )
                }
                className="w-full px-3 py-2 bg-cw-base border border-cw-border rounded text-cw-primary text-sm"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Priority</option>
              </select>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleCreateTask}
                  disabled={!newTaskTitle.trim() || isSubmittingTask}
                  className="bg-cw-wave text-cw-base hover:bg-cw-wave/90"
                >
                  {isSubmittingTask ? 'Creating...' : 'Create'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isSubmittingTask}
                  className="text-cw-muted hover:text-cw-secondary"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
