// frontend/src/components/common/WorkspaceCard.tsx
// Card de workspace para grid na pagina de workspaces.

import { cn } from '@/utils/cn'
import { WaveLine } from './WaveLine'
import { Users, Calendar, Share2 } from 'lucide-react'
import type { WorkspaceWithRole } from '@/stores/workspaceStore'
import { Button } from '@/components/ui/Button'

interface WorkspaceCardProps {
  workspace: WorkspaceWithRole
  onClick?: () => void
  onShare?: (workspace: WorkspaceWithRole) => void
  className?: string
}

export function WorkspaceCard({
  workspace,
  onClick,
  onShare,
  className,
}: WorkspaceCardProps) {
  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const canShareInvite = workspace.role === 'owner' || workspace.role === 'admin'

  return (
    <article
      className={cn(
        'w-full text-left bg-cw-surface border-thin border-cw-border rounded-lg',
        'p-4 transition-all duration-200',
        'hover:border-cw-muted hover:bg-cw-surface/80',
        'group',
        className
      )}
    >
      <button
        onClick={onClick}
        className="w-full rounded-md text-left focus:outline-none focus:ring-2 focus:ring-cw-wave/50"
      >
        <WaveLine isActive={true} className="mb-3" />

        <h3 className="font-heading font-bold text-lg text-cw-primary mt-3 group-hover:text-cw-wave transition-colors">
          {workspace.name}
        </h3>

        {workspace.description && (
          <p className="text-sm text-cw-muted mt-1 line-clamp-2">{workspace.description}</p>
        )}

        <div className="flex items-center gap-4 mt-4 text-xs text-cw-secondary">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {workspace.role === 'owner' ? '1 member' : 'member'}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(workspace.createdAt)}
          </span>
        </div>
      </button>

      {canShareInvite && onShare && (
        <div className="mt-4 border-t border-cw-border pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onShare(workspace)}
            className="w-full border-cw-border text-cw-secondary hover:text-cw-primary"
            aria-label="Share invite code"
          >
            <Share2 className="h-3.5 w-3.5 mr-2" />
            Share invite
          </Button>
        </div>
      )}
    </article>
  )
}

WorkspaceCard.displayName = 'WorkspaceCard'
