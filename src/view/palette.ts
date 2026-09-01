import type { Die, DieColor } from '../engine/types'

/** Stained-glass palette per color: translucent fill, lead-tinted ring, light text. */
export const DIE_STYLES: Record<DieColor, { fill: string; ring: string; text: string }> = {
  red: { fill: 'bg-red-600/70', ring: 'ring-red-400/40', text: 'text-red-50' },
  yellow: { fill: 'bg-amber-300/70', ring: 'ring-amber-200/50', text: 'text-amber-50' },
  blue: { fill: 'bg-sky-600/70', ring: 'ring-sky-400/40', text: 'text-sky-50' },
  green: { fill: 'bg-emerald-600/70', ring: 'ring-emerald-400/40', text: 'text-emerald-50' },
  purple: { fill: 'bg-fuchsia-600/70', ring: 'ring-fuchsia-400/40', text: 'text-fuchsia-50' },
}

export function dieLabel(die: Die): string {
  return `${die.color} ${die.value}`
}

export const DIE_SIZES = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-12 w-12 text-lg',
  lg: 'h-16 w-16 text-2xl',
} as const

export type DieSize = keyof typeof DIE_SIZES
