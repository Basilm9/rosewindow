import { BeamPath } from './BeamPath'
import type { BeamTermination } from './BeamPath'
import { BeamSegment } from './BeamSegment'
import type { Die } from './Die'
import type { Direction } from './Direction'
import type { EntryPoint } from './EntryPoint'
import { DEFAULT_MULTIPLIER_CAP } from './GameConfig'
import { GameError } from './GameError'
import type { DieGrid } from './GlassWindow'
import type { Position } from './Position'
import { REFRACTION_BY_COLOR } from './Refraction'

/**
 * Pure, iterative beam traversal (FR-5.2–5.9). From a die grid and an entry point it produces
 * the ordered {@link BeamPath}, cell by cell. Bounded by gridSize² × 4 entries (NFR-1.4): each
 * (cell, direction) pair is entered at most once.
 *
 * The only state is the configured {@link BeamTracer.multiplierCap}; every traversal variable is
 * local to {@link BeamTracer.trace}, so one tracer may be reused for any number of traces.
 */
export class BeamTracer {
  /** Multiplier ceiling; Game passes GameConfig.multiplierCap (default 5, FR-5.6). */
  readonly multiplierCap: number

  /**
   * Creates a tracer with a fixed multiplier ceiling and freezes it.
   * @param multiplierCap - the ceiling for the multiplier (default {@link DEFAULT_MULTIPLIER_CAP}).
   */
  constructor(multiplierCap: number = DEFAULT_MULTIPLIER_CAP) {
    this.multiplierCap = multiplierCap
    Object.freeze(this)
  }

  /**
   * Traces one beam over a square die grid.
   *
   * Loop order (ported statement by statement from the reference tracer):
   * 1. `multiplier = 1`, `lockout = 0`, the entry pair is marked visited.
   * 2. Record the segment for the current cell — **score first**.
   * 3. If the cell holds a die, no lockout is active and its colour refracts: turn, raise the
   *    multiplier by 1 up to {@link BeamTracer.multiplierCap}, set `lockout = value − 1`.
   *    Otherwise, if lockout is active, spend one cell of it.
   * 4. Step one cell; leaving the grid ends the trace with `'exitedGrid'` (FR-5.8).
   * 5. If the new (cell, direction) pair was already visited the trace ends with `'cycle'`;
   *    otherwise mark it and continue at 2.
   *
   * Ambiguity resolutions:
   * - **Multiplier timing (score before bend, FR-5.3, FR-5.5).** A die is scored on entry at the
   *   multiplier in effect *before* its own refraction; the die that causes a bend is scored at
   *   the pre-bump multiplier and the next struck die benefits from it.
   * - **Cycle guard (FR-5.9).** Before entering a cell the tracer checks whether that exact
   *   (cell, direction) pair was already entered on this trace; if so it stops and the repeated
   *   entry is NOT recorded or scored. A cell may be re-entered in a different direction.
   * - **Lockout in cells (FR-5.7).** After a bend on a die of value V the next V − 1 cells —
   *   empty panes included — cannot bend the beam; dice there are still scored. A value-1 bend
   *   therefore permits an immediate second turn.
   *
   * Pure: neither the grid, the entry nor this tracer is mutated.
   * @param grid - square die grid, row 0 north, column 0 west; `null` is an empty pane.
   * @param entry - edge cell and inward direction; must satisfy `entry.isInwardFor(grid.length)`.
   * @returns the path, with segments in strike order.
   * @throws {GameError} `invalidArgument` — the grid is empty or not square, or the entry is not
   *   inward for the grid (detail `beam entry … is not inward …`).
   */
  trace(grid: DieGrid, entry: EntryPoint): BeamPath {
    const size = grid.length
    if (size === 0 || grid.some((row) => row.length !== size)) {
      throw new GameError({ kind: 'invalidArgument', detail: 'beam grid must be non-empty and square' })
    }
    if (!entry.isInwardFor(size)) {
      throw new GameError({
        kind: 'invalidArgument',
        detail: `beam entry (${entry.position.row},${entry.position.col},${entry.direction.name}) is not inward for a ${size}×${size} grid`,
      })
    }
    const dieAt = (p: Position): Die | null => grid[p.row]?.[p.col] ?? null
    const pairKey = (p: Position, d: Direction): string => `${p.row}:${p.col}:${d.name}`

    const segments: BeamSegment[] = []
    let multiplier = 1
    let lockout = 0
    let position: Position = entry.position
    let direction: Direction = entry.direction
    const visited = new Set<string>([pairKey(position, direction)])
    let termination: BeamTermination = 'exitedGrid'

    for (;;) {
      const die = dieAt(position)
      segments.push(new BeamSegment(position, direction, die, multiplier))

      const refraction = die === null ? 'straight' : REFRACTION_BY_COLOR[die.color]
      if (die !== null && lockout === 0 && refraction !== 'straight') {
        direction = refraction === 'clockwise' ? direction.clockwise() : direction.counterClockwise()
        multiplier = Math.min(multiplier + 1, this.multiplierCap)
        lockout = die.value - 1
      } else if (lockout > 0) {
        lockout -= 1
      }

      const delta = direction.delta
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

    return new BeamPath(segments, termination)
  }
}
