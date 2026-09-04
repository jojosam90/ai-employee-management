import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// All figures are Singapore dollars — shown as "S$" to avoid the bare "$".
const nf0 = new Intl.NumberFormat('en-SG', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function money(n: number) {
  return `S$${nf0.format(Math.round(n))}`
}

export function money2(n: number) {
  return `S$${nf2.format(n)}`
}

export function pct(n: number, digits = 0) {
  return `${(n * 100).toFixed(digits)}%`
}

export function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}
