import { PlacementError } from './errors'
import type { PlacementViolation } from './errors'
import { DIAGONAL_DELTAS, ORTHOGONAL_DELTAS, sameDie } from './types'
import type { CellConstraint, Die, Position } from './types'

/**
 * The placement validator (pitch §8.2, §11): a pure function over a hand-built
 * window state. No mutation, no randomness, no UI.
 *
 * Canonical check order — the first violation found wins, and the tests in
 * `placementValidator.test.ts` lock this order:
 *   1. cellOccupied            (structural)
 *   2. dieNotInPool            (structural)
 *   3. constraintMismatch      (the cell's printed demand)
 *   4. adjacencyViolation      (orthogonal neighbors)
 *   5. illegalFirstPlacement   (only when the window is empty)
 *   6. disconnectedPlacement   (only when the window is not empty)
 */

/** The window contents: row-major grid of zero-or-one dice. */
export type DieGrid = readonly (readonly (Die | null)[])[]

export interface PlacementCheck {
  /** Current dice on the window. */
  readonly grid: DieGrid
  /** Printed demands, same shape as the grid. */
  readonly constraints: readonly (readonly CellConstraint[])[]
  /** Dice currently visible in the draft pool; membership is by color+value. */
  readonly pool: readonly Die[]
  /** The die being placed. */
  readonly die: Die
  /** Where it is being placed. Precondition: inside the grid. */
  readonly target: Position
}

function dieAt(grid: DieGrid, row: number, col: number): Die | null {
  return grid[row]?.[col] ?? null
}

export function countPlaced(grid: DieGrid): number {
  return grid.flat().filter((d) => d !== null).length
}

export function isOnBorderRing(position: Position, size: number): boolean {
  return (
    position.row === 0 ||
    position.col === 0 ||
    position.row === size - 1 ||
    position.col === size - 1
  )
}

/** Returns the first rule violation for this placement, or null if it is legal. */
export function findPlacementViolation(check: PlacementCheck): PlacementViolation | null {
  const { grid, constraints, pool, die, target } = check
  const size = grid.length

  if (target.row < 0 || target.row >= size || target.col < 0 || target.col >= size) {
    throw new Error(`target ${JSON.stringify(target)} is outside the grid`)
  }

  if (dieAt(grid, target.row, target.col) !== null) {
    return { kind: 'cellOccupied' }
  }

  if (!pool.some((candidate) => sameDie(candidate, die))) {
    return { kind: 'dieNotInPool' }
  }

  const demand: CellConstraint | undefined = constraints[target.row]?.[target.col]
  if (demand?.kind === 'color' && demand.color !== die.color) {
    return { kind: 'constraintMismatch', expected: demand }
  }
  if (demand?.kind === 'value' && demand.value !== die.value) {
    return { kind: 'constraintMismatch', expected: demand }
  }

  const offendingNeighbors = ORTHOGONAL_DELTAS.flatMap((delta) => {
    const neighbor = dieAt(grid, target.row + delta.row, target.col + delta.col)
    return neighbor !== null && (neighbor.color === die.color || neighbor.value === die.value)
      ? [{ row: target.row + delta.row, col: target.col + delta.col }]
      : []
  })
  if (offendingNeighbors.length > 0) {
    return { kind: 'adjacencyViolation', offendingNeighbors }
  }

  const placed = countPlaced(grid)
  if (placed === 0) {
    if (!isOnBorderRing(target, size)) return { kind: 'illegalFirstPlacement' }
  } else {
    const touches = [...ORTHOGONAL_DELTAS, ...DIAGONAL_DELTAS].some(
      (delta) => dieAt(grid, target.row + delta.row, target.col + delta.col) !== null,
    )
    if (!touches) return { kind: 'disconnectedPlacement' }
  }

  return null
}

/** Validates a placement or throws `PlacementError` with the structured violation. */
export function assertPlacementValid(check: PlacementCheck): void {
  const violation = findPlacementViolation(check)
  if (violation !== null) throw new PlacementError(violation)
}
