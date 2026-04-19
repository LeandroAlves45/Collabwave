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
    {
      variant = 'solid',
      size = 'md',
      isLoading = false,
      disabled,
      className,
      children,
      type = 'button', // Default type is "button" to prevent accidental form submissions
      ...props
    },
    ref
  ) => {
    /* Estilos base aplicados a todos os buttons */
    const baseStyles =
      'inline-flex items-center justify-center rounded-md font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-cw-accent'

    /* Estilos por variante */
    const variantStyles: Record<ButtonVariant, string> = {
      solid:
        'bg-cw-accent text-[#041119] hover:bg-cw-accent/90 disabled:bg-cw-border disabled:text-cw-text-muted',
      ghost:
        'bg-transparent text-cw-text-primary hover:bg-cw-bg-secondary disabled:text-cw-text-muted',
      outline:
        'border border-cw-border text-cw-text-primary hover:bg-cw-bg-secondary disabled:border-cw-text-muted disabled:text-cw-text-muted',
    }

    /* Estilos por tamanho */
    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'h-9 px-4 text-sm',
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
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={buttonClassName}
        {...props}
      >
        {/* Se isLoading, mostra spinner simples*/}
        {isLoading ? <span className="inline-block animate-spin">⟳</span> : children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
