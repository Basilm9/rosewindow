/**
 * Core engine types for Rose Window.
 *
 * Everything here is pure data or pure functions: no React, no DOM, no randomness
 * except through an injected seeded RNG (`rng.ts`). Grid convention: row 0 is the
 * north edge, column 0 is the west edge.
 */

/** Grid coordinates. Row 0 is the top (north) edge; column 0 is the west edge. */
export interface Position {
  readonly row: number
  readonly col: number
}

/** The five glass colors. Order is display order for the draft pool. */
export const DIE_COLORS = ['red', 'yellow', 'blue', 'green', 'purple'] as const

export type DieColor = (typeof DIE_COLORS)[number]

/**
 * What the beam does when it enters a die of a given color (pitch §5):
 * warm colors turn clockwise, cool colors turn counter-clockwise, purple goes straight.
 */
export type Refraction = 'clockwise' | 'counterClockwise' | 'straight'

/** The beam law, keyed by color. This is rule data, not tunable config. */
export const REFRACTION_BY_COLOR: Readonly<Record<DieColor, Refraction>> = {
  red: 'clockwise',
  yellow: 'clockwise',
  blue: 'counterClockwise',
  green: 'counterClockwise',
  purple: 'straight',
}

export const DIRECTIONS = ['north', 'east', 'south', 'west'] as const

export type Direction = (typeof DIRECTIONS)[number]

/** Unit step for each direction: north decreases row, east increases column. */
export const DELTA_BY_DIRECTION: Readonly<Record<Direction, Position>> = {
  north: { row: -1, col: 0 },
  east: { row: 0, col: 1 },
  south: { row: 1, col: 0 },
  west: { row: 0, col: -1 },
}

/** 90° clockwise rotation: north → east → south → west → north. */
export function clockwise(direction: Direction): Direction {
  return DIRECTIONS[(DIRECTIONS.indexOf(direction) + 1) % DIRECTIONS.length]!
}

/** 90° counter-clockwise rotation: north → west → south → east → north. */
export function counterClockwise(direction: Direction): Direction {
  return DIRECTIONS[(DIRECTIONS.indexOf(direction) + DIRECTIONS.length - 1) % DIRECTIONS.length]!
}

/** An immutable colored die. Value is the printed face, 1–6. */
export interface Die {
  readonly color: DieColor
  readonly value: number
}

/** The printed demand on a window cell: a required color, a required value, or nothing. */
export type CellConstraint =
  | { readonly kind: 'open' }
  | { readonly kind: 'color'; readonly color: DieColor }
  | { readonly kind: 'value'; readonly value: number }

export function openConstraint(): CellConstraint {
  return { kind: 'open' }
}

export function colorConstraint(color: DieColor): CellConstraint {
  return { kind: 'color', color }
}

export function valueConstraint(value: number): CellConstraint {
  return { kind: 'value', value }
}

/** A named 4×4 arrangement of printed cell demands; two are offered per run. */
export interface WindowPattern {
  readonly id: string
  readonly name: string
  readonly description: string
  /** Row-major 4×4 grid of printed demands. */
  readonly constraints: readonly (readonly CellConstraint[])[]
}

/** Where the beam enters: an edge cell plus the inward direction it travels. */
export interface EntryPoint {
  readonly position: Position
  readonly direction: Direction
}

/**
 * Enumerates every legal entry point for an n×n grid: every edge cell with each
 * inward direction it admits. Corner cells admit two. For a 4×4 grid this is 20.
 * Deterministic order: cells scanned row-major, inward directions in N/E/S/W order.
 */
export function allEntryPoints(gridSize: number): EntryPoint[] {
  const points: EntryPoint[] = []
  const last = gridSize - 1
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const position: Position = { row, col }
      if (row === 0) points.push({ position, direction: 'south' })
      if (col === last) points.push({ position, direction: 'west' })
      if (row === last) points.push({ position, direction: 'north' })
      if (col === 0) points.push({ position, direction: 'east' })
    }
  }
  return points
}
