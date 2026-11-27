/**
 * Criterion: branch (edge) coverage of `PlacementValidator.findViolation` — the true and the
 * false edge of the bounds check and of each of the six law checks, in evaluation order.
 *
 * Cases (numbers are the test-title prefixes):
 * - Laws, true edge (1–11): cellOccupied; dieNotInPool; constraintMismatch colour / value;
 *   adjacency colour / value / several neighbours; illegalFirstPlacement on the 4 interior
 *   cells of a 4×4 and on 5×5 {2,2}; disconnectedPlacement corner → opposite corner both ways.
 * - Laws, false edge → null (12–22): legal first placement; pool membership by colour+value;
 *   colour demand with any value; value demand met; orthogonal neighbour sharing nothing;
 *   diagonal neighbour (no adjacency, gives connectivity) ×3; 5×5 border first placement; the
 *   12 border cells of an empty 4×4; a cell with no constraint entry.
 * - 2×2 window, prompt-27 checks T1–T8 (23–30); 3×3 window T9–T10 (31–32).
 * - outOfBounds caller defect, T11 (33–37): every bounds partition on 4×4 and 2×2, thrown by
 *   findViolation and assertValid, a GameError that is NOT a PlacementError (NFR-2.4).
 * - assertValid (38–41): silent when legal; one PlacementError per violation kind; the
 *   structured violation; statelessness across calls (ported from classes.test.ts).
 * - Precedence FR-4.9 (P1–P11, P12 outOfBounds first): the 11 co-occurring law pairs.
 * - Inputs unchanged NFR-2.1 (42–43): structural snapshots and deeply frozen inputs.
 * - Static helpers (44–46): isOnBorderRing, countPlaced, isInsideGrid.
 *
 * Ported from tests/engine/placementValidator.test.ts (none dropped):
 * "individual laws" (18) → 12, 1, 2, 13, 3, 4, 14, 5, 6, 15, 7, 9, 18, 8 + 19 (the nested
 * loop), 10, 11, 17, 16; "documented precedence" (4) → P1, P5, P9, P10; "assertPlacementValid"
 * (4) → 38, 40 (the try/catch case), 33 (row {4,0}; the reference title calls it a
 * "programmer error, not a game error" — the correct behaviour is a GameError `outOfBounds`
 * that is not a PlacementError, asserted by 35), 33 (rows 0.5, NaN, Infinity).
 * From tests/engine/classes.test.ts: "reuses a validator without retaining a previous board or
 * rejection" → 41.
 */
import { describe, expect, it } from 'vitest'
import { PlacementValidator } from '../../src/model/PlacementValidator'
import type { PlacementCheck } from '../../src/model/PlacementValidator'
import { WindowPattern } from '../../src/model/WindowPattern'
import { Die } from '../../src/model/Die'
import { GameError, PlacementError } from '../../src/model/GameError'
import type { PlacementViolation } from '../../src/model/GameError'
import { parseGrid } from '../helpers/board'

const EMPTY_4 = ['.. .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']
const EMPTY_5 = [
  '.. .. .. .. ..',
  '.. .. .. .. ..',
  '.. .. .. .. ..',
  '.. .. .. .. ..',
  '.. .. .. .. ..',
]
const OPEN_4 = ['....', '....', '....', '....']

/** A fresh die of the given colour and value. */
const d = (color: Die['color'], value: number) => new Die(color, value)

/** A fresh check: empty 4×4, open demands, die red 3, pool [die], target {0,0}; overridable. */
const check = (o: Partial<PlacementCheck> = {}): PlacementCheck => {
  const die = o.die ?? d('red', 3)
  return {
    grid: parseGrid(EMPTY_4),
    constraints: WindowPattern.parseConstraints(OPEN_4),
    pool: [die],
    die,
    target: { row: 0, col: 0 },
    ...o,
  }
}

/** Runs a fresh validator's findViolation on a fresh check. */
const find = (o?: Partial<PlacementCheck>) => new PlacementValidator().findViolation(check(o))

/** A 4×4 grid from rows written as in parseGrid. */
const grid4 = (...rows: string[]) => parseGrid(rows)

/** Runs `fn` and returns what it threw (undefined if nothing was thrown). */
const catchError = (fn: () => unknown): unknown => {
  try {
    fn()
  } catch (error) {
    return error
  }
  return undefined
}

/** Matches a thrown error whose violation kind is `kind`. */
const withKind = (kind: string) =>
  expect.objectContaining({ violation: expect.objectContaining({ kind }) })

/** Freezes an object graph recursively, so any write by the code under test throws in strict mode. */
const deepFreeze = <T>(value: T): T => {
  Object.values(value as object).forEach((child) => {
    if (typeof child === 'object' && child !== null) deepFreeze(child)
  })
  return Object.freeze(value)
}

/** The six law inputs (each breaks exactly one law); shared by the assertValid and P tables. */
const LAW_INPUTS: readonly [PlacementViolation['kind'], Partial<PlacementCheck>][] = [
  ['cellOccupied', { grid: grid4('R2 .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..') }],
  ['dieNotInPool', { pool: [d('blue', 5)] }],
  [
    'constraintMismatch',
    { constraints: WindowPattern.parseConstraints(['Y...', '....', '....', '....']) },
  ],
  [
    'adjacencyViolation',
    { grid: grid4('.. R5 .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..') },
  ],
  ['illegalFirstPlacement', { target: { row: 1, col: 1 } }],
  [
    'disconnectedPlacement',
    {
      grid: grid4('R5 .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'),
      target: { row: 3, col: 3 },
    },
  ],
]

describe('individual laws — true edge', () => {
  it('1: a target that already holds a die is cellOccupied (FR-4.2)', () => {
    expect(
      find({ grid: grid4('R2 .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..') }),
    ).toEqual({
      kind: 'cellOccupied',
    })
  })

  it('2: a die absent from the pool is dieNotInPool (FR-4.3)', () => {
    expect(find({ pool: [d('blue', 5)] })).toEqual({ kind: 'dieNotInPool' })
  })

  it('3: a wrong colour under a colour demand is constraintMismatch (FR-4.4)', () => {
    expect(
      find({ constraints: WindowPattern.parseConstraints(['Y...', '....', '....', '....']) }),
    ).toEqual({
      kind: 'constraintMismatch',
      expected: { kind: 'color', color: 'yellow' },
    })
  })

  it('4: a wrong value under a value demand is constraintMismatch (FR-4.5)', () => {
    expect(
      find({ constraints: WindowPattern.parseConstraints(['4...', '....', '....', '....']) }),
    ).toEqual({
      kind: 'constraintMismatch',
      expected: { kind: 'value', value: 4 },
    })
  })

  it('5: an orthogonal neighbour sharing the colour is adjacencyViolation (FR-4.6)', () => {
    expect(
      find({ grid: grid4('.. R5 .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..') }),
    ).toEqual({
      kind: 'adjacencyViolation',
      offendingNeighbors: [{ row: 0, col: 1 }],
    })
  })

  it('6: an orthogonal neighbour sharing only the value is adjacencyViolation (FR-4.6)', () => {
    expect(
      find({ grid: grid4('.. B3 .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..') }),
    ).toEqual({
      kind: 'adjacencyViolation',
      offendingNeighbors: [{ row: 0, col: 1 }],
    })
  })

  it('7: every offending orthogonal neighbour is listed in N, S, W, E order (FR-4.12)', () => {
    const violation = find({
      die: d('red', 1),
      grid: grid4('.. Y1 B1 ..', 'Y1 .. .. ..', '.. .. .. ..', '.. .. .. ..'),
    })
    expect(violation).toEqual({
      kind: 'adjacencyViolation',
      offendingNeighbors: [
        { row: 1, col: 0 },
        { row: 0, col: 1 },
      ],
    })
  })

  it.each([
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 2, col: 1 },
    { row: 2, col: 2 },
  ])('8: the interior cell %o of an empty 4×4 is illegalFirstPlacement (FR-4.7)', (target) => {
    expect(find({ target })).toEqual({ kind: 'illegalFirstPlacement' })
  })

  it('9: the interior cell {2,2} of an empty 5×5 is illegalFirstPlacement (FR-4.7)', () => {
    expect(find({ grid: parseGrid(EMPTY_5), target: { row: 2, col: 2 } })).toEqual({
      kind: 'illegalFirstPlacement',
    })
  })

  it('10: a target touching no die, even diagonally, is disconnectedPlacement (FR-4.8)', () => {
    const violation = find({
      grid: grid4('R5 .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'),
      target: { row: 3, col: 3 },
    })
    expect(violation).toEqual({ kind: 'disconnectedPlacement' })
  })

  it('11: a far-corner die leaves the opposite corner disconnectedPlacement (FR-4.8)', () => {
    const violation = find({
      grid: grid4('.. .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. B3'),
      target: { row: 0, col: 0 },
    })
    expect(violation).toEqual({ kind: 'disconnectedPlacement' })
  })
})

describe('individual laws — false edge (legal → null)', () => {
  it('12: a first placement on the open border cell {0,0} is legal', () => {
    expect(find()).toBeNull()
  })

  it('13: pool membership is by colour and value, not identity (plain {red, 3})', () => {
    expect(find({ pool: [{ color: 'red', value: 3 }] })).toBeNull()
  })

  it('14: a colour demand accepts any value (yellow 6 on Y)', () => {
    expect(
      find({
        die: d('yellow', 6),
        constraints: WindowPattern.parseConstraints(['Y...', '....', '....', '....']),
      }),
    ).toBeNull()
  })

  it('15: a diagonal neighbour R5 neither violates adjacency nor leaves the die disconnected', () => {
    expect(
      find({ grid: grid4('.. .. .. ..', '.. R5 .. ..', '.. .. .. ..', '.. .. .. ..') }),
    ).toBeNull()
  })

  it('16: a diagonal same-colour neighbour R2 is legal', () => {
    expect(
      find({ grid: grid4('.. .. .. ..', '.. R2 .. ..', '.. .. .. ..', '.. .. .. ..') }),
    ).toBeNull()
  })

  it('17: diagonal contact B3 counts as connectivity', () => {
    expect(
      find({ grid: grid4('.. .. .. ..', '.. B3 .. ..', '.. .. .. ..', '.. .. .. ..') }),
    ).toBeNull()
  })

  it('18: the border cell {2,0} of an empty 5×5 is a legal first placement', () => {
    expect(find({ grid: parseGrid(EMPTY_5), target: { row: 2, col: 0 } })).toBeNull()
  })

  it.each([
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 0, col: 3 },
    { row: 1, col: 0 },
    { row: 1, col: 3 },
    { row: 2, col: 0 },
    { row: 2, col: 3 },
    { row: 3, col: 0 },
    { row: 3, col: 1 },
    { row: 3, col: 2 },
    { row: 3, col: 3 },
  ])('19: the border cell %o of an empty 4×4 is a legal first placement', (target) => {
    expect(find({ target })).toBeNull()
  })

  it('20: a value demand accepts the demanded value in any colour (red 4 on 4)', () => {
    expect(
      find({
        die: d('red', 4),
        constraints: WindowPattern.parseConstraints(['4...', '....', '....', '....']),
      }),
    ).toBeNull()
  })

  it('21: an orthogonal neighbour sharing neither colour nor value is legal (B5 next to red 3)', () => {
    expect(
      find({ grid: grid4('.. B5 .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..') }),
    ).toBeNull()
  })

  it('22: a target with no constraint entry imposes no printed demand', () => {
    expect(find({ constraints: [] })).toBeNull()
  })
})

describe('2×2 window — constraints [R., ..], die blue 3 (prompt 27 T1–T8)', () => {
  const blue3 = d('blue', 3)
  const check2 = (o: Partial<PlacementCheck> = {}): PlacementCheck =>
    check({
      grid: parseGrid(['.. ..', '.. ..']),
      constraints: WindowPattern.parseConstraints(['R.', '..']),
      die: blue3,
      pool: [blue3],
      target: { row: 0, col: 1 },
      ...o,
    })
  const find2 = (o?: Partial<PlacementCheck>) => new PlacementValidator().findViolation(check2(o))

  it('23 (T1): blue 3 on the open cell {0,1} of an empty 2×2 is legal', () => {
    expect(find2()).toBeNull()
  })

  it('24 (T2): an occupied {0,1} is cellOccupied', () => {
    expect(find2({ grid: parseGrid(['.. G1', '.. ..']) })).toEqual({ kind: 'cellOccupied' })
  })

  it('25 (T3): a pool without blue 3 is dieNotInPool', () => {
    expect(find2({ pool: [d('red', 3)] })).toEqual({ kind: 'dieNotInPool' })
  })

  it('26 (T4): blue 3 on the R cell is constraintMismatch carrying that very constraint object', () => {
    const c = check2({ target: { row: 0, col: 0 } })
    const violation = new PlacementValidator().findViolation(c)
    expect(violation).toEqual({
      kind: 'constraintMismatch',
      expected: { kind: 'color', color: 'red' },
    })
    expect((violation as { expected: unknown }).expected).toBe(c.constraints[0]![0])
  })

  it('27 (T5): one offending neighbour (B5 north of {1,1}) is listed alone', () => {
    expect(find2({ grid: parseGrid(['.. B5', '.. ..']), target: { row: 1, col: 1 } })).toEqual({
      kind: 'adjacencyViolation',
      offendingNeighbors: [{ row: 0, col: 1 }],
    })
  })

  it('28 (T6): two offending neighbours are listed north first, then west', () => {
    expect(find2({ grid: parseGrid(['.. B5', 'G3 ..']), target: { row: 1, col: 1 } })).toEqual({
      kind: 'adjacencyViolation',
      offendingNeighbors: [
        { row: 0, col: 1 },
        { row: 1, col: 0 },
      ],
    })
  })

  it.each([
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ])(
    '29 (T7): illegalFirstPlacement cannot fire on a 2×2 — %o is on the border and legal first',
    (target) => {
      expect(PlacementValidator.isOnBorderRing(target, 2)).toBe(true)
      expect(
        find2({ constraints: WindowPattern.parseConstraints(['..', '..']), target }),
      ).toBeNull()
    },
  )

  it.each([
    { placed: ['P6 ..', '.. ..'], target: { row: 1, col: 1 } },
    { placed: ['.. P6', '.. ..'], target: { row: 1, col: 0 } },
    { placed: ['.. ..', 'P6 ..'], target: { row: 0, col: 1 } },
    { placed: ['.. ..', '.. P6'], target: { row: 0, col: 0 } },
  ])(
    '30 (T8): disconnectedPlacement cannot fire on a 2×2 — die $placed touches the farthest cell $target',
    ({ placed, target }) => {
      expect(
        find2({
          grid: parseGrid(placed),
          constraints: WindowPattern.parseConstraints(['..', '..']),
          target,
        }),
      ).toBeNull()
    },
  )
})

describe('3×3 window (prompt 27 T9–T10)', () => {
  const OPEN_3 = WindowPattern.parseConstraints(['...', '...', '...'])

  it('31 (T9): the centre {1,1} of an empty 3×3 is illegalFirstPlacement', () => {
    expect(
      find({
        grid: parseGrid(['.. .. ..', '.. .. ..', '.. .. ..']),
        constraints: OPEN_3,
        target: { row: 1, col: 1 },
      }),
    ).toEqual({
      kind: 'illegalFirstPlacement',
    })
  })

  it('32 (T10): {2,2} with a die only at {0,0} is disconnectedPlacement', () => {
    expect(
      find({
        grid: parseGrid(['R5 .. ..', '.. .. ..', '.. .. ..']),
        constraints: OPEN_3,
        target: { row: 2, col: 2 },
      }),
    ).toEqual({
      kind: 'disconnectedPlacement',
    })
  })
})

describe('outOfBounds — a caller defect, not a placement rejection (NFR-2.4, T11)', () => {
  it.each([
    { row: 4, col: 0 },
    { row: 0.5, col: 0 },
    { row: Number.NaN, col: 0 },
    { row: Number.POSITIVE_INFINITY, col: 0 },
    { row: -1, col: 0 },
    { row: 0, col: 0.5 },
    { row: 0, col: -1 },
    { row: 0, col: 4 },
  ])(
    '33: assertValid on the 4×4 target %o throws GameError outOfBounds "outside the grid"',
    (target) => {
      const run = () => new PlacementValidator().assertValid(check({ target }))
      expect(run).toThrow(GameError)
      expect(run).toThrow(/outside the grid/)
      expect(run).toThrow(withKind('outOfBounds'))
    },
  )

  it.each([
    { row: 2, col: 0 },
    { row: 0, col: -1 },
    { row: 0.5, col: 0 },
  ])(
    '34 (T11): findViolation on the 2×2 target %o throws GameError outOfBounds, not PlacementError',
    (target) => {
      const c = check({
        grid: parseGrid(['.. ..', '.. ..']),
        constraints: WindowPattern.parseConstraints(['R.', '..']),
        die: d('blue', 3),
        pool: [d('blue', 3)],
        target,
      })
      const error = catchError(() => new PlacementValidator().findViolation(c))
      expect(error).toBeInstanceOf(GameError)
      expect(error).not.toBeInstanceOf(PlacementError)
      expect(error).toEqual(withKind('outOfBounds'))
      expect((error as GameError).message).toMatch(/outside the grid/)
    },
  )

  it('35: an off-grid target is a GameError outOfBounds carrying the target, deliberately not a PlacementError', () => {
    const error = catchError(() =>
      new PlacementValidator().assertValid(check({ target: { row: 4, col: 0 } })),
    )
    expect(error).toBeInstanceOf(GameError)
    expect(error).not.toBeInstanceOf(PlacementError)
    expect(error).toEqual(withKind('outOfBounds'))
    expect((error as GameError).violation).toEqual({
      kind: 'outOfBounds',
      target: { row: 4, col: 0 },
    })
  })

  it('36: findViolation throws outOfBounds rather than returning a violation', () => {
    expect(() => find({ target: { row: 4, col: 0 } })).toThrow(withKind('outOfBounds'))
  })

  it('37: outOfBounds is detected on a 5×5 only beyond its own size ({5,0} throws, {4,0} does not)', () => {
    expect(() => find({ grid: parseGrid(EMPTY_5), target: { row: 5, col: 0 } })).toThrow(
      withKind('outOfBounds'),
    )
    expect(find({ grid: parseGrid(EMPTY_5), target: { row: 4, col: 0 } })).toBeNull()
  })
})

describe('assertValid', () => {
  it('38: returns silently on a legal placement', () => {
    expect(() => new PlacementValidator().assertValid(check())).not.toThrow()
  })

  it.each(LAW_INPUTS)(
    '39: %s is thrown as a PlacementError with that violation kind',
    (kind, o) => {
      const run = () => new PlacementValidator().assertValid(check(o))
      expect(run).toThrow(PlacementError)
      expect(run).toThrow(withKind(kind))
    },
  )

  it('40: the thrown PlacementError is also a GameError carrying the structured violation', () => {
    const error = catchError(() =>
      new PlacementValidator().assertValid(
        check({ grid: grid4('R2 .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..') }),
      ),
    )
    expect(error).toBeInstanceOf(PlacementError)
    expect(error).toBeInstanceOf(GameError)
    expect(error).toEqual(withKind('cellOccupied'))
    expect((error as PlacementError).violation).toEqual({ kind: 'cellOccupied' })
  })

  it('41: one validator reused keeps no board or rejection between calls (statelessness)', () => {
    const validator = new PlacementValidator()
    const die = d('blue', 3)
    const c: PlacementCheck = {
      grid: parseGrid(['.. ..', '.. ..']),
      constraints: WindowPattern.parseConstraints(['R.', '..']),
      pool: [die],
      die,
      target: { row: 0, col: 0 },
    }
    expect(validator.findViolation(c)).toEqual(
      expect.objectContaining({ kind: 'constraintMismatch' }),
    )
    expect(() => validator.assertValid(c)).toThrow(withKind('constraintMismatch'))
    expect(() => validator.assertValid(c)).toThrow(/printed demand/)
    expect(() => validator.assertValid({ ...c, target: { row: 0, col: 1 } })).not.toThrow()
  })
})

// Precedence pairs that cannot occur together (15 pairs − 11 tested = 4):
// - cellOccupied × illegalFirstPlacement: illegalFirst needs an empty window; an occupied target means it is not empty.
// - adjacencyViolation × illegalFirstPlacement: an offending orthogonal neighbour means the window is not empty.
// - adjacencyViolation × disconnectedPlacement: an orthogonal neighbour already connects the die.
// - illegalFirstPlacement × disconnectedPlacement: illegalFirst applies only to an empty window, disconnected only to a non-empty one.
describe('precedence — the earlier law wins (FR-4.9)', () => {
  it('P1: cellOccupied beats dieNotInPool', () => {
    expect(
      find({
        grid: grid4('R2 .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'),
        pool: [d('blue', 5)],
      }),
    ).toEqual({ kind: 'cellOccupied' })
  })

  it('P2: cellOccupied beats constraintMismatch', () => {
    expect(
      find({
        grid: grid4('R2 .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'),
        constraints: WindowPattern.parseConstraints(['Y...', '....', '....', '....']),
      }),
    ).toEqual({ kind: 'cellOccupied' })
  })

  it('P3: cellOccupied beats adjacencyViolation', () => {
    expect(
      find({ grid: grid4('R2 R5 .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..') }),
    ).toEqual({
      kind: 'cellOccupied',
    })
  })

  it('P4: cellOccupied beats disconnectedPlacement (no die among the target’s 8 neighbours)', () => {
    expect(
      find({ grid: grid4('R2 .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..') }),
    ).toEqual({
      kind: 'cellOccupied',
    })
  })

  it('P5: dieNotInPool beats constraintMismatch', () => {
    expect(
      find({
        constraints: WindowPattern.parseConstraints(['Y...', '....', '....', '....']),
        pool: [d('blue', 5)],
      }),
    ).toEqual({ kind: 'dieNotInPool' })
  })

  it('P6: dieNotInPool beats adjacencyViolation', () => {
    expect(
      find({
        grid: grid4('.. R5 .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'),
        pool: [d('blue', 5)],
      }),
    ).toEqual({ kind: 'dieNotInPool' })
  })

  it('P7: dieNotInPool beats illegalFirstPlacement', () => {
    expect(find({ target: { row: 1, col: 1 }, pool: [d('blue', 5)] })).toEqual({
      kind: 'dieNotInPool',
    })
  })

  it('P8: dieNotInPool beats disconnectedPlacement', () => {
    expect(
      find({
        grid: grid4('.. .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. B5'),
        pool: [d('blue', 5)],
      }),
    ).toEqual({ kind: 'dieNotInPool' })
  })

  it('P9: constraintMismatch beats adjacencyViolation', () => {
    expect(
      find({
        constraints: WindowPattern.parseConstraints(['Y...', '....', '....', '....']),
        grid: grid4('.. Y1 .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'),
        die: d('red', 1),
      }),
    ).toEqual(expect.objectContaining({ kind: 'constraintMismatch' }))
  })

  it('P10: constraintMismatch beats illegalFirstPlacement (5×5, demand Y at {2,2})', () => {
    expect(
      find({
        constraints: WindowPattern.parseConstraints(['.....', '.....', '..Y..', '.....', '.....']),
        grid: parseGrid(EMPTY_5),
        target: { row: 2, col: 2 },
      }),
    ).toEqual({ kind: 'constraintMismatch', expected: { kind: 'color', color: 'yellow' } })
  })

  it('P11: constraintMismatch beats disconnectedPlacement', () => {
    expect(
      find({
        constraints: WindowPattern.parseConstraints(['Y...', '....', '....', '....']),
        grid: grid4('.. .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. B5'),
      }),
    ).toEqual({ kind: 'constraintMismatch', expected: { kind: 'color', color: 'yellow' } })
  })

  it('P12: outOfBounds is checked before every law (occupied grid, Y demands, empty pool)', () => {
    const run = () =>
      new PlacementValidator().assertValid(
        check({
          grid: grid4('R2 R5 B3 Y1', 'G4 .. .. ..', '.. .. .. ..', '.. .. .. P6'),
          constraints: WindowPattern.parseConstraints(['YYYY', 'YYYY', 'YYYY', 'YYYY']),
          pool: [],
          target: { row: 4, col: 0 },
        }),
      )
    expect(run).toThrow(GameError)
    expect(run).toThrow(withKind('outOfBounds'))
  })
})

describe('inputs are never changed (NFR-2.1, prompt 27 P and P-frozen)', () => {
  /** Rows: name, overrides, what assertValid throws (undefined when legal). */
  const CASES: readonly [string, Partial<PlacementCheck>, unknown][] = [
    ['legal', {}, undefined],
    ...LAW_INPUTS.map(([kind, o]): [string, Partial<PlacementCheck>, unknown] => [
      kind,
      o,
      withKind(kind),
    ]),
    ['outOfBounds', { target: { row: 4, col: 0 } }, withKind('outOfBounds')],
  ]

  it.each(CASES)(
    '42 (P): %s — grid, constraints, pool, die and target equal their snapshots after findViolation and assertValid',
    (_name, o, thrown) => {
      const c = check(o)
      const before = structuredClone({ grid: c.grid, pool: c.pool, die: c.die, target: c.target })
      const constraintsBefore = c.constraints.map((row) => [...row])
      const validator = new PlacementValidator()
      catchError(() => validator.findViolation(c))
      expect(catchError(() => validator.assertValid(c))).toEqual(thrown)
      expect(c.grid).toEqual(before.grid)
      expect(c.pool).toEqual(before.pool)
      expect(c.die).toEqual(before.die)
      expect(c.target).toEqual(before.target)
      expect(c.constraints).toEqual(constraintsBefore)
    },
  )

  it.each(CASES)(
    '43 (P-frozen): %s — deeply frozen inputs cause no write attempt',
    (_name, o, thrown) => {
      const frozen = deepFreeze(check(o))
      const validator = new PlacementValidator()
      expect(catchError(() => validator.findViolation(frozen))).not.toBeInstanceOf(TypeError)
      expect(catchError(() => validator.assertValid(frozen))).toEqual(thrown)
    },
  )
})

describe('static helpers', () => {
  it('44: isOnBorderRing({1,1}, 4) is false; {0,2} and {3,1} are on the ring', () => {
    expect(PlacementValidator.isOnBorderRing({ row: 1, col: 1 }, 4)).toBe(false)
    expect(PlacementValidator.isOnBorderRing({ row: 0, col: 2 }, 4)).toBe(true)
    expect(PlacementValidator.isOnBorderRing({ row: 3, col: 1 }, 4)).toBe(true)
  })

  it('45: countPlaced counts the non-empty cells', () => {
    expect(PlacementValidator.countPlaced(parseGrid(['R1 ..', '.. B2']))).toBe(2)
    expect(PlacementValidator.countPlaced(parseGrid(['.. ..', '.. ..']))).toBe(0)
  })

  it('46: isInsideGrid accepts {3,3} and rejects {4,0} on a 4×4', () => {
    expect(PlacementValidator.isInsideGrid({ row: 3, col: 3 }, 4)).toBe(true)
    expect(PlacementValidator.isInsideGrid({ row: 4, col: 0 }, 4)).toBe(false)
  })
})
