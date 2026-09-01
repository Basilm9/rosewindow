import type { CellConstraint, Die, WindowPattern } from './types'
import type { DieGrid } from './placementValidator'

/** One window cell: its printed demand plus zero-or-one placed die (pitch §8.2). */
export interface WindowCell {
  readonly constraint: CellConstraint
  readonly die: Die | null
}

/**
 * The player's window (pitch §8.2 `GlassWindow`): owns the 4x4 grid of cells,
 * exposing bounds/occupancy queries and the grid views the pure functions
 * (`findPlacementViolation`, `traceBeam`) consume. Placement itself is never
 * validated here — call `assertPlacementValid` first; `place` trusts its caller.
 */
export class GlassWindow {
  readonly #dice: (Die | null)[][]

  private constructor(
    readonly pattern: WindowPattern,
    readonly gridSize: number,
  ) {
    this.#dice = Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => null))
  }

  static fromPattern(pattern: WindowPattern): GlassWindow {
    return new GlassWindow(pattern, pattern.constraints.length)
  }

  get constraints(): readonly (readonly CellConstraint[])[] {
    return this.pattern.constraints
  }

  /** Read-only view of the placed dice, the shape the pure functions consume. */
  get dice(): DieGrid {
    return this.#dice.map((row) => [...row])
  }

  dieAt(position: { readonly row: number; readonly col: number }): Die | null {
    return this.#dice[position.row]?.[position.col] ?? null
  }

  cellAt(position: { readonly row: number; readonly col: number }): WindowCell {
    return {
      constraint: this.pattern.constraints[position.row]![position.col]!,
      die: this.dieAt(position),
    }
  }

  get placedCount(): number {
    return this.#dice.flat().filter((d) => d !== null).length
  }

  /** Commits a die to a cell. Validation is the caller's responsibility. */
  place(die: Die, position: { readonly row: number; readonly col: number }): void {
    this.#dice[position.row]![position.col] = die
  }

  /**
   * Clears a cell. Never used by game flow (the rules never remove dice) —
   * provided for test simulations and tooling.
   */
  remove(position: { readonly row: number; readonly col: number }): void {
    this.#dice[position.row]![position.col] = null
  }
}
