import React from 'react'
import { cn } from '@/utils/cn'

/* Tipos de variantes do botão */
type ButtonVariant = 'solid' | 'outline' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon-sm'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
}

/**
 * Button component com suport a múltiplas variantes e tamanhos
 * Herda atributos nativos de HTMLButton (className, onClick, disabled, etc.)
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'solid', size = 'md', isLoading = false, disabled, className, children, ...props },
    ref
  ) => {
    /* Estilos base aplicados a todos os buttons */
    const baseStyles = 'font-medium rounded transition-colors duration-200 focus-visible:ring-2'

    /* Estilos por variante */
    const variantStyles: Record<ButtonVariant, string> = {
      solid:
        'bg-cw-wave text-cw-base hover:bg-cw-wave/90 disabled:bg-cw-border disabled:text-cw-muted',
      ghost: 'bg-transparent text-cw-primary hover:bg-cw-surface disabled:text-cw-muted',
      outline:
        'border border-cw-border text-cw-primary hover:bg-cw-surface disabled:border-cw-muted disabled:text-cw-muted',
    }

    /* Estilos por tamanho */
    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
      'icon-sm': 'w-6 h-6 flex items-center justify-center p-0',
    }

    /*Combina estilos base, variante e tamanho */
    const buttonClassName = cn(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      {
        /* Desativa visualmente se disabled ou isLoading */
        'opacity-50 cursor-not-allowed': disabled || isLoading,
      },
      className // Permite customização adicional via props
    )

    return (
      <button ref={ref} disabled={disabled || isLoading} className={buttonClassName} {...props}>
        {/* Se isLoading, mostra spinner simples*/}
        {isLoading ? <span className="inline-block animate-spin">⟳</span> : children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
