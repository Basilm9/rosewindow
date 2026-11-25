/**
 * Test-design criterion: input-domain partitioning on GameViolation.kind.
 * Partitions: hierarchy (PlacementError ⊂ GameError ⊂ Error);
 *   placement kinds: cellOccupied, dieNotInPool, constraintMismatch,
 *     adjacencyViolation, illegalFirstPlacement, disconnectedPlacement;
 *   game kinds: emptyBag, invalidPhase, refreshSpent, legalMovesRemain,
 *     outOfBounds, malformedPattern, unknownPattern, invalidArgument.
 */
import { describe, expect, it } from 'vitest'
import type { CellConstraint } from '../../src/model/CellConstraint'
import { OpenConstraint } from '../../src/model/CellConstraint'
import { GameError, PlacementError } from '../../src/model/GameError'

/** Builds a fresh open-constraint fixture. */
const openFixture = (): CellConstraint => new OpenConstraint()

describe('GameError / PlacementError hierarchy', () => {
  it('PlacementError is a GameError is an Error', () => {
    const err = new PlacementError({ kind: 'cellOccupied' })
    expect(err).toBeInstanceOf(PlacementError)
    expect(err).toBeInstanceOf(GameError)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('PlacementError')
  })

  it('a plain GameError is not a PlacementError', () => {
    const err = new GameError({ kind: 'emptyBag' })
    expect(err.name).toBe('GameError')
    expect(err).not.toBeInstanceOf(PlacementError)
  })

  it.each([
    { violation: { kind: 'emptyBag' } as const },
    { violation: { kind: 'invalidPhase' } as const },
  ])('GameError covers the non-placement family: $violation.kind', ({ violation }) => {
    const err = new GameError(violation)
    expect(err.name).toBe('GameError')
    expect(err.violation).toEqual(violation)
  })
})

describe('structured violation payload', () => {
  it('carries the adjacency payload unchanged', () => {
    const err = new PlacementError({
      kind: 'adjacencyViolation',
      offendingNeighbors: [{ row: 0, col: 1 }],
    })
    expect(err.violation).toEqual({
      kind: 'adjacencyViolation',
      offendingNeighbors: [{ row: 0, col: 1 }],
    })
  })

  it('keeps the very constraint object passed for constraintMismatch', () => {
    const expected = openFixture()
    const err = new PlacementError({ kind: 'constraintMismatch', expected })
    expect(err.violation).toHaveProperty('expected')
    expect((err.violation as { readonly expected: CellConstraint }).expected).toBe(expected)
  })
})

describe('every violation kind has a kind-specific message', () => {
  it.each([
    {
      kind: 'cellOccupied',
      make: () => new PlacementError({ kind: 'cellOccupied' }),
      message: 'target cell already holds a die',
    },
    {
      kind: 'dieNotInPool',
      make: () => new PlacementError({ kind: 'dieNotInPool' }),
      message: 'die is not in the current draft pool',
    },
    {
      kind: 'constraintMismatch',
      make: () => new PlacementError({ kind: 'constraintMismatch', expected: openFixture() }),
      message: 'die violates the printed demand on that cell',
    },
    {
      kind: 'adjacencyViolation',
      make: () => new PlacementError({ kind: 'adjacencyViolation', offendingNeighbors: [] }),
      message: 'orthogonal neighbor shares this die color or value',
    },
    {
      kind: 'illegalFirstPlacement',
      make: () => new PlacementError({ kind: 'illegalFirstPlacement' }),
      message: 'the first die must be placed on the border ring',
    },
    {
      kind: 'disconnectedPlacement',
      make: () => new PlacementError({ kind: 'disconnectedPlacement' }),
      message: 'die does not touch any existing die, even diagonally',
    },
    {
      kind: 'emptyBag',
      make: () => new GameError({ kind: 'emptyBag' }),
      message: 'the bag cannot satisfy the draw request',
    },
    {
      kind: 'invalidPhase',
      make: () => new GameError({ kind: 'invalidPhase' }),
      message: 'operation not permitted in the current game phase',
    },
    {
      kind: 'refreshSpent',
      make: () => new GameError({ kind: 'refreshSpent' }),
      message: 'the draft refresh has already been used this run',
    },
    {
      kind: 'legalMovesRemain',
      make: () => new GameError({ kind: 'legalMovesRemain' }),
      message: 'a legal move remains in this draft',
    },
    {
      kind: 'outOfBounds',
      make: () => new GameError({ kind: 'outOfBounds', target: { row: 4, col: 0 } }),
      message: 'target {"row":4,"col":0} is outside the grid',
    },
    {
      kind: 'malformedPattern',
      make: () => new GameError({ kind: 'malformedPattern', reason: 'bad row' }),
      message: 'malformed window pattern: bad row',
    },
    {
      kind: 'unknownPattern',
      make: () => new GameError({ kind: 'unknownPattern', id: 'nope' }),
      message: 'unknown pattern id: "nope"',
    },
    {
      kind: 'invalidArgument',
      make: () => new GameError({ kind: 'invalidArgument', detail: 'count' }),
      message: 'invalid argument: count',
    },
  ])('$kind → "$message"', ({ kind, make, message }) => {
    const err = make()
    expect(err.violation.kind).toBe(kind)
    expect(err.message).toBe(message)
  })
})

describe('thrown errors', () => {
  it('a thrown PlacementError is caught as PlacementError with its message', () => {
    const act = () => {
      throw new PlacementError({ kind: 'dieNotInPool' })
    }
    expect(act).toThrow(PlacementError)
    expect(act).toThrow(/draft pool/)
  })

  it('outOfBounds is a caller defect: a GameError, not a PlacementError', () => {
    const act = () => {
      throw new GameError({ kind: 'outOfBounds', target: { row: 4, col: 0 } })
    }
    expect(act).toThrow(GameError)
    expect(new GameError({ kind: 'outOfBounds', target: { row: 4, col: 0 } })).not.toBeInstanceOf(
      PlacementError,
    )
  })
})
