// Mostra os utilizadores atualmente online no workspace, alimentado pelo
// evento de socket `workspace:presence_update` (ver services/socket.ts).

import type { ReactElement } from 'react'
import type { AuthUser } from '@/types/auth'
import { getAvatarColor, normalizeInitials } from '@/utils/avatar'

function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
}

interface PresenceAvatarProps {
  user: AuthUser
}

export function PresenceAvatar({ user }: PresenceAvatarProps): ReactElement {
  const initials = normalizeInitials(initialsFromName(user.name))

  return (
    <div
      className={`relative flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white ring-2 ring-cw-base ${getAvatarColor(initials)}`}
      title={`${user.name} · online`}
    >
      {initials}
      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 animate-presence-pulse rounded-full bg-cw-wave ring-2 ring-cw-base" />
    </div>
  )
}

interface PresenceStackProps {
  users: AuthUser[]
  max?: number
}

const DEFAULT_MAX_VISIBLE = 5

export function PresenceStack({
  users,
  max = DEFAULT_MAX_VISIBLE,
}: PresenceStackProps): ReactElement | null {
  if (users.length === 0) return null

  const visible = users.slice(0, max)
  const overflow = users.length - visible.length

  return (
    <div className="flex items-center -space-x-2" title={`${users.length} online`}>
      {visible.map((user) => (
        <PresenceAvatar key={user.id} user={user} />
      ))}
      {overflow > 0 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cw-muted text-xs font-semibold text-cw-base ring-2 ring-cw-base">
          +{overflow}
        </div>
      )}
    </div>
  )
}
