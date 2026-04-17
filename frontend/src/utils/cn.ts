import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina classes de Tailwind sem conflitos.
 * clsx permite classes condicionais; twMerge resolve conflitos de Tailwind.
 */

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
