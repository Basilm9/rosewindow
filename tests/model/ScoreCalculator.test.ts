/**
 * Test-design criterion: INPUT-DOMAIN PARTITIONING of tierFor(total) with PROVISIONAL_TIERS
 * (40/65/90). Partitions: none [0,39], bronze [40,64], silver [65,89], gold [90,∞).
 * Boundary values (one case per side of each boundary, FR-8.4):
 *   0 none | 39 none | 40 bronze | 64 bronze | 65 silver | 89 silver | 90 gold | 500 gold
 *   (run on the model class directly, a fresh ScoreCalculator per row)        [inc-43 T3]
 * Custom-tier partitions ({1,2,3}): 0 none | 1 bronze | 2 silver | 3 gold.
 * Calculation cases:
 *  C1 ported calculateScore: grid R1 B2 Y3 G4 (row 0), publics odd(2/die), rowColor(5), quorum(3),
 *     private patron-red, beam 100 -> lines [odd 4, rowColor 5, quorum 0, patron-red 1], total 110, gold
 *     (hand-computed: odd R1 Y3 -> 2 x 2; row 0 four distinct colours -> 5, other rows incomplete;
 *     no colour twice -> 0; red dice R1 -> 1)
 *  C2 four lines, private last (lines.length 4, lines[3].objectiveId 'patron-red')  [inc-43 T5]
 *  C3 FR-8.3: report.total === report.beamTotal + 10 (literal objective sum for C1)
 *  C4 empty 4x4 grid, beam 0, seed-3 objectives -> total 0, tier none
 *  C5 the golden window (seed 3, novice-rose, max-flex auto-player): each dealt objective's
 *     score() gives column-color-variety 10, row-value-variety 4, even-values 7, patron-blue 9
 *     (game.test.ts, "exact recorded final score report")                    [inc-43 T2]
 *  C6 calculate on the golden window with beam 156 -> the literal golden report, total 186, gold
 * Isolation cases (ported from classes.test.ts):
 *  I0 ported whole: tiers {1,2,3}, empty 2x2, seed-3 objectives; beam 3 -> 3 gold, beam 0 -> 0 none,
 *     default calculator beam 3 -> none                                       [inc-43 T1]
 *  I1 custom tiers {1,2,3}: beam 3 -> total 3, gold; beam 0 -> none (a fresh calculator per row)
 *                                                                           [inc-43 T1]
 *  I2 default calculator with the same input (beam 3) -> none
 *  I3 mutating the tiers object after construction does not change results (gold stays at 3)
 *     nor calculator.tiers                                                   [inc-43 T4]
 *  I4 calling calculate twice with the same input returns equal reports (no retained state)
 *  I5 calculator.tiers is frozen: assigning gold throws TypeError and the value stays [inc-43 T4]
 *  I6 default tiers equal PROVISIONAL_TIERS (40/65/90) and are a copy, not the same object
 *                                                                           [inc-43 T4]
 * Polymorphism:
 *  P1 a stub Objective { kind:'public', id:'stub', name:'Stub', description:'', score: () => 7 }
 *     placed in the publics tuple contributes a line with 7 points (calculator uses the interface):
 *     lines [stub 7, rowColor 5, quorum 0, patron-red 1], beam 100 -> total 113, gold
 * Engine shim:
 *  S1 calculateScore with JSON-plain objectives (no score method) gives a report equal to the
 *     model calculator's on the C1 input, and to the C1 literal report        [inc-43 T6]
 *  S2 PublicObjective.from / PrivateObjective.from return the same instance for each seed-3
 *     dealt objective; calculateScore on those instances equals the model's report [inc-43 T7]
 * Error kinds: none (ScoreCalculator raises no exception).
 */
import { describe, expect, it } from 'vitest'
import { Game } from '../../src/engine/game'
import type { PrivateObjective as LegacyPrivateObjective } from '../../src/engine/objectives'
import type { PublicObjective as LegacyPublicObjective } from '../../src/engine/objectives'
import { calculateScore } from '../../src/engine/scoreCalculator'
import { createGameConfig, PROVISIONAL_TIERS } from '../../src/model/GameConfig'
import type { TierThresholds } from '../../src/model/GameConfig'
import type { DieGrid } from '../../src/model/GlassWindow'
import type { Objective } from '../../src/model/Objective'
import type { DealtObjectives } from '../../src/model/objectiveDeal'
import { PrivateObjective } from '../../src/model/PrivateObjective'
import { PublicObjective } from '../../src/model/PublicObjective'
import { ScoreCalculator } from '../../src/model/ScoreCalculator'
import type { ScoreInput } from '../../src/model/ScoreCalculator'
import { ScoreReport } from '../../src/model/ScoreReport'
import type { Tier } from '../../src/model/ScoreReport'
import { autoPlay } from '../helpers/autoPlayer'
import { parseGrid } from '../helpers/board'

/** C1/P1/S1: the reference suite's grid (scoreCalculator.test.ts, "calculateScore"). */
const C1_ROWS = ['R1 B2 Y3 G4', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'] as const

/** C4: a 4x4 grid with no dice. */
const EMPTY_4X4_ROWS = ['.. .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'] as const

/** I0–I4: the 2x2 empty grid of the reference isolation case (classes.test.ts). */
const EMPTY_2X2_ROWS = ['.. ..', '.. ..'] as const

/** I0–I4: the reference isolation case's custom thresholds, typed out by hand. */
const CUSTOM_TIERS = (): TierThresholds => ({ bronze: 1, silver: 2, gold: 3 })

/** A fresh `odd` public (2 points per odd die), as the reference case builds it. */
const ODD = (): PublicObjective =>
  new PublicObjective('odd', 'odd', '', { kind: 'valueParity', parity: 'odd', pointsPerDie: 2 })

/** A fresh `rowColor` public (5 points per colour-diverse row). */
const ROW_COLOR = (): PublicObjective =>
  new PublicObjective('rowColor', 'rowColor', '', {
    kind: 'lineDiversity',
    axis: 'row',
    trait: 'color',
    pointsPerLine: 5,
  })

/** A fresh `quorum` public (3 points per colour placed twice or more). */
const QUORUM = (): PublicObjective =>
  new PublicObjective('quorum', 'quorum', '', {
    kind: 'colorQuorum',
    minPerColor: 2,
    pointsPerColor: 3,
  })

/** C1: fresh model objectives of the reference case (odd, rowColor, quorum, patron-red). */
const c1Objectives = (): DealtObjectives => ({
  publics: [ODD(), ROW_COLOR(), QUORUM()],
  privateObjective: new PrivateObjective('red'),
})

/** C1: the full model input, beam 100. */
const c1Input = (): ScoreInput => ({
  grid: parseGrid(C1_ROWS),
  objectives: c1Objectives(),
  beamTotal: 100,
})

/** C1/S1: the literal report the reference case expects (private name from PrivateObjective). */
const C1_REPORT = {
  lines: [
    { objectiveId: 'odd', name: 'odd', points: 4 },
    { objectiveId: 'rowColor', name: 'rowColor', points: 5 },
    { objectiveId: 'quorum', name: 'quorum', points: 0 },
    { objectiveId: 'patron-red', name: 'Patron of Red', points: 1 },
  ],
  beamTotal: 100,
  total: 110,
  tier: 'gold',
} as const

/** S1: a JSON-plain legacy public objective (no score method), as the reference suite builds it. */
const plainPublic = (
  id: string,
  strategy: LegacyPublicObjective['strategy'],
): LegacyPublicObjective => ({ kind: 'public', id, name: id, description: '', strategy })

/** S1: the reference case's objectives as JSON-plain legacy literals. */
const plainC1Objectives = (): {
  publics: [LegacyPublicObjective, LegacyPublicObjective, LegacyPublicObjective]
  privateObjective: LegacyPrivateObjective
} => ({
  publics: [
    plainPublic('odd', { kind: 'valueParity', parity: 'odd', pointsPerDie: 2 }),
    plainPublic('rowColor', { kind: 'lineDiversity', axis: 'row', trait: 'color', pointsPerLine: 5 }),
    plainPublic('quorum', { kind: 'colorQuorum', minPerColor: 2, pointsPerColor: 3 }),
  ],
  privateObjective: {
    kind: 'private',
    id: 'patron-red',
    name: 'Patron of red',
    description: '',
    color: 'red',
  },
})

/** C4/I0–I4/S2: the seed-3 game's dealt objectives (column-color-variety, row-value-variety,
 * even-values, patron-blue). */
const seed3Objectives = (): DealtObjectives => new Game(createGameConfig(3)).objectives

/** I0–I4: the reference isolation input with a given beam total. */
const isolationInput = (beamTotal: number): ScoreInput => ({
  grid: parseGrid(EMPTY_2X2_ROWS),
  objectives: seed3Objectives(),
  beamTotal,
})

/** C5/C6: the golden master game (seed 3, novice-rose, max-flex auto-player), played to the end. */
const playGoldenGame = (): Game => {
  const game = new Game(createGameConfig(3))
  autoPlay(game, 'novice-rose')
  return game
}

/** C5: the finished golden window's dice. */
const goldenWindow = (game: Game): DieGrid => game.window!.dice

/** C5: the dealt objectives as one list in scoring order (three publics then the private). */
const inScoringOrder = (objectives: DealtObjectives): readonly Objective[] => [
  ...objectives.publics,
  objectives.privateObjective,
]

/** C6: the literal golden report (game.test.ts, "exact recorded final score report"). */
const GOLDEN_REPORT = {
  lines: [
    { objectiveId: 'column-color-variety', name: 'Column Color Variety', points: 10 },
    { objectiveId: 'row-value-variety', name: 'Row Value Variety', points: 4 },
    { objectiveId: 'even-values', name: 'Even Values', points: 7 },
    { objectiveId: 'patron-blue', name: 'Patron of Blue', points: 9 },
  ],
  beamTotal: 156,
  total: 186,
  tier: 'gold',
} as const

/** P1: a stub objective declared by the interface only. */
const STUB = (): Objective => ({
  kind: 'public',
  id: 'stub',
  name: 'Stub',
  description: '',
  score: () => 7,
})

/**
 * P1: the C1 objectives with the stub in the first public slot. `ScoreInput.objectives` is typed
 * with the concrete `PublicObjective` class, so the interface-only stub needs a cast to sit in
 * the tuple; at run time the calculator only calls `score`, `id` and `name`.
 */
const stubFirstObjectives = (): DealtObjectives =>
  ({
    publics: [STUB(), ROW_COLOR(), QUORUM()],
    privateObjective: new PrivateObjective('red'),
  }) as unknown as DealtObjectives

describe('ScoreCalculator — tierFor (FR-8.4, input-domain partitioning)', () => {
  it.each([
    [0, 'none'],
    [39, 'none'],
    [40, 'bronze'],
    [64, 'bronze'],
    [65, 'silver'],
    [89, 'silver'],
    [90, 'gold'],
    [500, 'gold'],
  ] as const)('tierFor(%i) is %s', (total, tier) => {
    expect(new ScoreCalculator(PROVISIONAL_TIERS).tierFor(total)).toBe(tier)
  })

  it.each([
    [0, 'none'],
    [1, 'bronze'],
    [2, 'silver'],
    [3, 'gold'],
  ] as const)('with custom tiers {1,2,3}, tierFor(%i) is %s', (total, tier) => {
    expect(new ScoreCalculator(CUSTOM_TIERS()).tierFor(total)).toBe(tier)
  })
})

describe('ScoreCalculator — calculate (FR-8.1, FR-8.3)', () => {
  it('itemizes objectives, adds the beam total, and assigns the tier (ported)', () => {
    const report = new ScoreCalculator({ bronze: 40, silver: 65, gold: 90 }).calculate(c1Input())
    expect(report.lines.map((l) => [l.objectiveId, l.points])).toEqual([
      ['odd', 4],
      ['rowColor', 5],
      ['quorum', 0],
      ['patron-red', 1],
    ])
    expect(report.beamTotal).toBe(100)
    expect(report.total).toBe(110)
    expect(report.tier).toBe('gold')
    expect(report).toBeInstanceOf(ScoreReport)
    expect(report).toEqual(C1_REPORT)
  })

  it('C2 has four lines with the private line last', () => {
    const report = new ScoreCalculator().calculate(c1Input())
    expect(report.lines).toHaveLength(4)
    expect(report.lines[3]).toMatchObject({ objectiveId: 'patron-red', points: 1 })
    expect(report.lines[3]!.objectiveId).toBe('patron-red')
  })

  it('C3 total is the beam total plus the objective lines (FR-8.3): 100 + 10', () => {
    const report = new ScoreCalculator().calculate(c1Input())
    expect(report.total).toBe(report.beamTotal + 10)
    expect(report.objectiveTotal).toBe(10)
    expect(report.total).toBe(110)
  })

  it('C4 an empty 4x4 grid with beam 0 and the seed-3 objectives scores 0, tier none', () => {
    const report = new ScoreCalculator().calculate({
      grid: parseGrid(EMPTY_4X4_ROWS),
      objectives: seed3Objectives(),
      beamTotal: 0,
    })
    expect(report.lines.map((l) => [l.objectiveId, l.points])).toEqual([
      ['column-color-variety', 0],
      ['row-value-variety', 0],
      ['even-values', 0],
      ['patron-blue', 0],
    ])
    expect(report.total).toBe(0)
    expect(report.tier).toBe('none')
  })

  it.each([
    [0, 'column-color-variety', 10],
    [1, 'row-value-variety', 4],
    [2, 'even-values', 7],
    [3, 'patron-blue', 9],
  ] as const)(
    'C5 on the golden window, dealt objective %i (%s) scores %i',
    (index, id, points) => {
      const game = playGoldenGame()
      const objective = inScoringOrder(game.objectives)[index]!
      expect(objective.id).toBe(id)
      expect(objective.score(goldenWindow(game))).toBe(points)
    },
  )

  it('C6 calculate on the golden window with beam 156 gives the literal golden report', () => {
    const game = playGoldenGame()
    const report = new ScoreCalculator().calculate({
      grid: goldenWindow(game),
      objectives: game.objectives,
      beamTotal: 156,
    })
    expect(report).toEqual(GOLDEN_REPORT)
    expect(report.total).toBe(186)
    expect(report.tier).toBe('gold')
  })
})

describe('ScoreCalculator — tier isolation and statelessness', () => {
  it('calculates reports with isolated tier settings and no retained run state (ported)', () => {
    const calculator = new ScoreCalculator({ bronze: 1, silver: 2, gold: 3 })
    const input = isolationInput(3)
    expect(calculator.calculate(input)).toMatchObject({ total: 3, tier: 'gold' })
    expect(calculator.calculate({ ...input, beamTotal: 0 })).toMatchObject({
      total: 0,
      tier: 'none',
    })
    expect(new ScoreCalculator().calculate(input)).toMatchObject({ total: 3, tier: 'none' })
  })

  it.each([
    [3, 3, 'gold'],
    [0, 0, 'none'],
  ] as const)(
    'I1 custom tiers {1,2,3}: beam %i on the empty 2x2 grid -> total %i, %s',
    (beamTotal, total, tier: Tier) => {
      const report = new ScoreCalculator(CUSTOM_TIERS()).calculate(isolationInput(beamTotal))
      expect(report.total).toBe(total)
      expect(report.tier).toBe(tier)
    },
  )

  it('I2 the default calculator on the same input (beam 3) awards none', () => {
    const report = new ScoreCalculator().calculate(isolationInput(3))
    expect(report.total).toBe(3)
    expect(report.tier).toBe('none')
  })

  it('I3 mutating the source tiers after construction changes neither tiers nor results', () => {
    const source = { bronze: 1, silver: 2, gold: 3 }
    const calculator = new ScoreCalculator(source)
    source.gold = 1000
    source.bronze = 500
    expect(calculator.tiers).toEqual({ bronze: 1, silver: 2, gold: 3 })
    expect(calculator.calculate(isolationInput(3))).toMatchObject({ total: 3, tier: 'gold' })
    expect(calculator.tierFor(3)).toBe('gold')
  })

  it('I4 calculating the same input twice gives equal reports (no retained state)', () => {
    const calculator = new ScoreCalculator()
    const first = calculator.calculate(c1Input())
    const second = calculator.calculate(c1Input())
    expect(second).toEqual(first)
    expect(second).not.toBe(first)
    expect(second).toEqual(C1_REPORT)
  })

  it('I5 calculator.tiers is frozen: assigning gold throws TypeError and the value stays', () => {
    const calculator = new ScoreCalculator(CUSTOM_TIERS())
    expect(Object.isFrozen(calculator.tiers)).toBe(true)
    expect(() => {
      ;(calculator.tiers as { gold: number }).gold = 99
    }).toThrow(TypeError)
    expect(calculator.tiers.gold).toBe(3)
    expect(calculator.tierFor(3)).toBe('gold')
  })

  it('I6 default tiers equal PROVISIONAL_TIERS (40/65/90) and are a frozen copy', () => {
    const calculator = new ScoreCalculator()
    expect(calculator.tiers).toEqual({ bronze: 40, silver: 65, gold: 90 })
    expect(calculator.tiers).toEqual(PROVISIONAL_TIERS)
    expect(calculator.tiers).not.toBe(PROVISIONAL_TIERS)
    expect(Object.isFrozen(calculator.tiers)).toBe(true)
  })
})

describe('ScoreCalculator — polymorphism (Objective interface)', () => {
  it('P1 a stub Objective in the publics tuple contributes a 7-point line', () => {
    const report = new ScoreCalculator().calculate({
      grid: parseGrid(C1_ROWS),
      objectives: stubFirstObjectives(),
      beamTotal: 100,
    })
    expect(report.lines[0]).toEqual({ objectiveId: 'stub', name: 'Stub', points: 7 })
    expect(report.lines.map((l) => [l.objectiveId, l.points])).toEqual([
      ['stub', 7],
      ['rowColor', 5],
      ['quorum', 0],
      ['patron-red', 1],
    ])
    expect(report.total).toBe(113)
    expect(report.tier).toBe('gold')
  })
})

describe('ScoreCalculator — engine shim calculateScore', () => {
  it('S1 JSON-plain objectives give a report equal to the model calculator', () => {
    const shimReport = calculateScore({
      grid: parseGrid(C1_ROWS),
      objectives: plainC1Objectives(),
      beamTotal: 100,
      tiers: PROVISIONAL_TIERS,
    })
    const modelReport = new ScoreCalculator(PROVISIONAL_TIERS).calculate(c1Input())
    expect(shimReport).toEqual(modelReport)
    expect(shimReport).toEqual(C1_REPORT)
    expect(shimReport).toBeInstanceOf(ScoreReport)
  })

  it('S2 from(instance) returns the same instance for each seed-3 dealt objective', () => {
    const { publics, privateObjective } = seed3Objectives()
    expect(PublicObjective.from(publics[0])).toBe(publics[0])
    expect(PublicObjective.from(publics[1])).toBe(publics[1])
    expect(PublicObjective.from(publics[2])).toBe(publics[2])
    expect(PrivateObjective.from(privateObjective)).toBe(privateObjective)
  })

  it('S2 calculateScore on the model instances equals the model calculator report', () => {
    const objectives = seed3Objectives()
    const shimReport = calculateScore({
      grid: parseGrid(C1_ROWS),
      objectives,
      beamTotal: 100,
      tiers: PROVISIONAL_TIERS,
    })
    const modelReport = new ScoreCalculator(PROVISIONAL_TIERS).calculate({
      grid: parseGrid(C1_ROWS),
      objectives,
      beamTotal: 100,
    })
    expect(shimReport).toEqual(modelReport)
    expect(shimReport.lines.map((l) => [l.objectiveId, l.points])).toEqual([
      ['column-color-variety', 0],
      ['row-value-variety', 4],
      ['even-values', 2],
      ['patron-blue', 2],
    ])
    expect(shimReport.total).toBe(108)
  })
})
