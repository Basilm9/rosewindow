import type { CellConstraint } from './CellConstraint'
import type { Position } from './Position'

/**
 * Structured placement rejections (SRS FR-4.9, FR-4.11). Each variant carries the detail the
 * view needs — e.g. `adjacencyViolation` lists every offending neighbour so the hover preview
 * can outline them. Every kind here is always raised as a {@link PlacementError}.
 */
export type PlacementViolation =
  | {
      /** Law 1: the target cell already holds a die. */
      readonly kind: 'cellOccupied'
    }
  | {
      /** Law 2: the die is not in the current draft pool. */
      readonly kind: 'dieNotInPool'
    }
  | {
      /** Law 3: the die breaks the cell's printed colour or value demand. */
      readonly kind: 'constraintMismatch'
      /** The printed demand that was broken. */
      readonly expected: CellConstraint
    }
  | {
      /** Law 4: an orthogonal neighbour shares the die's colour or value. */
      readonly kind: 'adjacencyViolation'
      /** Every orthogonal neighbour that conflicts, so the view can outline them all. */
      readonly offendingNeighbors: readonly Position[]
    }
  | {
      /** Law 5: the first die of the run is not on the outer ring. */
      readonly kind: 'illegalFirstPlacement'
    }
  | {
      /** Law 6: a later die touches no placed die, orthogonally or diagonally. */
      readonly kind: 'disconnectedPlacement'
    }

/**
 * Every machine-readable failure the model can raise (NFR-2.2): the placement laws, phase and
 * draw guards, the once-per-run refresh, plus caller and data defects (`outOfBounds`,
 * `malformedPattern`, `unknownPattern`, `invalidArgument`) that fail loudly (NFR-2.4, NFR-1.3).
 */
export type GameViolation =
  | PlacementViolation
  | {
      /** A phase, draw or refresh guard refused the operation. */
      readonly kind: 'emptyBag' | 'invalidPhase' | 'refreshSpent' | 'legalMovesRemain'
    }
  | {
      /** Caller defect: the target lies outside the grid (NFR-2.4). */
      readonly kind: 'outOfBounds'
      /** The rejected coordinates, as supplied. */
      readonly target: Position
    }
  | {
      /** Pattern data failed validation on load (NFR-1.3). */
      readonly kind: 'malformedPattern'
      /** What is wrong with the pattern data. */
      readonly reason: string
    }
  | {
      /** No window pattern has the requested id. */
      readonly kind: 'unknownPattern'
      /** The id that was requested. */
      readonly id: string
    }
  | {
      /** A constructor or method received an argument outside its domain. */
      readonly kind: 'invalidArgument'
      /** Which argument was wrong and why. */
      readonly detail: string
    }

/**
 * Base class for every rule rejection the model raises.
 *
 * Thrown directly for non-placement failures: an operation in the wrong phase (`invalidPhase`),
 * an exhausted bag (`emptyBag`), a second draft refresh (`refreshSpent`), a forfeit while a
 * legal move remains (`legalMovesRemain`), a target outside the grid (`outOfBounds` — a caller
 * defect, deliberately not a {@link PlacementError}), bad pattern data (`malformedPattern`,
 * `unknownPattern`) and bad constructor or method arguments (`invalidArgument`).
 * Callers branch on {@link GameError.violation | violation.kind}, never on the message text.
 */
export class GameError extends Error {
  /** The machine-readable reason for the failure; `kind` discriminates the variant. */
  readonly violation: GameViolation

  /**
   * Creates an error whose message is {@link GameError.describe} of the violation.
   * @param violation - the machine-readable reason; stored unchanged.
   */
  constructor(violation: GameViolation) {
    super(GameError.describe(violation))
    this.name = 'GameError'
    this.violation = violation
  }

  /**
   * Human-readable text for a violation. The switch is exhaustive: adding a kind to
   * {@link GameViolation} without a case here is a compile error.
   * @param violation - the violation to describe.
   * @returns a stable English message (tests match on fragments of it).
   */
  static describe(violation: GameViolation): string {
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
      case 'refreshSpent':
        return 'the draft refresh has already been used this run'
      case 'legalMovesRemain':
        return 'a legal move remains in this draft'
      case 'outOfBounds':
        return `target ${JSON.stringify(violation.target)} is outside the grid`
      case 'malformedPattern':
        return `malformed window pattern: ${violation.reason}`
      case 'unknownPattern':
        return `unknown pattern id: "${violation.id}"`
      case 'invalidArgument':
        return `invalid argument: ${violation.detail}`
      default: {
        const unreachable: never = violation
        return unreachable
      }
    }
  }
}

/**
 * The placement family (FR-4.9): thrown when a placement breaks one of the six laws, including
 * `dieNotInPool` wherever it arises (e.g. `DraftPool.take`). Callers may catch the group and
 * still read the specific reason from {@link PlacementError.violation | violation}.
 */
export class PlacementError extends GameError {
  /** The placement law that was broken. */
  declare readonly violation: PlacementViolation

  /**
   * Creates a placement rejection.
   * @param violation - the broken placement law; stored unchanged.
   */
  constructor(violation: PlacementViolation) {
    super(violation)
    this.name = 'PlacementError'
  }
}
