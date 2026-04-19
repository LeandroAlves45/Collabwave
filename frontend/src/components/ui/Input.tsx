import React from 'react'
import { cn } from '@/utils/cn'

type InputProps = React.ComponentPropsWithoutRef<'input'>

/**
 * Input é um campo de formulário com estilos do tema.
 * Suporta todos os atributos HTML padrão (type, placeholder, required, etc).
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        /* Estilos base */
        'h-9 w-full rounded-md px-3 text-sm transition-colors',
        /* Cores do tema */
        'bg-[#081421] text-cw-text-primary placeholder:text-cw-text-muted',
        /* Border e hover */
        'border border-cw-border',
        'hover:border-cw-text-secondary',
        /* Focus state */
        'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cw-accent',
        /* Estados desativados */
        'disabled:cursor-not-allowed disabled:bg-cw-bg-secondary disabled:text-cw-text-muted disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)

Input.displayName = 'Input'

export { Input }
