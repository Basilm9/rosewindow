/**
 * Criterion: branch coverage of parsing/validation + partitioning of positions.
 * Branches: '.', digit 1–6, color letter, invalid char ('X', '7', '0');
 *   square ok / not square; row count == gridSize / != gridSize; empty grid.
 * Positions: inside, row < 0, col ≥ size, non-integer.
 *
 * Ported from tests/engine/patterns.test.ts (catalog shape, density, offer determinism,
 * distinctness, coverage) and the parse part of the constraint case in classes.test.ts.
 */
import { describe, expect, it } from 'vitest'
import { ColorConstraint, OpenConstraint, ValueConstraint } from '../../src/model/CellConstraint'
import { GameError } from '../../src/model/GameError'
import { mulberry32 } from '../../src/model/SeededRandom'
import { ALL_PATTERNS, WindowPattern } from '../../src/model/WindowPattern'

const IDS = ['novice-rose', 'lancet', 'quatrefoil', 'tracery', 'clerestory', 'rose-majestic']
const DEMANDS = [3, 6, 8, 10, 11, 14]
const OFFER_SEED42 = ['lancet', 'novice-rose']
const OFFER_SEED3 = ['quatrefoil', 'tracery']

/** Matches a thrown {@link GameError} whose violation has the given kind. */
const violationOf = (kind: string) =>
  expect.objectContaining({ violation: expect.objectContaining({ kind }) })

describe('ALL_PATTERNS catalog', () => {
  it('has the six ids in frozen catalog order', () => {
    expect(ALL_PATTERNS.map((p) => p.id)).toEqual(IDS)
  })

  it('has six unique names', () => {
    expect(new Set(ALL_PATTERNS.map((p) => p.name)).size).toBe(6)
  })

  it('every pattern is a 4x4 grid', () => {
    expect(ALL_PATTERNS.map((p) => p.constraints.map((r) => r.length))).toEqual(
      Array.from({ length: 6 }, () => [4, 4, 4, 4]),
    )
    expect(ALL_PATTERNS.map((p) => p.gridSize)).toEqual([4, 4, 4, 4, 4, 4])
  })

  it('spans the density range (sparsest ≤ 6, densest ≥ 12)', () => {
    expect(ALL_PATTERNS.map((p) => p.demandCount)).toEqual(DEMANDS)
  })

  it('is deeply frozen', () => {
    expect(Object.isFrozen(ALL_PATTERNS[0])).toBe(true)
    expect(Object.isFrozen(ALL_PATTERNS[0]!.constraints)).toBe(true)
    expect(Object.isFrozen(ALL_PATTERNS[0]!.constraints[0])).toBe(true)
  })

  it('carries the corrected novice-rose description (matches demandCount 3)', () => {
    expect(WindowPattern.byId('novice-rose').description).toBe(
      'A sparse first commission. Three demands, mostly free panes.',
    )
  })
})

describe('parseConstraints branches', () => {
  it("parses color letter, digit and '.' into the three constraint classes", () => {
    const [color, value, open] = WindowPattern.parseConstraints(['R3.', '...', '...'])[0]!
    expect(color).toBeInstanceOf(ColorConstraint)
    expect(value).toBeInstanceOf(ValueConstraint)
    expect(open).toBeInstanceOf(OpenConstraint)
  })

  it('allows any square size (5x5)', () => {
    expect(
      WindowPattern.parseConstraints(['.....', '.....', '.....', '.....', '.....']),
    ).toHaveLength(5)
  })

  it.each(['X', '7', '0'])('rejects invalid pattern character %s (malformedPattern)', (c) => {
    const parse = () => WindowPattern.parseConstraints(['R.', `${c}.`])
    expect(parse).toThrow(GameError)
    expect(parse).toThrow(/malformed window pattern: invalid pattern character/)
    expect(parse).toThrow(violationOf('malformedPattern'))
  })

  it('rejects a non-square layout (malformedPattern)', () => {
    const parse = () => WindowPattern.parseConstraints(['R..', '...'])
    expect(parse).toThrow(GameError)
    expect(parse).toThrow(/must be square/)
    expect(parse).toThrow(violationOf('malformedPattern'))
  })
})

describe('construction validation', () => {
  it('fromRows rejects a row count other than gridSize (malformedPattern)', () => {
    const build = () => WindowPattern.fromRows('x', 'X', '', ['....', '....', '....'])
    expect(build).toThrow(GameError)
    expect(build).toThrow(/must have 4 rows/)
    expect(build).toThrow(violationOf('malformedPattern'))
  })

  it('rejects an empty grid (malformedPattern)', () => {
    const build = () => new WindowPattern('e', 'E', '', [])
    expect(build).toThrow(GameError)
    expect(build).toThrow(violationOf('malformedPattern'))
  })
})

describe('constraintAt', () => {
  it('returns the printed demand inside the grid', () => {
    expect(WindowPattern.byId('novice-rose').constraintAt({ row: 0, col: 2 })).toEqual({
      kind: 'value',
      value: 5,
    })
  })

  it.each([
    { row: -1, col: 0 },
    { row: 0, col: 4 },
    { row: 0.5, col: 0 },
  ])('rejects $row,$col (outOfBounds)', (position) => {
    const lookup = () => WindowPattern.byId('novice-rose').constraintAt(position)
    expect(lookup).toThrow(GameError)
    expect(lookup).toThrow(/outside the grid/)
    expect(lookup).toThrow(violationOf('outOfBounds'))
  })
})

describe('byId', () => {
  it('finds a catalog pattern', () => {
    expect(WindowPattern.byId('tracery').name).toBe('Tracery')
  })

  it('rejects an unknown id (unknownPattern)', () => {
    const lookup = () => WindowPattern.byId('nope')
    expect(lookup).toThrow(GameError)
    expect(lookup).toThrow(/unknown pattern id: "nope"/)
    expect(lookup).toThrow(violationOf('unknownPattern'))
  })
})

describe('offer', () => {
  it('is deterministic for seed 42', () => {
    expect(WindowPattern.offer(mulberry32(42)).map((p) => p.id)).toEqual(OFFER_SEED42)
  })

  it('is deterministic for seed 3', () => {
    expect(WindowPattern.offer(mulberry32(3)).map((p) => p.id)).toEqual(OFFER_SEED3)
  })

  it('offers two distinct patterns for seeds 0–49', () => {
    const duplicates = Array.from({ length: 50 }, (_, s) =>
      WindowPattern.offer(mulberry32(s)),
    ).filter(([a, b]) => a.id === b.id)
    expect(duplicates).toHaveLength(0)
  })

  it('eventually offers every pattern (seeds 0–199 cover all six)', () => {
    const seen = new Set(
      Array.from({ length: 200 }, (_, s) => WindowPattern.offer(mulberry32(s)))
        .flat()
        .map((p) => p.id),
    )
    expect(seen.size).toBe(6)
  })
})
