import type { CellConstraint } from './CellConstraint'
import type { Die } from './Die'
import { GameError } from './GameError'
import type { Position } from './Position'
import { WindowCell } from './WindowCell'
import type { WindowPattern } from './WindowPattern'

/**
 * Row-major window contents, zero-or-one die per cell: `grid[row][col]`. This is the snapshot
 * shape `PlacementValidator`, `BeamTracer` and the objectives consume (moved here from
 * `engine/placementValidator.ts` in Prompt 21).
 */
export type DieGrid = readonly (readonly (Die | null)[])[]

/**
 * The player's window (FR-4.1, FR-4.10): a square grid of immutable {@link WindowCell}s built
 * from a {@link WindowPattern}.
 *
 * It owns the grid and answers bounds and occupancy queries, and it commits dice — but it never
 * validates the placement laws; `PlacementValidator` does that and `Game` calls it first. The
 * only law it enforces itself is occupancy, through {@link WindowCell.withDie}.
 *
 * Safety (NFR-6.1): mutators check everything that can throw before assigning, so a rejected
 * `place`/`remove` leaves the grid exactly as it was. Snapshots ({@link GlassWindow.dice}) are
 * fresh arrays, so no caller can alias internal state.
 */
export class GlassWindow {
  /** Pattern the cells were built from; supplies the printed demands. */
  readonly pattern: WindowPattern

  /** Side length of the square grid, equal to `pattern.constraints.length`. */
  readonly gridSize: number

  /**
   * Current cells, row-major. The outer and row arrays are private and mutable only in the
   * sense that a slot is reassigned; each cell itself is frozen and is replaced (never mutated)
   * on place/remove.
   */
  readonly #cells: WindowCell[][]

  /**
   * Builds an empty window: one {@link WindowCell} per printed demand. Use
   * {@link GlassWindow.fromPattern}.
   * @param pattern - the chosen pattern; its square shape was validated on construction.
   */
  private constructor(pattern: WindowPattern) {
    this.pattern = pattern
    this.gridSize = pattern.constraints.length
    this.#cells = pattern.constraints.map((row) => row.map((constraint) => new WindowCell(constraint)))
  }

  /**
   * Creates an empty window for a pattern (FR-1.2).
   * @param pattern - the pattern the player chose.
   * @returns a new window with `gridSize × gridSize` empty cells.
   */
  static fromPattern(pattern: WindowPattern): GlassWindow {
    return new GlassWindow(pattern)
  }

  /**
   * The printed demands, row-major.
   * @returns the pattern's frozen constraint grid (shared, not copied — it is immutable).
   */
  get constraints(): readonly (readonly CellConstraint[])[] {
    return this.pattern.constraints
  }

  /**
   * Snapshot of the placed dice, row-major. A new outer array and new row arrays on every call;
   * mutating the snapshot never changes the window.
   * @returns a fresh `(Die | null)[][]` of side `gridSize`.
   */
  get dice(): DieGrid {
    return this.#cells.map((row) => row.map((cell) => cell.die))
  }

  /**
   * Number of placed dice.
   * @returns how many cells hold a die.
   */
  get placedCount(): number {
    let count = 0
    for (const row of this.#cells) {
      for (const cell of row) {
        if (cell.die !== null) count++
      }
    }
    return count
  }

  /**
   * Whether no die has been placed yet (drives the first-placement law).
   * @returns `true` when {@link GlassWindow.placedCount} is 0.
   */
  get isEmpty(): boolean {
    return this.placedCount === 0
  }

  /**
   * Bounds check, same rule as the reference `isInsideGrid`.
   * @param position - candidate coordinates.
   * @returns `true` when both coordinates are integers within `0..gridSize-1`.
   */
  isInside(position: Position): boolean {
    const { row, col } = position
    return (
      Number.isInteger(row) &&
      Number.isInteger(col) &&
      row >= 0 &&
      row < this.gridSize &&
      col >= 0 &&
      col < this.gridSize
    )
  }

  /**
   * Lenient read: the beam and neighbour scans step off the grid and rely on `null` there.
   * @param position - any coordinates.
   * @returns the die at `position`, or `null` when the cell is empty OR outside the grid.
   */
  dieAt(position: Position): Die | null {
    return this.isInside(position) ? this.#cells[position.row]![position.col]!.die : null
  }

  /**
   * Strict read of one cell.
   * @param position - coordinates inside the grid.
   * @returns the (frozen) cell at `position`.
   * @throws GameError `outOfBounds` when `position` is not inside the grid.
   */
  cellAt(position: Position): WindowCell {
    this.#assertInside(position)
    return this.#cells[position.row]![position.col]!
  }

  /**
   * Commits a die to a cell. The caller has already validated the placement laws; only bounds
   * and occupancy are checked here. Both checks run before the assignment, so on any throw the
   * grid is unchanged (NFR-6.1).
   * @param die - the die to place.
   * @param position - coordinates inside the grid.
   * @throws GameError `outOfBounds` when `position` is not inside the grid.
   * @throws PlacementError `cellOccupied` when the cell already holds a die.
   */
  place(die: Die, position: Position): void {
    this.#assertInside(position)
    const next = this.#cells[position.row]![position.col]!.withDie(die)
    this.#cells[position.row]![position.col] = next
  }

  /**
   * Clears a cell. Never used by game flow (the rules never remove dice) — provided for test
   * simulations and tooling. Clearing an empty cell is a no-op in effect.
   * @param position - coordinates inside the grid.
   * @throws GameError `outOfBounds` when `position` is not inside the grid.
   */
  remove(position: Position): void {
    this.#assertInside(position)
    this.#cells[position.row]![position.col] = this.#cells[position.row]![position.col]!.cleared()
  }

  /**
   * Positions of every placed die.
   * @returns fresh positions in row-major order.
   */
  occupiedPositions(): Position[] {
    const positions: Position[] = []
    this.#cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell.die !== null) positions.push({ row: r, col: c })
      }),
    )
    return positions
  }

  /**
   * Guard shared by the strict accessors and mutators.
   * @param position - coordinates to check.
   * @throws GameError `outOfBounds` (carrying `position` as supplied) when outside the grid.
   */
  #assertInside(position: Position): void {
    if (!this.isInside(position)) {
      throw new GameError({ kind: 'outOfBounds', target: position })
    }
  }
}
