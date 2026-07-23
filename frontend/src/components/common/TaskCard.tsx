import type { ReactElement } from 'react'
import { useState } from 'react'
import { Trash2, Pencil } from 'lucide-react'
import type { Task, TaskWithUsers } from '@/types/task'
import { PriorityBadge } from './PriorityBadge'
import { getAvatarColor, normalizeInitials } from '@/utils/avatar'

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
  isRecentlyUpdated?: boolean
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
  isRecentlyUpdated,
}: TaskCardProps): ReactElement {
  // TaskWithUsers e opcional porque eventos do socket podem enviar apenas Task.
  const isTaskWithUsers = 'createdBy' in task
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div
      draggable
      onDragStart={(e) => {
        setIsDragging(true)
        onDragStart?.(e, task.id, task.columnId)
      }}
      onDragEnd={() => setIsDragging(false)}
      className={`group bg-cw-surface border-thin border-cw-border rounded-lg p-3 transition-[transform,box-shadow,border-color] duration-200 ease-out cursor-grab active:cursor-grabbing hover:border-cw-wave/40 hover:glow-wave ${isDragging ? 'scale-105 shadow-xl' : ''} ${isRecentlyUpdated ? 'animate-task-flash' : ''}`}
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
