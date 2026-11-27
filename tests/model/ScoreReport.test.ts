/**
 * Test-design criterion: INPUT-DOMAIN PARTITIONING of the constructor —
 *   lines: all zero | mixed | golden;  beamTotal: 0 | positive —
 * plus BRANCH COVERAGE of lineFor (found / not found).
 * Cases (precomputed):
 *  T1 zero lines [0,0,0,0], beam 0          -> total 0,   objectiveTotal 0
 *  T2 reference calculateScore lines [4,5,0,1], beam 100 -> total 110, objectiveTotal 10
 *                                                                           [inc-41 T1, T4]
 *  T3 golden lines [10,4,7,9], beam 156     -> total 186, objectiveTotal 30
 *  T4 lines [0,0,0,0], beam 156             -> total 156 (beam only)
 *  G1 golden report deep-equals the literal object from game.test.ts (ported shape)
 *  G2 the seed-3 novice-rose max-flex game's report is a frozen ScoreReport with
 *     objectiveTotal 30 and lineFor('patron-blue').points 9                [inc-41 T5]
 *  K1 Object.keys(report) equals ['lines','beamTotal','total','tier']      [inc-41 T2]
 *  K2 each line's own keys are exactly objectiveId, name, points           [inc-41 T3]
 *  F1 report, lines array and each line are frozen                         [inc-41 T3]
 *  C1 mutating the source lines array after construction does not change report.lines
 *  C2 mutating a source line object after construction does not change its report line
 *                                                                           [inc-41 T3]
 *  L1 lineFor('patron-blue') on golden -> { objectiveId:'patron-blue', name:'Patron of Blue', points:9 }
 *  L2 lineFor('nope') -> null
 *  L3 lineFor on the reference lines: 'rowColor' -> its line; 'zz' -> null   [inc-41 T4]
 *  O1 lines keep given order (three publics then private)
 * Error kinds: none (ScoreReport raises no exception).
 */
import { describe, expect, it } from 'vitest'
import { Game } from '../../src/engine/game'
import { createGameConfig } from '../../src/model/GameConfig'
import { ScoreReport } from '../../src/model/ScoreReport'
import type { ScoreLine, Tier } from '../../src/model/ScoreReport'
import { autoPlay } from '../helpers/autoPlayer'

/** The golden run's four lines (game.test.ts, "exact recorded final score report"). */
const GOLDEN_LINES = (): ScoreLine[] => [
  { objectiveId: 'column-color-variety', name: 'Column Color Variety', points: 10 },
  { objectiveId: 'row-value-variety', name: 'Row Value Variety', points: 4 },
  { objectiveId: 'even-values', name: 'Even Values', points: 7 },
  { objectiveId: 'patron-blue', name: 'Patron of Blue', points: 9 },
]

/** G1: the literal golden report from game.test.ts. */
const GOLDEN_REPORT = { lines: GOLDEN_LINES(), beamTotal: 156, total: 186, tier: 'gold' } as const

/** T2/L3: the reference calculateScore lines (scoreCalculator.test.ts), names as its helpers give them. */
const REFERENCE_LINES = (): ScoreLine[] => [
  { objectiveId: 'odd', name: 'odd', points: 4 },
  { objectiveId: 'rowColor', name: 'rowColor', points: 5 },
  { objectiveId: 'quorum', name: 'quorum', points: 0 },
  { objectiveId: 'patron-red', name: 'Patron of red', points: 1 },
]

/** T1/T4: four lines that scored nothing. */
const ZERO_LINES = (): ScoreLine[] => [
  { objectiveId: 'odd-values', name: 'Odd Values', points: 0 },
  { objectiveId: 'even-values', name: 'Even Values', points: 0 },
  { objectiveId: 'balanced-palette', name: 'Balanced Palette', points: 0 },
  { objectiveId: 'patron-red', name: 'Patron of Red', points: 0 },
]

/** A fresh golden report per call, so no instance is shared between tests. */
const goldenReport = (): ScoreReport => new ScoreReport(GOLDEN_LINES(), 156, 'gold')

/** A fresh reference report per call (calculateScore's case: beam 100, gold). */
const referenceReport = (): ScoreReport => new ScoreReport(REFERENCE_LINES(), 100, 'gold')

/** G2: the golden master game (seed 3, novice-rose, max-flex auto-player), played to the end. */
const playGoldenGame = (): Game => {
  const game = new Game(createGameConfig(3))
  autoPlay(game, 'novice-rose')
  return game
}

/** T1–T4: case, lines factory, beam total, tier, expected total, expected objective total. */
const TOTAL_TABLE: readonly (readonly [string, () => ScoreLine[], number, Tier, number, number])[] =
  [
    ['T1 zero lines, beam 0', ZERO_LINES, 0, 'none', 0, 0],
    ['T2 reference lines 4,5,0,1, beam 100', REFERENCE_LINES, 100, 'gold', 110, 10],
    ['T3 golden lines 10,4,7,9, beam 156', GOLDEN_LINES, 156, 'gold', 186, 30],
    ['T4 zero lines, beam 156', ZERO_LINES, 156, 'gold', 156, 0],
  ]

/** K2/F1: index and id of each golden line. */
const GOLDEN_INDEX_TABLE: readonly (readonly [number, string])[] = [
  [0, 'column-color-variety'],
  [1, 'row-value-variety'],
  [2, 'even-values'],
  [3, 'patron-blue'],
]

/** F1: a line to try pushing onto a frozen array. */
const EXTRA_LINE: ScoreLine = { objectiveId: 'extra', name: 'Extra', points: 99 }

describe('ScoreReport — total (FR-8.3)', () => {
  it.each(TOTAL_TABLE)(
    '%s',
    (_case, lines, beamTotal, tier, expectedTotal, expectedObjectiveTotal) => {
      const report = new ScoreReport(lines(), beamTotal, tier)
      expect(report.total).toBe(expectedTotal)
      expect(report.objectiveTotal).toBe(expectedObjectiveTotal)
      expect(report.beamTotal).toBe(beamTotal)
      expect(report.tier).toBe(tier)
    },
  )

  it('G1 the golden report deep-equals the literal report from game.test.ts', () => {
    expect(goldenReport()).toEqual(GOLDEN_REPORT)
    expect(goldenReport().total).toBe(186)
  })

  it('G2 the golden master game reports a frozen ScoreReport worth 186', () => {
    const report = playGoldenGame().report
    expect(report).toBeInstanceOf(ScoreReport)
    expect(Object.isFrozen(report)).toBe(true)
    expect(report).toEqual(GOLDEN_REPORT)
    expect(report!.objectiveTotal).toBe(30)
    expect(report!.lineFor('patron-blue')!.points).toBe(9)
  })
})

describe('ScoreReport — shape (FR-8.2)', () => {
  it('K1 own enumerable keys are exactly lines, beamTotal, total, tier, in that order', () => {
    expect(Object.keys(referenceReport())).toEqual(['lines', 'beamTotal', 'total', 'tier'])
  })

  it.each(GOLDEN_INDEX_TABLE)(
    'K2 line %i (%s) has exactly the keys objectiveId, name, points',
    (index, id) => {
      const line = goldenReport().lines[index]!
      expect(line.objectiveId).toBe(id)
      expect(Object.keys(line)).toEqual(['objectiveId', 'name', 'points'])
    },
  )

  it('O1 lines keep the given order: three publics then the private', () => {
    expect(goldenReport().lines.map((line) => line.objectiveId)).toEqual([
      'column-color-variety',
      'row-value-variety',
      'even-values',
      'patron-blue',
    ])
  })
})

describe('ScoreReport — immutability', () => {
  it('F1 the instance and its lines array are frozen; pushing throws TypeError', () => {
    const report = goldenReport()
    expect(Object.isFrozen(report)).toBe(true)
    expect(Object.isFrozen(report.lines)).toBe(true)
    expect(() => (report.lines as ScoreLine[]).push(EXTRA_LINE)).toThrow(TypeError)
    expect(report.lines).toHaveLength(4)
  })

  it.each(GOLDEN_INDEX_TABLE)('F1 line %i (%s) is frozen', (index, id) => {
    const line = goldenReport().lines[index]!
    expect(line.objectiveId).toBe(id)
    expect(Object.isFrozen(line)).toBe(true)
  })

  it('F1 assigning total throws TypeError and the value stays', () => {
    const report = referenceReport()
    expect(() => {
      ;(report as unknown as { total: number }).total = 0
    }).toThrow(TypeError)
    expect(report.total).toBe(110)
  })

  it('C1 mutating the source array after construction does not change report.lines', () => {
    const source = GOLDEN_LINES()
    const report = new ScoreReport(source, 156, 'gold')
    source.push(EXTRA_LINE)
    source[0] = EXTRA_LINE
    expect(report.lines).toEqual(GOLDEN_LINES())
    expect(report.total).toBe(186)
  })

  it('C2 mutating a source line after construction does not change its report line', () => {
    const source = REFERENCE_LINES()
    const report = new ScoreReport(source, 100, 'gold')
    ;(source[1] as { points: number }).points = 50
    expect(report.lines[1]).toEqual({ objectiveId: 'rowColor', name: 'rowColor', points: 5 })
    expect(report.lines[1]).not.toBe(source[1])
    expect(report.objectiveTotal).toBe(10)
    expect(report.total).toBe(110)
  })
})

describe('ScoreReport — lineFor (branch coverage)', () => {
  it('L1 finds the golden private line', () => {
    expect(goldenReport().lineFor('patron-blue')).toEqual({
      objectiveId: 'patron-blue',
      name: 'Patron of Blue',
      points: 9,
    })
  })

  it('L2 returns null for an id no line has', () => {
    expect(goldenReport().lineFor('nope')).toBeNull()
  })

  it('L3 on the reference lines finds rowColor and returns null for zz', () => {
    const report = referenceReport()
    expect(report.lineFor('rowColor')).toBe(report.lines[1])
    expect(report.lineFor('rowColor')).toEqual({
      objectiveId: 'rowColor',
      name: 'rowColor',
      points: 5,
    })
    expect(report.lineFor('zz')).toBeNull()
  })
})
