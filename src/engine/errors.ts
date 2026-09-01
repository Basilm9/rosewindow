import type { CellConstraint, Position } from './types'

/**
 * Structured placement rejections (pitch §9 placement family). Each variant
 * carries the detail the view needs — e.g. `adjacencyViolation` lists every
 * offending neighbor so the hover preview can outline them.
 */
export type PlacementViolation =
  | { readonly kind: 'cellOccupied' }
  | { readonly kind: 'dieNotInPool' }
  | { readonly kind: 'constraintMismatch'; readonly expected: CellConstraint }
  | { readonly kind: 'adjacencyViolation'; readonly offendingNeighbors: readonly Position[] }
  | { readonly kind: 'illegalFirstPlacement' }
  | { readonly kind: 'disconnectedPlacement' }

/** All game rejections: the placement family plus the orchestration-level two. */
export type GameViolation = PlacementViolation | { readonly kind: 'emptyBag' | 'invalidPhase' }

function describe(violation: GameViolation): string {
  switch (violation.kind) {
    case 'cellOccupied':
      return 'target cell already holds a die'
    case 'dieNotInPool':
      return 'die is not in the current draft pool'
    case 'constraintMismatch':
      return 'die violates the printed demand on that cell'
    case 'adjacencyViolation':
      return 'orthogonal neighbor shares this die color or value'
    case 'illegalFirstPlacement':
      return 'the first die must be placed on the border ring'
    case 'disconnectedPlacement':
      return 'die does not touch any existing die, even diagonally'
    case 'emptyBag':
      return 'the bag cannot satisfy the draw request'
    case 'invalidPhase':
      return 'operation not permitted in the current game phase'
  }
}

/** Base class for every rule rejection the model raises (pitch §9 `GameException`). */
export class GameError extends Error {
  readonly violation: GameViolation

  constructor(violation: GameViolation) {
    super(describe(violation))
    this.name = 'GameError'
    this.violation = violation
  }
}

/**
 * Intermediate class for the placement family (pitch §9 `PlacementException`), so
 * callers can catch the group while still reading the specific reason.
 */
export class PlacementError extends GameError {
  declare readonly violation: PlacementViolation

  constructor(violation: PlacementViolation) {
    super(violation)
    this.name = 'PlacementError'
  }
}
