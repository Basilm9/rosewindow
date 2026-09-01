import { describe, expect, it } from 'vitest'
import { GameError, PlacementError } from '../../src/engine/errors'
import { parseConstraints } from '../../src/engine/patterns'
import { assertPlacementValid, findPlacementViolation } from '../../src/engine/placementValidator'
import type { PlacementCheck } from '../../src/engine/placementValidator'
import { parseGrid } from '../helpers/board'
import type { Die, DieColor } from '../../src/engine/types'

const die = (color: DieColor, value: number): Die => ({ color, value })

const EMPTY_4 = ['.. .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']
const EMPTY_5 = ['.. .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. ..']

function check(overrides: Partial<PlacementCheck>): PlacementCheck {
  const d = overrides.die ?? die('red', 3)
  return {
    grid: parseGrid(EMPTY_4),
    constraints: parseConstraints(['....', '....', '....', '....']),
    pool: [d],
    die: d,
    target: { row: 0, col: 0 },
    ...overrides,
  }
}

describe('findPlacementViolation — individual laws', () => {
  it('accepts a legal first placement on an open border cell', () => {
    expect(findPlacementViolation(check({}))).toBeNull()
  })

  it('rejects a target cell that already holds a die (cellOccupied)', () => {
    const violation = findPlacementViolation(
      check({ grid: parseGrid(['R2 .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']) }),
    )
    expect(violation?.kind).toBe('cellOccupied')
  })

  it('rejects a die that is not in the draft pool (dieNotInPool)', () => {
    const violation = findPlacementViolation(check({ pool: [die('blue', 5)] }))
    expect(violation?.kind).toBe('dieNotInPool')
  })

  it('treats pool membership by color and value, not object identity', () => {
    const violation = findPlacementViolation(check({ pool: [{ color: 'red', value: 3 }] }))
    expect(violation).toBeNull()
  })

  it('rejects a wrong color under a color demand (constraintMismatch)', () => {
    const violation = findPlacementViolation(
      check({ constraints: parseConstraints(['Y...', '....', '....', '....']) }),
    )
    expect(violation).toEqual({
      kind: 'constraintMismatch',
      expected: { kind: 'color', color: 'yellow' },
    })
  })

  it('rejects a wrong value under a value demand (constraintMismatch)', () => {
    const violation = findPlacementViolation(
      check({ constraints: parseConstraints(['4...', '....', '....', '....']) }),
    )
    expect(violation).toEqual({
      kind: 'constraintMismatch',
      expected: { kind: 'value', value: 4 },
    })
  })

  it('accepts any value when only the color is demanded', () => {
    const violation = findPlacementViolation(
      check({
        die: die('yellow', 6),
        constraints: parseConstraints(['Y...', '....', '....', '....']),
      }),
    )
    expect(violation).toBeNull()
  })

  it('rejects an orthogonal neighbor sharing the color (adjacencyViolation)', () => {
    const violation = findPlacementViolation(
      check({ grid: parseGrid(['.. R5 .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']) }),
    )
    expect(violation?.kind).toBe('adjacencyViolation')
  })

  it('rejects an orthogonal neighbor sharing only the value (adjacencyViolation)', () => {
    const violation = findPlacementViolation(
      check({ grid: parseGrid(['.. B3 .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']) }),
    )
    expect(violation?.kind).toBe('adjacencyViolation')
  })

  it('ignores diagonal neighbors for adjacency (they provide connectivity instead)', () => {
    const violation = findPlacementViolation(
      check({ grid: parseGrid(['.. .. .. ..', '.. R5 .. ..', '.. .. .. ..', '.. .. .. ..']) }),
    )
    expect(violation).toBeNull()
  })

  it('lists every offending orthogonal neighbor, not just the first', () => {
    const violation = findPlacementViolation(
      check({
        die: die('red', 1),
        grid: parseGrid(['.. Y1 B1 ..', 'Y1 .. .. ..', '.. .. .. ..', '.. .. .. ..']),
      }),
    )
    expect(violation).toEqual({
      kind: 'adjacencyViolation',
      offendingNeighbors: [
        { row: 1, col: 0 },
        { row: 0, col: 1 },
      ],
    })
  })

  it('rejects an interior first placement on grids larger than 4 (illegalFirstPlacement)', () => {
    const violation = findPlacementViolation(
      check({ grid: parseGrid(EMPTY_5), target: { row: 2, col: 2 } }),
    )
    expect(violation?.kind).toBe('illegalFirstPlacement')
  })

  it('accepts a border first placement on a 5x5 (illegalFirstPlacement does not fire)', () => {
    const violation = findPlacementViolation(
      check({ grid: parseGrid(EMPTY_5), target: { row: 2, col: 0 } }),
    )
    expect(violation).toBeNull()
  })

  it('fires illegalFirstPlacement only on the four interior cells of a 4x4', () => {
    const interior = [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ]
    for (const target of interior) {
      expect(findPlacementViolation(check({ target }))?.kind).toBe('illegalFirstPlacement')
    }
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (interior.some((c) => c.row === row && c.col === col)) continue
        expect(findPlacementViolation(check({ target: { row, col } }))).toBeNull()
      }
    }
  })

  it('rejects a placement touching no existing die, even diagonally (disconnectedPlacement)', () => {
    const violation = findPlacementViolation(
      check({
        grid: parseGrid(['R5 .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']),
        target: { row: 3, col: 3 },
      }),
    )
    expect(violation?.kind).toBe('disconnectedPlacement')
  })

  it('a far corner die is still disconnected from the opposite corner', () => {
    const violation = findPlacementViolation(
      check({
        grid: parseGrid(['.. .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. B3']),
        target: { row: 0, col: 0 },
      }),
    )
    expect(violation?.kind).toBe('disconnectedPlacement')
  })

  it('accepts diagonal contact as connectivity (disconnectedPlacement does not fire)', () => {
    const violation = findPlacementViolation(
      check({ grid: parseGrid(['.. .. .. ..', '.. B3 .. ..', '.. .. .. ..', '.. .. .. ..']) }),
    )
    expect(violation).toBeNull()
  })

  it('a diagonal same-color neighbor neither violates adjacency nor breaks connectivity', () => {
    const violation = findPlacementViolation(
      check({ grid: parseGrid(['.. .. .. ..', '.. R2 .. ..', '.. .. .. ..', '.. .. .. ..']) }),
    )
    expect(violation).toBeNull()
  })
})

describe('findPlacementViolation — documented precedence (first violation wins)', () => {
  it('cellOccupied beats dieNotInPool', () => {
    const violation = findPlacementViolation(
      check({
        grid: parseGrid(['R2 .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']),
        pool: [die('blue', 5)],
      }),
    )
    expect(violation?.kind).toBe('cellOccupied')
  })

  it('dieNotInPool beats constraintMismatch', () => {
    const violation = findPlacementViolation(
      check({
        constraints: parseConstraints(['Y...', '....', '....', '....']),
        pool: [die('blue', 5)],
      }),
    )
    expect(violation?.kind).toBe('dieNotInPool')
  })

  it('constraintMismatch beats adjacencyViolation', () => {
    const violation = findPlacementViolation(
      check({
        constraints: parseConstraints(['Y...', '....', '....', '....']),
        grid: parseGrid(['.. Y1 .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']),
        die: die('red', 1),
      }),
    )
    expect(violation?.kind).toBe('constraintMismatch')
  })

  it('constraintMismatch beats illegalFirstPlacement', () => {
    const violation = findPlacementViolation(
      check({
        constraints: parseConstraints([
          '.....',
          '.....',
          '..Y..',
          '.....',
          '.....',
        ]),
        grid: parseGrid(EMPTY_5),
        target: { row: 2, col: 2 },
      }),
    )
    expect(violation?.kind).toBe('constraintMismatch')
  })
})

describe('assertPlacementValid', () => {
  it('returns silently on a legal placement', () => {
    expect(() => assertPlacementValid(check({}))).not.toThrow()
  })

  it('throws a PlacementError carrying the structured violation', () => {
    try {
      assertPlacementValid(
        check({ grid: parseGrid(['R2 .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']) }),
      )
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(PlacementError)
      expect(err).toBeInstanceOf(GameError)
      expect((err as PlacementError).violation.kind).toBe('cellOccupied')
    }
  })

  it('rejects out-of-bounds targets with a programmer error, not a game error', () => {
    expect(() => assertPlacementValid(check({ target: { row: 4, col: 0 } }))).toThrow(
      /outside the grid/,
    )
  })
})
