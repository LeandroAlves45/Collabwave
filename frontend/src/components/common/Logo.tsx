import React from 'react'
import { cn } from '@/utils/cn'

type LogoSize = 'sm' | 'md' | 'lg'

interface LogoProps {
  size?: LogoSize
  className?: string
  showText?: boolean
}

/**
 * Logo é o ícone de onda + texto "CollabWave".
 * Adaptado do design v0 para componente reutilizável.
 */
export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  className,
  showText = true,
}) => {
  /* Mapeamento de tamanho para classes Tailwind */
  // Presets de tamanho mantem SVG e texto alinhados nas paginas auth e no header.
  const sizeMap: Record<LogoSize, { icon: string; text: string }> = {
    sm: { icon: 'w-5 h-5', text: 'text-lg' },
    md: { icon: 'w-7 h-7', text: 'text-2xl' },
    lg: { icon: 'w-10 h-10', text: 'text-4xl' },
  }

  const { icon: iconSize, text: textSize } = sizeMap[size]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Ícone de onda SVG */}
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className={cn('shrink-0 text-cw-accent', iconSize)}
      >
        {/* Primeira onda (mais opaca) */}
        <path
          d="M4 20C4 20 8 12 16 12C24 12 28 20 28 20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Segunda onda (média opacidade) */}
        <path
          d="M4 16C4 16 8 8 16 8C24 8 28 16 28 16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />

        {/* Terceira onda (mais transparente) */}
        <path
          d="M4 24C4 24 8 16 16 16C24 16 28 24 28 24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.3"
        />
      </svg>

      {/* Texto do logo (opcional) */}
      {showText && (
        <span
          className={cn(
            'font-heading font-extrabold text-cw-text-primary',
            textSize,
          )}
        >
          CollabWave
        </span>
      )}
    </div>
  )
}

Logo.displayName = 'Logo'
