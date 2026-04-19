import type { ReactElement } from 'react'
import type { TaskPriority } from '@/types/task'

// Mantem o mapa exaustivo para novas prioridades do backend exigirem estilo aqui.
const priorityStyles: Record<TaskPriority, { bg: string; text: string; border: string; label: string }> = {
  low: {
    bg: 'bg-cw-muted/20',
    text: 'text-cw-muted',
    border: 'border-cw-muted/30',
    label: 'Low',
  },
  medium: {
    bg: 'bg-cw-wave/20',
    text: 'text-cw-wave',
    border: 'border-cw-wave/30',
    label: 'Medium',
  },
  high: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    label: 'High',
  },
  urgent: {
    bg: 'bg-cw-urgent/20',
    text: 'text-cw-urgent',
    border: 'border-cw-urgent/30',
    label: 'Urgent',
  },
}

interface PriorityBadgeProps {
  priority: TaskPriority
}

export function PriorityBadge({ priority }: PriorityBadgeProps): ReactElement {
  const style = priorityStyles[priority]

  return (
    <span
      className={`inline-block px-2 py-1 rounded text-xs font-medium border-thin ${style.bg} ${style.text} ${style.border}`}
    >
      {style.label}
    </span>
  )
}
