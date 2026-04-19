import type { ReactElement } from 'react'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { ColumnWithTasks, Task, TaskWithUsers } from '@/types/task'
import { TaskCard } from './TaskCard'
import { WaveLine } from './WaveLine'
import { Button } from '../ui/Button'

interface KanbanColumnProps {
  column: ColumnWithTasks
  onAddTask: (columnId: string) => void
  onDeleteTask: (taskId: string) => void
  onDeleteColumn?: (columnId: string) => void
  onTaskMoved?: (taskId: string, targetColumnId: string, newPosition: number) => void
  onEditPriority?: (taskId: string, currentPriority: 'low' | 'medium' | 'high' | 'urgent') => void
}

export function KanbanColumn({ column, onAddTask, onDeleteTask, onTaskMoved, onEditPriority, onDeleteColumn }: KanbanColumnProps): ReactElement {
  const tasks = column.tasks as (Task | TaskWithUsers)[]
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    // dataTransfer leva o id da task entre colunas; o estado local serve como fallback.
    setDraggedTaskId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('taskId', taskId)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId') || draggedTaskId
    if (!taskId) return

    // Ao largar numa coluna, a task vai para o fim; reordenacao interna ainda nao existe aqui.
    const newPosition = tasks.length
    onTaskMoved?.(taskId, column.id, newPosition)
    setDraggedTaskId(null)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="w-80 shrink-0 bg-cw-surface rounded-lg p-4 flex flex-col"
    >
      {/* WaveLine */}
      <WaveLine isActive className="mb-4" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 group">
        <div>
          <h2 className="font-heading font-bold text-cw-primary">{column.title}</h2>
          <p className="text-xs text-cw-muted">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => onDeleteColumn?.(column.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-cw-danger"
          title="Delete column"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tasks List */}
      <div className="flex-1 space-y-2 min-h-0 overflow-y-auto mb-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDelete={onDeleteTask}
            onDragStart={handleDragStart}
            onEditPriority={onEditPriority}
          />
        ))}
      </div>

      {/* Add Task Button */}
      <Button
        onClick={() => onAddTask(column.id)}
        variant="ghost"
        className="w-full justify-start text-cw-wave hover:text-cw-wave hover:bg-cw-base text-sm"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add task
      </Button>
    </div>
  )
}
