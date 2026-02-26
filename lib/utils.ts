import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Considera pagato se boolean true o stringa 'paid'/'true'/'t' (compatibilità DB legacy) */
export function isPaidValue(value: unknown): boolean {
  if (value === true) return true
  if (typeof value === 'string' && ['paid', 'true', 't'].includes(value.toLowerCase())) return true
  return false
}
