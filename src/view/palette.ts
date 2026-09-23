import type { Die, DieColor, Refraction } from '../engine/types'

/** Stained-glass palette per color: translucent fill, lead-tinted ring, light text. */
export const DIE_STYLES: Record<DieColor, { fill: string; ring: string; text: string }> = {
  red: { fill: 'glass-red glass-fill', ring: 'ring-rose-300/50', text: 'text-rose-100' },
  yellow: { fill: 'glass-yellow glass-fill', ring: 'ring-amber-200/50', text: 'text-amber-100' },
  blue: { fill: 'glass-blue glass-fill', ring: 'ring-sky-300/50', text: 'text-sky-100' },
  green: { fill: 'glass-green glass-fill', ring: 'ring-emerald-200/50', text: 'text-emerald-100' },
  purple: { fill: 'glass-purple glass-fill', ring: 'ring-violet-300/50', text: 'text-violet-100' },
}

/** The same symbols appear on panes and in the light guide. */
export const REFRACTION_SYMBOLS: Record<Refraction, string> = {
  clockwise: '↻',
  counterClockwise: '↺',
  straight: '↑',
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

/** Multiplier heat: the hotter the chain, the hotter the color (shared with the HUD). */
export const MULTIPLIER_HEAT: Record<number, string> = {
  1: '#fff4cc',
  2: '#ffd34d',
  3: '#ff9d2e',
  4: '#ff5a7a',
  5: '#d68bff',
}
