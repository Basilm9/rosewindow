import { describe, expect, it } from 'vitest'
import { GameError, PlacementError } from '../../src/engine/errors'

describe('error hierarchy (pitch §9)', () => {
  it('PlacementError is a GameError is an Error', () => {
    const err = new PlacementError({ kind: 'cellOccupied' })
    expect(err).toBeInstanceOf(GameError)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('PlacementError')
  })

  it('carries the structured violation payload', () => {
    const err = new PlacementError({
      kind: 'adjacencyViolation',
      offendingNeighbors: [{ row: 0, col: 1 }],
    })
    const violation = err.violation
    expect(violation.kind).toBe('adjacencyViolation')
    if (violation.kind === 'adjacencyViolation') {
      expect(violation.offendingNeighbors).toEqual([{ row: 0, col: 1 }])
    }
  })

  it('GameError covers the non-placement family', () => {
    for (const violation of [
      { kind: 'emptyBag' },
      { kind: 'invalidPhase' },
    ] as const) {
      const err = new GameError(violation)
      expect(err.name).toBe('GameError')
      expect(err.violation).toEqual(violation)
      expect(err.message.length).toBeGreaterThan(0)
    }
  })

  it('every violation kind has a human-readable message', () => {
    const samples = [
      new PlacementError({ kind: 'cellOccupied' }),
      new PlacementError({ kind: 'dieNotInPool' }),
      new PlacementError({ kind: 'constraintMismatch', expected: { kind: 'open' } }),
      new PlacementError({ kind: 'adjacencyViolation', offendingNeighbors: [] }),
      new PlacementError({ kind: 'illegalFirstPlacement' }),
      new PlacementError({ kind: 'disconnectedPlacement' }),
      new GameError({ kind: 'emptyBag' }),
      new GameError({ kind: 'invalidPhase' }),
    ]
    for (const err of samples) expect(err.message.length).toBeGreaterThan(0)
  })
})
