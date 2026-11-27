import type { Die } from './Die'
import type { Direction, DirectionName } from './Direction'
import type { Position } from './Position'

/**
 * Plain form of a {@link BeamSegment}: the legacy engine `BeamSegment` interface shape, with the
 * direction as its compass name and without the multiplier.
 */
export interface LegacyBeamSegmentData {
  /** The cell entered. */
  readonly position: Position
  /** Compass name of the direction of travel on entry (pre-refraction). */
  readonly direction: DirectionName
  /** The die in the cell, or null for an empty pane. */
  readonly die: Die | null
  /** Points the cell awarded. */
  readonly points: number
}

/**
 * One cell of a beam traversal (FR-5.3, FR-5.10): recorded in the order the cells are struck.
 *
 * Data only: it never computes refraction or scoring rules. `points` is derived in the
 * constructor as `die === null ? 0 : die.value * multiplier` — the exact expression of the
 * reference tracer loop — so it can never disagree with `die` and `multiplier`. Scoring happens
 * on entry, before this cell's die refracts the beam (FR-5.5), which is why `direction` is the
 * pre-refraction direction and `multiplier` the pre-bump value.
 *
 * Immutable: the position is copied and frozen, and the instance is frozen. Its only own
 * enumerable fields are `position`, `direction`, `die`, `multiplier` and `points`.
 */
export class BeamSegment {
  /** The cell entered (a frozen copy of the constructor argument). */
  readonly position: Position

  /** Direction of travel on entry — before this cell's die refracts the beam (FR-5.5). */
  readonly direction: Direction

  /** The die in the cell, or null for an empty pane (which awards 0). */
  readonly die: Die | null

  /** Multiplier in effect when the cell was scored: 1..multiplierCap (supplied by the tracer). */
  readonly multiplier: number

  /** Points awarded: `die.value × multiplier`, or 0 for an empty pane. */
  readonly points: number

  /**
   * Freezes the segment and derives `points`. Raises no exceptions; the multiplier is trusted
   * because only the beam tracer supplies it.
   * @param position - the cell entered; copied, so later mutation of the argument has no effect.
   * @param direction - the direction of travel on entry, before refraction.
   * @param die - the die in the cell, or null for an empty pane.
   * @param multiplier - the multiplier in effect when the cell is scored.
   */
  constructor(position: Position, direction: Direction, die: Die | null, multiplier: number) {
    this.position = Object.freeze({ row: position.row, col: position.col })
    this.direction = direction
    this.die = die
    this.multiplier = multiplier
    this.points = die === null ? 0 : die.value * multiplier
    Object.freeze(this)
  }

  /**
   * Whether the cell held a die.
   * @returns true iff {@link BeamSegment.die} is not null.
   */
  get struck(): boolean {
    return this.die !== null
  }

  /**
   * The legacy plain shape used by the engine shims.
   * @returns a new `{ position, direction, die, points }` object with a fresh position copy and
   *   the compass name of the direction; the multiplier is omitted.
   */
  toData(): LegacyBeamSegmentData {
    return {
      position: { row: this.position.row, col: this.position.col },
      direction: this.direction.name,
      die: this.die,
      points: this.points,
    }
  }
}
