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
        'w-full px-3 py-2 rounded-md text-sm',
        /* Cores do tema */
        'bg-cw-base text-cw-primary placeholder:text-cw-muted',
        /* Border e hover */
        'border-[0.5px] border-cw-border',
        'hover:border-cw-secondary',
        /* Focus state */
        'focus:outline-none focus:ring-2 focus:ring-cw-wave focus:border-transparent',
        /* Estados desativados */
        'disabled:bg-cw-surface disabled:text-cw-muted disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)

Input.displayName = 'Input'

export { Input }