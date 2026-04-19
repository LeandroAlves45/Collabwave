import type { ReactElement } from 'react'
import { Trash2, Pencil } from 'lucide-react'
import type { Task, TaskWithUsers } from '@/types/task'
import { PriorityBadge } from './PriorityBadge'

interface TaskCardProps {
  task: Task | TaskWithUsers
  onDelete: (taskId: string) => void
  onDragStart?: (
    e: React.DragEvent<HTMLDivElement>,
    taskId: string,
    columnId: string
  ) => void
  onEditPriority?: (
    taskId: string,
    currentPriority: 'low' | 'medium' | 'high' | 'urgent'
  ) => void
}

function getAvatarColor(initials: string): string {
  // Paleta deterministica: as mesmas iniciais devem receber sempre a mesma cor.
  const colors = [
    'bg-cyan-500',
    'bg-teal-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-rose-500',
    'bg-orange-500',
    'bg-amber-500',
  ]
  const safeInitials = normalizeInitials(initials)
  if (safeInitials === '?') return 'bg-cw-muted'

  const secondIndex = safeInitials.length > 1 ? 1 : 0
  const code = safeInitials.charCodeAt(0) + safeInitials.charCodeAt(secondIndex)
  return colors[code % colors.length]
}

function normalizeInitials(initials: string): string {
  return initials.trim().slice(0, 2).toUpperCase() || '?'
}

function AvatarBadge({
  initials,
  name,
}: {
  initials: string
  name: string
}): ReactElement {
  const safeInitials = normalizeInitials(initials)

  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white ${getAvatarColor(initials)}`}
      title={name}
    >
      {safeInitials}
    </div>
  )
}

export function TaskCard({
  task,
  onDelete,
  onDragStart,
  onEditPriority,
}: TaskCardProps): ReactElement {
  // TaskWithUsers e opcional porque eventos do socket podem enviar apenas Task.
  const isTaskWithUsers = 'createdBy' in task

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, task.id, task.columnId)}
      className="group bg-cw-surface border-thin border-cw-border rounded-lg p-3 hover:border-cw-muted transition-colors cursor-grab active:cursor-grabbing"
    >
      {/* Header: Título + Delete Button */}
      <div className="flex justify-between items-start gap-2 mb-2">
        <h3 className="font-medium text-cw-primary text-sm flex-1 wrap-break-words">
          {task.title}
        </h3>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-cw-danger"
          title="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Descrição */}
      {task.description && (
        <p className="text-xs text-cw-muted mb-2 line-clamp-2">{task.description}</p>
      )}

      {/* Footer: Priority + Avatar */}
      {/* A prioridade e editavel no card; o avatar so aparece quando ha dados do utilizador. */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onEditPriority?.(task.id, task.priority)}
          className="hover:opacity-80 transition-opacity flex items-center gap-1 group"
          title="Click to edit priority"
        >
          <PriorityBadge priority={task.priority} />
          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-cw-muted" />
        </button>
        {isTaskWithUsers && 'createdBy' in task && (
          <AvatarBadge initials={task.createdBy.initials} name={task.createdBy.name} />
        )}
      </div>
    </div>
  )
}
