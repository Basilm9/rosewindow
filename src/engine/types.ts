/**
 * Core engine types for Rose Window.
 *
 * Everything here is pure data or pure functions: no React, no DOM, no randomness
 * except through an injected seeded RNG (`rng.ts`). Grid convention: row 0 is the
 * north edge, column 0 is the west edge.
 */

import type { Position } from '../model/Position'
import { Die } from '../model/Die'
import type { DieColor } from '../model/Die'
import { Direction as CompassDirection } from '../model/Direction'
import type { DirectionName } from '../model/Direction'
import { ColorConstraint, OpenConstraint, ValueConstraint } from '../model/CellConstraint'
import type { CellConstraint } from '../model/CellConstraint'

/** Grid coordinates (moved to `src/model/Position.ts`; re-exported here until Prompt 59). */
export type { Position }

/** Die, its colors and their order (moved to `src/model/Die.ts`; re-exported here until Prompt 59). */
export { DIE_COLORS, Die } from '../model/Die'
export type { DieColor } from '../model/Die'

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

/** Compass names, clockwise from north (moved to `src/model/Direction.ts`; re-exported until Prompt 59). */
export { DIRECTION_NAMES as DIRECTIONS } from '../model/Direction'

/** Legacy string form of a direction; the beam/engine code uses it until Prompt 35. */
export type Direction = DirectionName

/** Unit step for each direction, built from {@link CompassDirection.ALL}: north decreases row, east increases column. */
export const DELTA_BY_DIRECTION: Readonly<Record<Direction, Position>> = Object.fromEntries(
  CompassDirection.ALL.map((d) => [d.name, d.delta]),
) as Record<Direction, Position>

/** 90° clockwise rotation: north → east → south → west → north (delegates to {@link CompassDirection.clockwise}). */
export function clockwise(direction: Direction): Direction {
  return CompassDirection.fromName(direction).clockwise().name
}

/** 90° counter-clockwise rotation: north → west → south → east → north (delegates to {@link CompassDirection.counterClockwise}). */
export function counterClockwise(direction: Direction): Direction {
  return CompassDirection.fromName(direction).counterClockwise().name
}

/** Structural equality: same color and same value (delegates to {@link Die.equals}). */
export function sameDie(a: Die, b: Die): boolean {
  return Die.equals(a, b)
}

/** Neighbour offsets (moved to `src/model/Position.ts`; re-exported here until Prompt 59). */
export { ORTHOGONAL_DELTAS, DIAGONAL_DELTAS } from '../model/Position'

/** Printed cell demands (moved to `src/model/CellConstraint.ts`; re-exported here until Prompt 59). */
export { OpenConstraint, ColorConstraint, ValueConstraint } from '../model/CellConstraint'
export type { CellConstraint }

/** Creates an immutable open-pane demand. */
export function openConstraint(): CellConstraint {
  return new OpenConstraint()
}

/** Creates an immutable printed color demand. */
export function colorConstraint(color: DieColor): CellConstraint {
  return new ColorConstraint(color)
}

/** Creates an immutable printed value demand. */
export function valueConstraint(value: number): CellConstraint {
  return new ValueConstraint(value)
}

/** Window patterns (moved to `src/model/WindowPattern.ts` as a class; re-exported here until Prompt 59). */
export type { WindowPattern } from '../model/WindowPattern'

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
