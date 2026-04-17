import React from 'react'
import { cn } from '@/utils/cn'

type CardProps = React.ComponentPropsWithoutRef<'div'>
type CardHeaderProps = React.ComponentPropsWithoutRef<'div'>
type CardTitleProps = React.ComponentPropsWithoutRef<'h2'>
type CardDescriptionProps = React.ComponentPropsWithoutRef<'p'>
type CardContentProps = React.ComponentPropsWithoutRef<'div'>
type CardFooterProps = React.ComponentPropsWithoutRef<'div'>

/**
 * Card é o container principal
 * Fornece background, border e padding base.
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border-[0.5px] border-cw-border bg-cw-surface p-6',
        className
      )}
      {...props}
    />
  )
)

Card.displayName = 'Card'

/**
 * CardHeader agrupa o título e descrição no topo
 */
const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mb-4', className)} {...props} />
  )
)

CardHeader.displayName = 'CardHeader'

/**
 * CardTitle é o título principal do card
 * Usa fonte display (Syne) para destaque
 */
const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('font-display text-xl font-bold text-cw-primary', className)}
      {...props}
    />
  )
)

CardTitle.displayName = 'CardTitle'

/**
 * CardDescription é o texto secundário abaixo do título
 */
const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-cw-secondary', className)} {...props} />
  )
)

CardDescription.displayName = 'CardDescription'

/**
 * CardContent encapsula o corpo principal do card.
 */
const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
)

CardContent.displayName = 'CardContent'

/**
 * CardFooter agrupa ações ou informação de rodapé
 */
const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mt-6 flex gap-2', className)} {...props} />
  )
)

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
