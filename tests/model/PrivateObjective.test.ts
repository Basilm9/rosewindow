/**
 * Test-design criterion: INPUT-DOMAIN PARTITIONING of PrivateObjective.score —
 *   patron dice on grid: none | one | several; other colours present: yes | no —
 * and fixed-seed constant checks for dealObjectives (determinism, distinctness).
 * Cases:
 *  S1 no dice of the colour (other colours present) -> 0
 *  S2 one die (R5 only, red patron) -> 5
 *  S3 ported: grid R2 R5 / B3 .. -> red 7, blue 3
 *  S4 empty grid -> 0 for every colour (it.each over the five colours)
 *  S5 several patron dice among other colours: grid R1 B2 Y3 G4 / R6 .. .. .. ->
 *     red 7, blue 2, purple 0 (hand-computed: R1 + R6; B2; no purple)        [inc-39 T6]
 *  N1 naming: new PrivateObjective('green') -> id 'patron-green', name 'Patron of Green'
 *  A1 ported: ALL has 5 entries, one per colour, set equals DIE_COLORS
 *  A2 ALL ids in order: patron-red, patron-yellow, patron-blue, patron-green, patron-purple
 *  A3 ALL colours follow DIE_COLORS order                                    [inc-39 T4]
 *  A4 ALL_PRIVATE_OBJECTIVES and dealObjectives (engine shim) are the model's, and the model
 *     barrel exports the same class and function                            [inc-39 T3]
 *  D1 ported: same seed (42) twice -> same public ids and same private id
 *  D2 ported: seeds 0..49 each deal 3 distinct publics and a 'private' kind (it.each over a seed list)
 *  D3 ported: over seeds 0..299 all eight publics appear (helper collects ids outside the test)
 *  D4 golden deal: seed 3 game stream -> publics [column-color-variety, row-value-variety,
 *     even-values], private patron-blue (read from new Game(createGameConfig(3)).objectives);
 *     the dealt objects are the model classes                               [inc-39 T1]
 *  D5 stream consumption: for fixed seeds, the dealt ids AND the next RNG value after the deal
 *     equal constants computed once from the pre-39 reference implementation
 *     (`git show HEAD~1:src/engine/objectives.ts`, run on HEAD~1's tree)    [inc-39 T2]
 *  I1 PrivateObjective satisfies Objective (kind 'private', score is a function)
 *  I2 from(instance) returns that same instance                             [inc-39 T6]
 *  I3 from({ color }) and the legacy literal through scorePrivateObjective score the same
 *                                                                           [inc-39 T6]
 *  F1 ALL and every instance are frozen                                     [inc-39 T5]
 *  F2 assigning color throws TypeError and the value stays                  [inc-39 T5]
 *  J1 JSON of each ALL entry equals the legacy plain literal (pre-39 reference output)
 *                                                                           [inc-39 T4]
 *  J2 own enumerable keys are exactly kind, id, name, description, color    [inc-39 T4]
 *  U1 score leaves the grid unchanged                                       [inc-39 T6]
 * Error kinds: none raised by PrivateObjective; dealObjectives cannot reach its GameError path
 *   with the fixed catalogues (documented, not tested).
 */
import { describe, expect, it } from 'vitest'
import { Game } from '../../src/engine/game'
import {
  ALL_PRIVATE_OBJECTIVES,
  dealObjectives as shimDealObjectives,
} from '../../src/engine/objectives'
import type { PrivateObjective as LegacyPrivateObjective } from '../../src/engine/objectives'
import { scorePrivateObjective } from '../../src/engine/scoreCalculator'
import * as modelBarrel from '../../src/model'
import { DIE_COLORS } from '../../src/model/Die'
import type { DieColor } from '../../src/model/Die'
import { createGameConfig } from '../../src/model/GameConfig'
import type { Objective } from '../../src/model/Objective'
import { dealObjectives } from '../../src/model/objectiveDeal'
import { PrivateObjective } from '../../src/model/PrivateObjective'
import { PublicObjective } from '../../src/model/PublicObjective'
import { mulberry32, SeededRandom } from '../../src/model/SeededRandom'
import { parseGrid } from '../helpers/board'

/** S3: the reference suite's grid (scoreCalculator.test.ts, "private objective"). */
const PORTED_ROWS = ['R2 R5', 'B3 ..'] as const

/** S5/U1/I3: several red dice among other colours; no purple. */
const MIXED_ROWS = ['R1 B2 Y3 G4', 'R6 .. .. ..', '.. .. .. ..', '.. .. .. ..'] as const

/** S4: a 4x4 grid with no dice. */
const EMPTY_ROWS = ['.. .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'] as const

/** A2: the five ids in DIE_COLORS order (typed out by hand). */
const REFERENCE_IDS = [
  'patron-red',
  'patron-yellow',
  'patron-blue',
  'patron-green',
  'patron-purple',
] as const

/** A3: the five colours in reference order (typed out by hand). */
const REFERENCE_COLORS = ['red', 'yellow', 'blue', 'green', 'purple'] as const

/** D4: the seed-3 game's public objective ids, in deal order (golden master run). */
const GOLDEN_PUBLIC_IDS = ['column-color-variety', 'row-value-variety', 'even-values'] as const

/** D4: the seed-3 game's private objective id. */
const GOLDEN_PRIVATE_ID = 'patron-blue'

/**
 * D5: seed, public ids, private id, and the stream's next value after the deal, all computed
 * once from the pre-39 reference `dealObjectives` (plain-data catalogue) on HEAD~1's tree.
 */
const REFERENCE_DEALS: readonly (readonly [
  number,
  readonly [string, string, string],
  string,
  number,
])[] = [
  [
    0,
    ['row-value-variety', 'balanced-palette', 'column-color-variety'],
    'patron-blue',
    0.09785169479437172,
  ],
  [
    1,
    ['row-color-variety', 'even-values', 'diagonal-color-variety'],
    'patron-purple',
    0.48878831742331386,
  ],
  [3, ['balanced-palette', 'row-value-variety', 'even-values'], 'patron-blue', 0.08359288168139756],
  [
    7,
    ['row-value-variety', 'diagonal-color-variety', 'even-values'],
    'patron-purple',
    0.15594836394302547,
  ],
  [42, ['row-color-variety', 'balanced-palette', 'even-values'], 'patron-blue', 0.8820588334929198],
  [
    99,
    ['even-values', 'row-value-variety', 'balanced-palette'],
    'patron-green',
    0.06438777828589082,
  ],
  [
    1234,
    ['even-values', 'row-color-variety', 'column-color-variety'],
    'patron-blue',
    0.31890230835415423,
  ],
  [
    4294967295,
    ['odd-values', 'row-color-variety', 'diagonal-color-variety'],
    'patron-green',
    0.18934845877811313,
  ],
]

/** J1: index, id, and the legacy plain literal's JSON (the pre-39 reference's own output). */
const LEGACY_JSON_TABLE: readonly (readonly [number, string, string])[] = [
  [
    0,
    'patron-red',
    '{"kind":"private","id":"patron-red","name":"Patron of Red",' +
      '"description":"Score the sum of values of your red dice.","color":"red"}',
  ],
  [
    1,
    'patron-yellow',
    '{"kind":"private","id":"patron-yellow","name":"Patron of Yellow",' +
      '"description":"Score the sum of values of your yellow dice.","color":"yellow"}',
  ],
  [
    2,
    'patron-blue',
    '{"kind":"private","id":"patron-blue","name":"Patron of Blue",' +
      '"description":"Score the sum of values of your blue dice.","color":"blue"}',
  ],
  [
    3,
    'patron-green',
    '{"kind":"private","id":"patron-green","name":"Patron of Green",' +
      '"description":"Score the sum of values of your green dice.","color":"green"}',
  ],
  [
    4,
    'patron-purple',
    '{"kind":"private","id":"patron-purple","name":"Patron of Purple",' +
      '"description":"Score the sum of values of your purple dice.","color":"purple"}',
  ],
]

/** I1/F1/J2: index and id of every catalogue entry. */
const INDEX_TABLE: readonly (readonly [number, string])[] = REFERENCE_IDS.map(
  (id, index) => [index, id] as const,
)

/** S4: every colour, as an it.each row. */
const COLOR_ROWS: readonly (readonly [DieColor])[] = REFERENCE_COLORS.map((c) => [c] as const)

/** D2: seeds 0..49. */
const FIFTY_SEEDS: readonly number[] = Array.from({ length: 50 }, (_, s) => s)

/** I3: the legacy plain literal for the red patron (old shape, fields filled by hand). */
const LEGACY_RED: LegacyPrivateObjective = {
  kind: 'private',
  id: 'patron-red',
  name: 'Patron of Red',
  description: 'Score the sum of values of your red dice.',
  color: 'red',
}

/** D3: every public id dealt over seeds 0..seeds-1, each seed on a fresh stream. */
const publicIdsSeenOver = (seeds: number): ReadonlySet<string> =>
  new Set(
    Array.from({ length: seeds }, (_, s) =>
      dealObjectives(mulberry32(s)).publics.map((o) => o.id),
    ).flat(),
  )

describe('PrivateObjective — score (input-domain partitions)', () => {
  it('S1 scores 0 when no die has the patron colour', () => {
    const grid = parseGrid(['B1 Y2', 'G3 P4'])
    expect(new PrivateObjective('red').score(grid)).toBe(0)
  })

  it('S2 scores the value of a single patron die', () => {
    const grid = parseGrid(['R5 ..', '.. ..'])
    expect(new PrivateObjective('red').score(grid)).toBe(5)
  })

  it('S3 scores the sum of values of the patron color (ported)', () => {
    const grid = parseGrid([...PORTED_ROWS])
    expect(new PrivateObjective('red').score(grid)).toBe(7)
    expect(new PrivateObjective('blue').score(grid)).toBe(3)
  })

  it.each(COLOR_ROWS)('S4 scores 0 for %s on an empty grid', (color) => {
    expect(new PrivateObjective(color).score(parseGrid([...EMPTY_ROWS]))).toBe(0)
  })

  it('S5 sums several patron dice among other colours; an absent colour scores 0', () => {
    const grid = parseGrid([...MIXED_ROWS])
    expect(new PrivateObjective('red').score(grid)).toBe(7)
    expect(new PrivateObjective('blue').score(grid)).toBe(2)
    expect(new PrivateObjective('purple').score(grid)).toBe(0)
  })
})

describe('PrivateObjective — naming', () => {
  it('N1 derives id, name and description from the colour', () => {
    const green = new PrivateObjective('green')
    expect(green.id).toBe('patron-green')
    expect(green.name).toBe('Patron of Green')
    expect(green.description).toBe('Score the sum of values of your green dice.')
    expect(green.color).toBe('green')
  })
})

describe('PrivateObjective.ALL — catalogue', () => {
  it('A1 contains exactly one objective per color (ported)', () => {
    expect(PrivateObjective.ALL).toHaveLength(5)
    expect(new Set(PrivateObjective.ALL.map((o) => o.color)).size).toBe(5)
    expect(new Set(PrivateObjective.ALL.map((o) => o.color))).toEqual(new Set(DIE_COLORS))
  })

  it('A2 lists the ids in reference order', () => {
    expect(PrivateObjective.ALL.map((o) => o.id)).toEqual([...REFERENCE_IDS])
  })

  it('A3 lists the colours in DIE_COLORS order', () => {
    expect(PrivateObjective.ALL.map((o) => o.color)).toEqual([...REFERENCE_COLORS])
    expect([...DIE_COLORS]).toEqual([...REFERENCE_COLORS])
  })

  it('A4 the engine shim and the model barrel expose the model catalogue and deal', () => {
    expect(ALL_PRIVATE_OBJECTIVES).toBe(PrivateObjective.ALL)
    expect(shimDealObjectives).toBe(dealObjectives)
    expect(modelBarrel.PrivateObjective).toBe(PrivateObjective)
    expect(modelBarrel.dealObjectives).toBe(dealObjectives)
  })
})

describe('dealObjectives', () => {
  it('D1 is deterministic for a given seed (ported)', () => {
    const a = dealObjectives(mulberry32(42))
    const b = dealObjectives(mulberry32(42))
    expect(a.publics.map((o) => o.id)).toEqual(b.publics.map((o) => o.id))
    expect(a.privateObjective.id).toBe(b.privateObjective.id)
  })

  it.each(FIFTY_SEEDS)(
    'D2 deals three distinct publics and one private (ported), seed %i',
    (seed) => {
      const deal = dealObjectives(mulberry32(seed))
      expect(new Set(deal.publics.map((o) => o.id)).size).toBe(3)
      expect(deal.privateObjective.kind).toBe('private')
    },
  )

  it('D3 eventually deals every public objective (300 seeds cover all eight) (ported)', () => {
    expect(publicIdsSeenOver(300).size).toBe(8)
  })

  it('D4 the seed-3 game deals the golden objectives as model instances', () => {
    const { objectives } = new Game(createGameConfig(3))
    expect(objectives.publics.map((o) => o.id)).toEqual([...GOLDEN_PUBLIC_IDS])
    expect(objectives.privateObjective.id).toBe(GOLDEN_PRIVATE_ID)
    expect(objectives.privateObjective).toBeInstanceOf(PrivateObjective)
    expect(objectives.publics[0]).toBeInstanceOf(PublicObjective)
    expect(objectives.publics[1]).toBeInstanceOf(PublicObjective)
    expect(objectives.publics[2]).toBeInstanceOf(PublicObjective)
  })

  it.each(REFERENCE_DEALS)(
    'D5 seed %i deals %j and %s, then the stream continues at %d (reference)',
    (seed, publicIds, privateId, nextAfterDeal) => {
      const random = new SeededRandom(seed)
      const deal = dealObjectives(random.next)
      expect(deal.publics.map((o) => o.id)).toEqual([...publicIds])
      expect(deal.privateObjective.id).toBe(privateId)
      expect(random.next()).toBe(nextAfterDeal)
    },
  )
})

describe('PrivateObjective — Objective interface', () => {
  it.each(INDEX_TABLE)('I1 ALL[%i] %s satisfies Objective', (index, id) => {
    const objective: Objective = PrivateObjective.ALL[index]!
    expect(objective.kind).toBe('private')
    expect(objective.id).toBe(id)
    expect(objective.score).toBeTypeOf('function')
  })

  it('I2 from(instance) returns that same instance', () => {
    const red = PrivateObjective.ALL[0]!
    expect(PrivateObjective.from(red)).toBe(red)
  })

  it('I3 from({ color }) and the legacy literal via scorePrivateObjective score the same', () => {
    const fromColor = PrivateObjective.from({ color: 'red' })
    expect(fromColor).toBeInstanceOf(PrivateObjective)
    expect(fromColor.id).toBe('patron-red')
    expect(fromColor.score(parseGrid([...MIXED_ROWS]))).toBe(7)
    expect(scorePrivateObjective(parseGrid([...MIXED_ROWS]), LEGACY_RED)).toBe(7)
  })
})

describe('PrivateObjective — immutability', () => {
  it('F1 ALL itself is frozen', () => {
    expect(Object.isFrozen(PrivateObjective.ALL)).toBe(true)
  })

  it.each(INDEX_TABLE)('F1 ALL[%i] %s is frozen', (index, id) => {
    const objective = PrivateObjective.ALL[index]!
    expect(objective.id).toBe(id)
    expect(Object.isFrozen(objective)).toBe(true)
  })

  it('F1 a newly constructed instance is frozen', () => {
    expect(Object.isFrozen(new PrivateObjective('yellow'))).toBe(true)
  })

  it('F2 assigning color throws TypeError and the value stays', () => {
    const red = new PrivateObjective('red')
    expect(() => {
      ;(red as unknown as { color: string }).color = 'blue'
    }).toThrow(TypeError)
    expect(red.color).toBe('red')
    expect(red.score(parseGrid([...MIXED_ROWS]))).toBe(7)
  })
})

describe('PrivateObjective — serialization', () => {
  it.each(LEGACY_JSON_TABLE)(
    'J1 JSON of ALL[%i] %s equals the legacy literal',
    (index, id, json) => {
      const objective = PrivateObjective.ALL[index]!
      expect(objective.id).toBe(id)
      expect(JSON.stringify(objective)).toBe(json)
    },
  )

  it.each(INDEX_TABLE)(
    'J2 own enumerable keys of ALL[%i] %s are exactly the legacy fields',
    (index, id) => {
      const objective = PrivateObjective.ALL[index]!
      expect(objective.id).toBe(id)
      expect(Object.keys(objective)).toEqual(['kind', 'id', 'name', 'description', 'color'])
    },
  )
})

describe('PrivateObjective — purity', () => {
  it('U1 score leaves the grid unchanged', () => {
    const grid = parseGrid([...MIXED_ROWS])
    expect(new PrivateObjective('red').score(grid)).toBe(7)
    expect(grid).toEqual(parseGrid([...MIXED_ROWS]))
  })
})
