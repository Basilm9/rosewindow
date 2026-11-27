/**
 * Test-design criterion: INPUT-DOMAIN PARTITIONING per strategy family (FR-2.4), plus
 * BRANCH COVERAGE of the lineDiversity "incomplete line" skip and the diagonal
 * "same-colour neighbour" test.
 * Partitions and cases (expected values precomputed from the reference suite):
 *  valueParity   V1 mixed row R1 B2 Y3 G4: odd 2, even 2   V2 empty grid: 0
 *  lineDiversity L1 row of 4 distinct colours: 5            L2 row repeating a colour: 0
 *                L3 column axis on 2x2 R1 B1 / Y1 B2: 5     L4 incomplete row: 0
 *                L5 value trait vs colour trait: rowValue 4, rowColor 10
 *  diagonal      D1 2x2 all different: 4    D2 same-colour checkerboard: 0   D3 lone die: 1
 *  colorQuorum   Q1 red 2 + blue 1: 3       Q2 red 2 + blue 2 across grid: 6, colorCount(red) 2
 *  catalogue     A1 ALL has 8 unique ids    A2 covers the 4 families
 *                A3 ids in reference order (literal array of the 8 ids)       [inc-37 check 1]
 *                A4 points table: [1,1,5,5,4,4,1,3] read from each strategy
 *                A5 ALL_PUBLIC_OBJECTIVES (src/engine/objectives.ts) is the same array as
 *                   PublicObjective.ALL                                       [inc-37 check 2]
 *                A6 every ALL entry scores the L5 grid "R1 B2 Y3 G4 / R1 B1 Y1 G1" as computed
 *                   by hand: [6,2,10,0,4,0,8,12] (odd: R1 Y3 R1 B1 Y1 G1; even: B2 G4; both rows
 *                   colour-diverse; no full column; row 0 value-diverse; all 8 dice have no
 *                   same-colour diagonal neighbour; red, blue, yellow, green 2 each -> 4 x 3)
 *  interface     I1 every ALL element satisfies Objective (kind 'public', score is a function)
 *                I2 PublicObjective.from(plain).score(grid) equals the class instance score
 *                I3 PublicObjective.from(instance) returns that same instance
 *  immutability  F1 ALL, every instance and every strategy are frozen        [inc-37 check 3]
 *                F2 assigning an instance field or a strategy field throws TypeError, value kept
 *                F3 the constructor copies the strategy: mutating the source leaves it unchanged
 *  serialization J1 JSON of each ALL entry equals the legacy plain literal (kind, id, name,
 *                   description, strategy, in that order)                     [inc-37 check 4]
 *                J2 own enumerable keys are exactly kind, id, name, description, strategy
 *  purity        U1 score leaves the grid deep-equal to a fresh parse of the same rows
 * Error kinds: none (PublicObjective raises no exception).
 */
import { describe, expect, it } from 'vitest'
import { ALL_PUBLIC_OBJECTIVES } from '../../src/engine/objectives'
import type { Objective } from '../../src/model/Objective'
import { PublicObjective } from '../../src/model/PublicObjective'
import type { PublicObjectiveStrategy } from '../../src/model/PublicObjective'
import { parseGrid } from '../helpers/board'

/** A fresh objective per call, so no instance is shared between tests. */
type ObjectiveFactory = () => PublicObjective

const ODD: ObjectiveFactory = () =>
  new PublicObjective('odd', 'odd', '', { kind: 'valueParity', parity: 'odd', pointsPerDie: 1 })

const EVEN: ObjectiveFactory = () =>
  new PublicObjective('even', 'even', '', {
    kind: 'valueParity',
    parity: 'even',
    pointsPerDie: 1,
  })

const ROW_COLOR: ObjectiveFactory = () =>
  new PublicObjective('rowColor', 'rowColor', '', {
    kind: 'lineDiversity',
    axis: 'row',
    trait: 'color',
    pointsPerLine: 5,
  })

const COL_COLOR: ObjectiveFactory = () =>
  new PublicObjective('colColor', 'colColor', '', {
    kind: 'lineDiversity',
    axis: 'col',
    trait: 'color',
    pointsPerLine: 5,
  })

const ROW_VALUE: ObjectiveFactory = () =>
  new PublicObjective('rowValue', 'rowValue', '', {
    kind: 'lineDiversity',
    axis: 'row',
    trait: 'value',
    pointsPerLine: 4,
  })

const DIAG: ObjectiveFactory = () =>
  new PublicObjective('diag', 'diag', '', {
    kind: 'diagonalDiversity',
    trait: 'color',
    pointsPerDie: 1,
  })

const QUORUM: ObjectiveFactory = () =>
  new PublicObjective('quorum', 'quorum', '', {
    kind: 'colorQuorum',
    minPerColor: 2,
    pointsPerColor: 3,
  })

/** The L5 grid: row 0 distinct colours and values, row 1 distinct colours, all value 1. */
const L5_ROWS = ['R1 B2 Y3 G4', 'R1 B1 Y1 G1', '.. .. .. ..', '.. .. .. ..'] as const

/** A1/A3: the eight ids in reference order (the legacy list, typed out by hand). */
const REFERENCE_IDS = [
  'odd-values',
  'even-values',
  'row-color-variety',
  'column-color-variety',
  'row-value-variety',
  'column-value-variety',
  'diagonal-color-variety',
  'balanced-palette',
] as const

/** A4: index, id, the strategy's points field, its value (the pitch §11 points). */
const POINTS_TABLE: readonly (readonly [number, string, string, number])[] = [
  [0, 'odd-values', 'pointsPerDie', 1],
  [1, 'even-values', 'pointsPerDie', 1],
  [2, 'row-color-variety', 'pointsPerLine', 5],
  [3, 'column-color-variety', 'pointsPerLine', 5],
  [4, 'row-value-variety', 'pointsPerLine', 4],
  [5, 'column-value-variety', 'pointsPerLine', 4],
  [6, 'diagonal-color-variety', 'pointsPerDie', 1],
  [7, 'balanced-palette', 'pointsPerColor', 3],
]

/** A6: index, id, hand-computed score on the L5 grid. */
const L5_SCORE_TABLE: readonly (readonly [number, string, number])[] = [
  [0, 'odd-values', 6],
  [1, 'even-values', 2],
  [2, 'row-color-variety', 10],
  [3, 'column-color-variety', 0],
  [4, 'row-value-variety', 4],
  [5, 'column-value-variety', 0],
  [6, 'diagonal-color-variety', 8],
  [7, 'balanced-palette', 12],
]

/** J1: index, id, and the legacy plain literal's JSON (written out by hand from the old list). */
const LEGACY_JSON_TABLE: readonly (readonly [number, string, string])[] = [
  [
    0,
    'odd-values',
    '{"kind":"public","id":"odd-values","name":"Odd Values",' +
      '"description":"Score 1 point per die with an odd value.",' +
      '"strategy":{"kind":"valueParity","parity":"odd","pointsPerDie":1}}',
  ],
  [
    1,
    'even-values',
    '{"kind":"public","id":"even-values","name":"Even Values",' +
      '"description":"Score 1 point per die with an even value.",' +
      '"strategy":{"kind":"valueParity","parity":"even","pointsPerDie":1}}',
  ],
  [
    2,
    'row-color-variety',
    '{"kind":"public","id":"row-color-variety","name":"Row Color Variety",' +
      '"description":"Score 5 points for each row whose four dice all differ in color.",' +
      '"strategy":{"kind":"lineDiversity","axis":"row","trait":"color","pointsPerLine":5}}',
  ],
  [
    3,
    'column-color-variety',
    '{"kind":"public","id":"column-color-variety","name":"Column Color Variety",' +
      '"description":"Score 5 points for each column whose four dice all differ in color.",' +
      '"strategy":{"kind":"lineDiversity","axis":"col","trait":"color","pointsPerLine":5}}',
  ],
  [
    4,
    'row-value-variety',
    '{"kind":"public","id":"row-value-variety","name":"Row Value Variety",' +
      '"description":"Score 4 points for each row whose four dice all differ in value.",' +
      '"strategy":{"kind":"lineDiversity","axis":"row","trait":"value","pointsPerLine":4}}',
  ],
  [
    5,
    'column-value-variety',
    '{"kind":"public","id":"column-value-variety","name":"Column Value Variety",' +
      '"description":"Score 4 points for each column whose four dice all differ in value.",' +
      '"strategy":{"kind":"lineDiversity","axis":"col","trait":"value","pointsPerLine":4}}',
  ],
  [
    6,
    'diagonal-color-variety',
    '{"kind":"public","id":"diagonal-color-variety","name":"Diagonal Color Variety",' +
      '"description":"Score 1 point for each die that shares its color with none of its diagonal neighbors.",' +
      '"strategy":{"kind":"diagonalDiversity","trait":"color","pointsPerDie":1}}',
  ],
  [
    7,
    'balanced-palette',
    '{"kind":"public","id":"balanced-palette","name":"Balanced Palette",' +
      '"description":"Score 3 points for each color of which at least 2 dice are placed.",' +
      '"strategy":{"kind":"colorQuorum","minPerColor":2,"pointsPerColor":3}}',
  ],
]

/** I1/F1: index and id of every catalogue entry. */
const INDEX_TABLE: readonly (readonly [number, string])[] = REFERENCE_IDS.map(
  (id, index) => [index, id] as const,
)

describe('PublicObjective — valueParity', () => {
  it('V1 scores one point per odd-valued die (ported)', () => {
    const grid = parseGrid(['R1 B2 Y3 G4', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'])
    expect(ODD().score(grid)).toBe(2)
    expect(EVEN().score(grid)).toBe(2)
  })

  it('V2 scores zero on an empty grid (ported)', () => {
    expect(ODD().score(parseGrid(['.. ..', '.. ..']))).toBe(0)
  })
})

describe('PublicObjective — lineDiversity', () => {
  it('L1 scores a row with four distinct colors (ported)', () => {
    const grid = parseGrid(['R1 B1 Y1 G1', 'R2 R3 R4 R5', '.. .. .. ..', '.. .. .. ..'])
    expect(ROW_COLOR().score(grid)).toBe(5)
  })

  it('L2 scores nothing when a row repeats a color (ported)', () => {
    const grid = parseGrid(['R1 R2 Y1 G1', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'])
    expect(ROW_COLOR().score(grid)).toBe(0)
  })

  it('L3 scores columns on the column axis (ported)', () => {
    const grid = parseGrid(['R1 B1', 'Y1 B2'])
    expect(COL_COLOR().score(grid)).toBe(5)
  })

  it('L4 ignores incomplete lines (ported)', () => {
    const grid = parseGrid(['R1 B1 Y1 ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'])
    expect(ROW_COLOR().score(grid)).toBe(0)
  })

  it('L5 value trait follows values, not colors (ported)', () => {
    const grid = parseGrid([...L5_ROWS])
    expect(ROW_VALUE().score(grid)).toBe(4)
    expect(ROW_COLOR().score(grid)).toBe(10)
  })
})

describe('PublicObjective — diagonalDiversity', () => {
  it('D1 scores dice whose diagonal neighbors all differ in color (ported)', () => {
    const grid = parseGrid(['R1 B1', 'Y1 G1'])
    expect(DIAG().score(grid)).toBe(4)
  })

  it('D2 scores nothing on a same-color diagonal checkerboard (ported)', () => {
    const grid = parseGrid(['R1 .. R1 ..', '.. R1 .. R1', 'R1 .. R1 ..', '.. R1 .. R1'])
    expect(DIAG().score(grid)).toBe(0)
  })

  it('D3 a lone die has no diagonal neighbors and counts (ported)', () => {
    const grid = parseGrid(['R1 ..', '.. ..'])
    expect(DIAG().score(grid)).toBe(1)
  })
})

describe('PublicObjective — colorQuorum', () => {
  it('Q1 scores colors placed at least minPerColor times (ported)', () => {
    const grid = parseGrid(['R1 R2 B1 ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'])
    expect(QUORUM().score(grid)).toBe(3)
  })

  it('Q2 counts across the whole grid (ported)', () => {
    const grid = parseGrid(['R1 .. B1 ..', '.. G1 .. ..', 'R2 B2 .. ..', '.. .. .. ..'])
    expect(PublicObjective.colorCount(grid, 'red')).toBe(2)
    expect(QUORUM().score(grid)).toBe(6)
  })
})

describe('PublicObjective.ALL — catalogue', () => {
  it('A1 contains exactly eight objectives with unique ids (ported)', () => {
    expect(PublicObjective.ALL).toHaveLength(8)
    expect(new Set(PublicObjective.ALL.map((o) => o.id)).size).toBe(8)
  })

  it('A2 covers all four strategy families from the pitch (§11) (ported)', () => {
    const kinds = new Set(PublicObjective.ALL.map((o) => o.strategy.kind))
    expect(kinds).toEqual(
      new Set(['valueParity', 'lineDiversity', 'diagonalDiversity', 'colorQuorum']),
    )
  })

  it('A3 lists the ids in reference order', () => {
    expect(PublicObjective.ALL.map((o) => o.id)).toEqual([...REFERENCE_IDS])
  })

  it.each(POINTS_TABLE)('A4 ALL[%i] %s has %s = %i', (index, id, field, points) => {
    const objective = PublicObjective.ALL[index]!
    expect(objective.id).toBe(id)
    expect(objective.strategy).toHaveProperty(field, points)
  })

  it('A5 ALL_PUBLIC_OBJECTIVES (engine shim) is the same array as PublicObjective.ALL', () => {
    expect(ALL_PUBLIC_OBJECTIVES).toBe(PublicObjective.ALL)
  })

  it.each(L5_SCORE_TABLE)('A6 ALL[%i] %s scores %i on the L5 grid', (index, id, points) => {
    const objective = PublicObjective.ALL[index]!
    expect(objective.id).toBe(id)
    expect(objective.score(parseGrid([...L5_ROWS]))).toBe(points)
  })
})

describe('PublicObjective — Objective interface', () => {
  it.each(INDEX_TABLE)('I1 ALL[%i] %s satisfies Objective', (index, id) => {
    const objective: Objective = PublicObjective.ALL[index]!
    expect(objective.kind).toBe('public')
    expect(objective.id).toBe(id)
    expect(objective.score).toBeTypeOf('function')
  })

  it('I2 from(plain).score(grid) equals the class instance score', () => {
    const plain: {
      id: string
      name: string
      description: string
      strategy: PublicObjectiveStrategy
    } = {
      id: 'rowValue',
      name: 'rowValue',
      description: '',
      strategy: { kind: 'lineDiversity', axis: 'row', trait: 'value', pointsPerLine: 4 },
    }
    const fromPlain = PublicObjective.from(plain)
    expect(fromPlain).toBeInstanceOf(PublicObjective)
    expect(fromPlain.score(parseGrid([...L5_ROWS]))).toBe(4)
    expect(ROW_VALUE().score(parseGrid([...L5_ROWS]))).toBe(4)
  })

  it('I3 from(instance) returns that same instance', () => {
    const odd = ODD()
    expect(PublicObjective.from(odd)).toBe(odd)
  })
})

describe('PublicObjective — immutability', () => {
  it('F1 ALL itself is frozen', () => {
    expect(Object.isFrozen(PublicObjective.ALL)).toBe(true)
  })

  it.each(INDEX_TABLE)('F1 ALL[%i] %s and its strategy are frozen', (index, id) => {
    const objective = PublicObjective.ALL[index]!
    expect(objective.id).toBe(id)
    expect(Object.isFrozen(objective)).toBe(true)
    expect(Object.isFrozen(objective.strategy)).toBe(true)
  })

  it('F2 assigning a field of an instance or of its strategy throws TypeError', () => {
    const quorum = QUORUM()
    expect(() => {
      ;(quorum as unknown as { id: string }).id = 'changed'
    }).toThrow(TypeError)
    expect(() => {
      ;(quorum.strategy as unknown as { pointsPerColor: number }).pointsPerColor = 99
    }).toThrow(TypeError)
    expect(quorum.id).toBe('quorum')
    expect(quorum.strategy).toEqual({ kind: 'colorQuorum', minPerColor: 2, pointsPerColor: 3 })
  })

  it('F3 the constructor copies the strategy: mutating the source changes nothing', () => {
    const source = { kind: 'valueParity' as const, parity: 'odd' as const, pointsPerDie: 1 }
    const odd = new PublicObjective('odd', 'odd', '', source)
    source.pointsPerDie = 7
    expect(odd.strategy).not.toBe(source)
    expect(odd.strategy).toEqual({ kind: 'valueParity', parity: 'odd', pointsPerDie: 1 })
    expect(odd.score(parseGrid(['R1 B2 Y3 G4', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']))).toBe(
      2,
    )
  })
})

describe('PublicObjective — serialization', () => {
  it.each(LEGACY_JSON_TABLE)(
    'J1 JSON of ALL[%i] %s equals the legacy literal',
    (index, id, json) => {
      const objective = PublicObjective.ALL[index]!
      expect(objective.id).toBe(id)
      expect(JSON.stringify(objective)).toBe(json)
    },
  )

  it('J2 own enumerable keys are exactly kind, id, name, description, strategy', () => {
    expect(Object.keys(ODD())).toEqual(['kind', 'id', 'name', 'description', 'strategy'])
  })
})

describe('PublicObjective — purity', () => {
  it('U1 score leaves the grid unchanged', () => {
    const grid = parseGrid([...L5_ROWS])
    expect(DIAG().score(grid)).toBe(8)
    expect(grid).toEqual(parseGrid([...L5_ROWS]))
  })
})
