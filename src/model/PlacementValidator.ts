import type { CellConstraint } from './CellConstraint'
import type { DieData } from './Die'
import { DraftPool } from './DraftPool'
import { GameError, PlacementError } from './GameError'
import type { PlacementViolation } from './GameError'
import type { DieGrid } from './GlassWindow'
import { DIAGONAL_DELTAS, ORTHOGONAL_DELTAS } from './Position'
import type { Position } from './Position'

/**
 * Everything one placement decision depends on, as a plain snapshot. The validator only reads
 * it; nothing here is ever mutated.
 */
export interface PlacementCheck {
  /** Current dice on the window, row-major; its length is the grid size. */
  readonly grid: DieGrid
  /** Printed demands, same shape as the grid. */
  readonly constraints: readonly (readonly CellConstraint[])[]
  /** Dice currently available to place; membership is by color+value (the draft pool's own rule). */
  readonly pool: readonly DieData[]
  /** The die being placed. */
  readonly die: DieData
  /** Where it is being placed; must be inside the grid or the check throws `outOfBounds`. */
  readonly target: Position
}

/** One placement law: returns its violation, or `null` when the law holds. */
type PlacementLaw = (check: PlacementCheck) => PlacementViolation | null

/**
 * Checks the six placement laws (FR-4.2–FR-4.9) in a fixed order and reports only the first
 * violation. Pure and stateless: it never mutates its inputs and keeps nothing between calls,
 * so one instance can be reused for every placement, legality preview (FR-4.13) and legal-move
 * search.
 *
 * Order (locked by `tests/engine/placementValidator.test.ts`):
 *   1. `cellOccupied` and 2. `dieNotInPool` — structural: is this move even possible?
 *   3. `constraintMismatch` — the cell's own printed demand;
 *   4. `adjacencyViolation` — the orthogonal neighbours;
 *   5. `illegalFirstPlacement` (window empty) / 6. `disconnectedPlacement` (window not empty) —
 *      the window as a whole.
 * The order runs from the narrowest question (this cell) outwards (neighbours, then the whole
 * window), so the player is told about the most local problem first.
 *
 * A target outside the grid is checked before every law and is a caller defect (NFR-2.4): it
 * throws {@link GameError} `outOfBounds`, deliberately not a {@link PlacementError}.
 */
export class PlacementValidator {
  /**
   * The six laws in evaluation order. Never reorder: the order decides which violation the
   * player sees and which moves the auto-player finds (golden master).
   */
  readonly #laws: readonly PlacementLaw[] = [
    (c) => this.#cellOccupied(c),
    (c) => this.#dieNotInPool(c),
    (c) => this.#constraintMismatch(c),
    (c) => this.#adjacency(c),
    (c) => this.#illegalFirstPlacement(c),
    (c) => this.#disconnected(c),
  ]

  /**
   * Evaluates the laws in order and returns the first violation (FR-4.9).
   * @param check - the placement to evaluate; read only, never mutated.
   * @returns the first broken law's violation, or `null` when the placement is legal.
   * @throws GameError `outOfBounds` when `check.target` is not an integer cell inside the grid.
   */
  findViolation(check: PlacementCheck): PlacementViolation | null {
    const size = check.grid.length
    if (!PlacementValidator.isInsideGrid(check.target, size)) {
      throw new GameError({ kind: 'outOfBounds', target: check.target })
    }
    for (const law of this.#laws) {
      const violation = law(check)
      if (violation !== null) return violation
    }
    return null
  }

  /**
   * Validates a placement, throwing the first violation.
   * @param check - the placement to evaluate; read only, never mutated.
   * @throws PlacementError carrying the first broken law's violation.
   * @throws GameError `outOfBounds` when `check.target` is not an integer cell inside the grid.
   */
  assertValid(check: PlacementCheck): void {
    const violation = this.findViolation(check)
    if (violation !== null) throw new PlacementError(violation)
  }

  /**
   * Bounds check: both coordinates are integers within `0..size-1` (`0.5`, `NaN`, `Infinity`
   * are outside).
   * @param position - candidate coordinates.
   * @param size - side length of the square grid.
   * @returns `true` when `position` names a cell of the grid.
   */
  static isInsideGrid(position: Position, size: number): boolean {
    return (
      Number.isInteger(position.row) &&
      Number.isInteger(position.col) &&
      position.row >= 0 &&
      position.row < size &&
      position.col >= 0 &&
      position.col < size
    )
  }

  /**
   * Whether a cell lies on the outer ring (first-placement law, FR-4.7).
   * @param position - coordinates inside the grid.
   * @param size - side length of the square grid.
   * @returns `true` when the cell is in the first/last row or column.
   */
  static isOnBorderRing(position: Position, size: number): boolean {
    return (
      position.row === 0 ||
      position.col === 0 ||
      position.row === size - 1 ||
      position.col === size - 1
    )
  }

  /**
   * Number of placed dice in a grid snapshot.
   * @param grid - the window contents.
   * @returns how many cells are non-null.
   */
  static countPlaced(grid: DieGrid): number {
    return grid.flat().filter((d) => d !== null).length
  }

  /**
   * Lenient neighbour read: off-grid cells read as empty.
   * @param grid - the window contents.
   * @param row - any row index.
   * @param col - any column index.
   * @returns the die there, or `null` when empty or outside the grid.
   */
  static #dieAt(grid: DieGrid, row: number, col: number): DieData | null {
    return grid[row]?.[col] ?? null
  }

  /**
   * Law 1 (FR-4.2): the target cell must be empty.
   * @param c - the placement under evaluation.
   * @returns `cellOccupied` when the cell already holds a die, else `null`.
   */
  #cellOccupied(c: PlacementCheck): PlacementViolation | null {
    return PlacementValidator.#dieAt(c.grid, c.target.row, c.target.col) !== null
      ? { kind: 'cellOccupied' }
      : null
  }

  /**
   * Law 2 (FR-4.3): the die must be in the pool, by color and value; delegates to the model's
   * single pool-membership rule.
   * @param c - the placement under evaluation.
   * @returns `dieNotInPool` when no pool die matches, else `null`.
   */
  #dieNotInPool(c: PlacementCheck): PlacementViolation | null {
    return DraftPool.contains(c.pool, c.die) ? null : { kind: 'dieNotInPool' }
  }

  /**
   * Law 3 (FR-4.4, FR-4.5): the die must satisfy the cell's printed demand.
   * @param c - the placement under evaluation.
   * @returns `constraintMismatch` carrying the constraint instance itself, else `null`.
   */
  #constraintMismatch(c: PlacementCheck): PlacementViolation | null {
    const demand: CellConstraint | undefined = c.constraints[c.target.row]?.[c.target.col]
    return demand !== undefined && !demand.accepts(c.die)
      ? { kind: 'constraintMismatch', expected: demand }
      : null
  }

  /**
   * Law 4 (FR-4.6, FR-4.12): no orthogonal neighbour may share the die's color or value.
   * Diagonals are ignored here (they count only for connectivity).
   * @param c - the placement under evaluation.
   * @returns `adjacencyViolation` listing every offending neighbour in `ORTHOGONAL_DELTAS`
   *   order (N, S, W, E), else `null`.
   */
  #adjacency(c: PlacementCheck): PlacementViolation | null {
    const { grid, die, target } = c
    const offendingNeighbors = ORTHOGONAL_DELTAS.flatMap((delta) => {
      const row = target.row + delta.row
      const col = target.col + delta.col
      const neighbor = PlacementValidator.#dieAt(grid, row, col)
      return neighbor !== null && (neighbor.color === die.color || neighbor.value === die.value)
        ? [{ row, col }]
        : []
    })
    return offendingNeighbors.length > 0 ? { kind: 'adjacencyViolation', offendingNeighbors } : null
  }

  /**
   * Law 5 (FR-4.7): applies only when the window is empty — the first die goes on the outer
   * ring.
   * @param c - the placement under evaluation.
   * @returns `illegalFirstPlacement` for an empty window and an interior target, else `null`.
   */
  #illegalFirstPlacement(c: PlacementCheck): PlacementViolation | null {
    return PlacementValidator.countPlaced(c.grid) === 0 &&
      !PlacementValidator.isOnBorderRing(c.target, c.grid.length)
      ? { kind: 'illegalFirstPlacement' }
      : null
  }

  /**
   * Law 6 (FR-4.8): applies only when the window is not empty — the die must touch a placed die
   * orthogonally or diagonally.
   * @param c - the placement under evaluation.
   * @returns `disconnectedPlacement` when none of the 8 neighbours holds a die, else `null`.
   */
  #disconnected(c: PlacementCheck): PlacementViolation | null {
    if (PlacementValidator.countPlaced(c.grid) === 0) return null
    const touches = [...ORTHOGONAL_DELTAS, ...DIAGONAL_DELTAS].some(
      (delta) =>
        PlacementValidator.#dieAt(c.grid, c.target.row + delta.row, c.target.col + delta.col) !==
        null,
    )
    return touches ? null : { kind: 'disconnectedPlacement' }
  }
}
