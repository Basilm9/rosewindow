import type { DieGrid } from './placementValidator'
import {
  DELTA_BY_DIRECTION,
  REFRACTION_BY_COLOR,
  clockwise,
  counterClockwise,
} from './types'
import type { Die, Direction, EntryPoint, Position } from './types'

/**
 * One cell of the beam's traversal (pitch §8.2): where it is, the direction of
 * travel with which it entered and occupies the cell (pre-refraction), the die
 * found there if any, and the points the cell awarded.
 */
export interface BeamSegment {
  readonly position: Position
  readonly direction: Direction
  readonly die: Die | null
  readonly points: number
}

/**
 * The complete ordered result of a trace. `termination` records why the beam
 * stopped: `exitedGrid` (moved out of bounds) or `cycle` (the next cell+direction
 * pair was already occupied on this trace).
 */
export interface BeamPath {
  readonly segments: readonly BeamSegment[]
  readonly totalScore: number
  readonly termination: 'exitedGrid' | 'cycle'
}

/** Multiplier ceiling from pitch §5; overridable for rule tuning experiments. */
export const DEFAULT_MULTIPLIER_CAP = 5

/**
 * The beam tracer (pitch §5, §11) — pure and iterative. From a window grid and an
 * entry point it produces the ordered `BeamPath`, cell by cell.
 *
 * Rule law, with the two documented ambiguity resolutions:
 *
 * 1. Multiplier timing. A die is scored on entry, before its own refraction is
 *    applied, so the die that causes a bend is scored at the pre-bump multiplier
 *    and the *next* struck die benefits from it.
 *
 * 2. Cycle guard. Before the beam moves into a cell it checks whether that
 *    (cell, direction) pair was already occupied on this trace; if so the trace
 *    terminates and the repeated entry is NOT recorded or scored. A cell MAY be
 *    re-entered with a different direction — only exact (cell, direction) pairs
 *    repeat.
 *
 * 3. Lockout is measured in cells, not dice: after a bend of value V the next
 *    V-1 cells (empty or not) cannot bend the beam, though dice there are still
 *    scored. A value-1 bend therefore permits an immediate second turn.
 *
 * Bounded by grid area x 4 directions (each (cell, direction) pair at most once).
 */
export function traceBeam(
  grid: DieGrid,
  entry: EntryPoint,
  multiplierCap: number = DEFAULT_MULTIPLIER_CAP,
): BeamPath {
  const size = grid.length
  const dieAt = (p: Position): Die | null => grid[p.row]?.[p.col] ?? null
  const pairKey = (p: Position, d: Direction): string => `${p.row}:${p.col}:${d}`

  const segments: BeamSegment[] = []
  let totalScore = 0
  let multiplier = 1
  let lockout = 0
  let position = entry.position
  let direction = entry.direction
  const visited = new Set<string>([pairKey(position, direction)])
  let termination: BeamPath['termination'] = 'exitedGrid'

  for (;;) {
    const die = dieAt(position)
    const points = die === null ? 0 : die.value * multiplier
    totalScore += points
    segments.push({ position, direction, die, points })

    const refraction = die === null ? 'straight' : REFRACTION_BY_COLOR[die.color]
    if (die !== null && lockout === 0 && refraction !== 'straight') {
      direction = refraction === 'clockwise' ? clockwise(direction) : counterClockwise(direction)
      multiplier = Math.min(multiplier + 1, multiplierCap)
      lockout = die.value - 1
    } else if (lockout > 0) {
      lockout -= 1
    }

    const delta = DELTA_BY_DIRECTION[direction]
    const next: Position = { row: position.row + delta.row, col: position.col + delta.col }
    if (next.row < 0 || next.row >= size || next.col < 0 || next.col >= size) {
      termination = 'exitedGrid'
      break
    }
    const nextKey = pairKey(next, direction)
    if (visited.has(nextKey)) {
      termination = 'cycle'
      break
    }
    visited.add(nextKey)
    position = next
  }

  return { segments, totalScore, termination }
}
