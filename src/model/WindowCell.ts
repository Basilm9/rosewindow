import type { CellConstraint } from './CellConstraint'
import type { Die, DieData } from './Die'
import { PlacementError } from './GameError'

/**
 * One pane of the window (FR-4.1, FR-4.2): its printed demand plus zero-or-one placed die.
 *
 * Immutable value object: instances are frozen and placing a die returns a NEW cell, so an
 * existing cell is never mutated — which makes "a rejected placement never changes the window"
 * (NFR-6.1) easy to guarantee. Its only own enumerable properties are `constraint` and `die`, so
 * it deep-equals the plain `{ constraint, die }` shape the reference implementation returned.
 */
export class WindowCell {
  /** The printed demand (never null; open panes use `OpenConstraint`). */
  readonly constraint: CellConstraint

  /** The placed die, or `null` while the pane is empty. */
  readonly die: Die | null

  /**
   * Assigns both fields, then freezes the instance.
   * @param constraint - the pane's printed demand, declared by the {@link CellConstraint}
   *   interface.
   * @param die - the placed die; defaults to `null` (an empty pane).
   */
  constructor(constraint: CellConstraint, die: Die | null = null) {
    this.constraint = constraint
    this.die = die
    Object.freeze(this)
  }

  /**
   * Whether the pane is still empty. A prototype getter, so it is not an own enumerable property.
   * @returns `true` while no die is placed.
   */
  get isEmpty(): boolean {
    return this.die === null
  }

  /**
   * Whether `die` satisfies ONLY this pane's printed demand (FR-4.4/4.5); neighbour and
   * connectivity laws are not checked here. `PlacementValidator` keeps its own check on the raw
   * constraint grid and is deliberately not routed through this method.
   * @param die - a die or plain die data.
   * @returns the result of {@link CellConstraint.accepts} on this pane's constraint.
   */
  satisfiedBy(die: DieData): boolean {
    return this.constraint.accepts(die)
  }

  /**
   * A new cell with the same demand holding `die` (FR-4.10). Never returns `this`. Placement
   * laws other than occupancy are the caller's responsibility.
   * @param die - the die to place.
   * @returns a new, frozen cell holding `die`.
   * @throws PlacementError `cellOccupied` if this cell already holds a die.
   */
  withDie(die: Die): WindowCell {
    if (this.die !== null) {
      throw new PlacementError({ kind: 'cellOccupied' })
    }
    return new WindowCell(this.constraint, die)
  }

  /**
   * A new empty cell with the same demand. For tooling and tests only — game rules never remove
   * dice. Idempotent: clearing an empty cell returns a new equal cell and never throws.
   * @returns a new, frozen, empty cell.
   */
  cleared(): WindowCell {
    return new WindowCell(this.constraint)
  }
}
