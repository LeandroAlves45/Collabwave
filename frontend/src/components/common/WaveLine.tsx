// src/components/common/WaveLine.tsx
// Linha decorativa com animação pulsante

import { cn } from '@/utils/cn'

interface WaveLineProps {
  isActive?: boolean // Se true, animação pulsante é ativada
  className?: string
}

/**
 * WaveLine é uma linha decorativa com animação pulsante opcional.
 */
export function WaveLine({ isActive = true, className }: WaveLineProps) {
  return (
    <div
      className={cn(
        // Linha horizontal de 0.5px de altura, largura total, bordas arredondadas
        'h-0.5 w-full rounded-full transition-all duration-300',
        // Estado ativo: cor teal com animação
        isActive
          ? 'bg-cw-wave animate-wave-pulse'
          : // Estado inativo: cor de border normal
            'bg-cw-border',
        className
      )}
      aria-hidden="true" // Decorativo, sem conteúdo semântico
    />
  )
}

WaveLine.displayName = 'WaveLine'
