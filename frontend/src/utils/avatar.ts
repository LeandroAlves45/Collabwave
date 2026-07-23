// Deriva iniciais e cor determinística a partir de um nome, para avatares
// sem imagem (task cards, presença online). As mesmas iniciais recebem
// sempre a mesma cor.

const AVATAR_COLORS = [
  'bg-cyan-500',
  'bg-teal-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-500',
]

export function normalizeInitials(initials: string): string {
  return initials.trim().slice(0, 2).toUpperCase() || '?'
}

export function getAvatarColor(initials: string): string {
  const safeInitials = normalizeInitials(initials)
  if (safeInitials === '?') return 'bg-cw-muted'

  const secondIndex = safeInitials.length > 1 ? 1 : 0
  const code = safeInitials.charCodeAt(0) + safeInitials.charCodeAt(secondIndex)
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}
