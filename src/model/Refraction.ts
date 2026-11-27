import type { DieColor } from './Die'

/**
 * What the beam does when it enters a die of a given colour (FR-5.4): warm glass turns it
 * clockwise, cool glass counter-clockwise, purple lets it pass straight.
 */
export type Refraction = 'clockwise' | 'counterClockwise' | 'straight'

/**
 * The beam law, keyed by colour (FR-5.4): red/yellow clockwise, blue/green counterClockwise,
 * purple straight. This is rule data, not tunable configuration (moved here from
 * `engine/types.ts` in Prompt 35; frozen).
 */
export const REFRACTION_BY_COLOR: Readonly<Record<DieColor, Refraction>> = Object.freeze({
  red: 'clockwise',
  yellow: 'clockwise',
  blue: 'counterClockwise',
  green: 'counterClockwise',
  purple: 'straight',
})
