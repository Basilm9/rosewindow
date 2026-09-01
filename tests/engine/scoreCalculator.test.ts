import { describe, expect, it } from 'vitest'
import {
  calculateScore,
  colorCount,
  scorePrivateObjective,
  scorePublicObjective,
  tierFor,
} from '../../src/engine/scoreCalculator'
import { PROVISIONAL_TIERS } from '../../src/engine/config'
import { parseGrid } from '../helpers/board'
import type { PrivateObjective, PublicObjective } from '../../src/engine/objectives'

const pub = (id: string, strategy: PublicObjective['strategy']): PublicObjective => ({
  kind: 'public',
  id,
  name: id,
  description: '',
  strategy,
})

const priv = (color: PrivateObjective['color']): PrivateObjective => ({
  kind: 'private',
  id: `patron-${color}`,
  name: `Patron of ${color}`,
  description: '',
  color,
})

describe('valueParity', () => {
  const odd = pub('odd', { kind: 'valueParity', parity: 'odd', pointsPerDie: 1 })
  const even = pub('even', { kind: 'valueParity', parity: 'even', pointsPerDie: 1 })

  it('scores one point per odd-valued die', () => {
    const grid = parseGrid(['R1 B2 Y3 G4', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'])
    expect(scorePublicObjective(grid, odd)).toBe(2)
    expect(scorePublicObjective(grid, even)).toBe(2)
  })

  it('scores zero on an empty grid', () => {
    expect(scorePublicObjective(parseGrid(['.. ..', '.. ..']), odd)).toBe(0)
  })
})

describe('lineDiversity', () => {
  const rowColor = pub('rowColor', {
    kind: 'lineDiversity',
    axis: 'row',
    trait: 'color',
    pointsPerLine: 5,
  })
  const colColor = pub('colColor', {
    kind: 'lineDiversity',
    axis: 'col',
    trait: 'color',
    pointsPerLine: 5,
  })
  const rowValue = pub('rowValue', {
    kind: 'lineDiversity',
    axis: 'row',
    trait: 'value',
    pointsPerLine: 4,
  })

  it('scores a row with four distinct colors', () => {
    const grid = parseGrid(['R1 B1 Y1 G1', 'R2 R3 R4 R5', '.. .. .. ..', '.. .. .. ..'])
    expect(scorePublicObjective(grid, rowColor)).toBe(5)
  })

  it('scores nothing when a row repeats a color', () => {
    const grid = parseGrid(['R1 R2 Y1 G1', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'])
    expect(scorePublicObjective(grid, rowColor)).toBe(0)
  })

  it('scores columns on the column axis', () => {
    const grid = parseGrid(['R1 B1', 'Y1 B2'])
    expect(scorePublicObjective(grid, colColor)).toBe(5) // col 0: R,Y distinct
  })

  it('ignores incomplete lines', () => {
    const grid = parseGrid(['R1 B1 Y1 ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'])
    expect(scorePublicObjective(grid, rowColor)).toBe(0)
  })

  it('value trait follows values, not colors', () => {
    const grid = parseGrid(['R1 B2 Y3 G4', 'R1 B1 Y1 G1', '.. .. .. ..', '.. .. .. ..'])
    expect(scorePublicObjective(grid, rowValue)).toBe(4) // row 0 distinct values
    expect(scorePublicObjective(grid, rowColor)).toBe(10) // both rows color-diverse
  })
})

describe('diagonalDiversity', () => {
  const diag = pub('diag', {
    kind: 'diagonalDiversity',
    trait: 'color',
    pointsPerDie: 1,
  })

  it('scores dice whose diagonal neighbors all differ in color', () => {
    const grid = parseGrid(['R1 B1', 'Y1 G1'])
    expect(scorePublicObjective(grid, diag)).toBe(4)
  })

  it('scores nothing on a same-color diagonal checkerboard', () => {
    const grid = parseGrid(['R1 .. R1 ..', '.. R1 .. R1', 'R1 .. R1 ..', '.. R1 .. R1'])
    expect(scorePublicObjective(grid, diag)).toBe(0)
  })

  it('a lone die has no diagonal neighbors and counts', () => {
    const grid = parseGrid(['R1 ..', '.. ..'])
    expect(scorePublicObjective(grid, diag)).toBe(1)
  })
})

describe('colorQuorum', () => {
  const quorum = pub('quorum', { kind: 'colorQuorum', minPerColor: 2, pointsPerColor: 3 })

  it('scores colors placed at least minPerColor times', () => {
    const grid = parseGrid(['R1 R2 B1 ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'])
    expect(scorePublicObjective(grid, quorum)).toBe(3) // red has 2, blue has 1
  })

  it('counts across the whole grid', () => {
    const grid = parseGrid([
      'R1 .. B1 ..',
      '.. G1 .. ..',
      'R2 B2 .. ..',
      '.. .. .. ..',
    ])
    expect(colorCount(grid, 'red')).toBe(2)
    expect(scorePublicObjective(grid, quorum)).toBe(6) // red 2, blue 2
  })
})

describe('private objective', () => {
  it('scores the sum of values of the patron color', () => {
    const grid = parseGrid(['R2 R5', 'B3 ..'])
    expect(scorePrivateObjective(grid, priv('red'))).toBe(7)
    expect(scorePrivateObjective(grid, priv('blue'))).toBe(3)
  })
})

describe('tierFor', () => {
  it('maps totals to tiers at the provisional thresholds (40/65/90)', () => {
    expect(tierFor(0, PROVISIONAL_TIERS)).toBe('none')
    expect(tierFor(39, PROVISIONAL_TIERS)).toBe('none')
    expect(tierFor(40, PROVISIONAL_TIERS)).toBe('bronze')
    expect(tierFor(64, PROVISIONAL_TIERS)).toBe('bronze')
    expect(tierFor(65, PROVISIONAL_TIERS)).toBe('silver')
    expect(tierFor(89, PROVISIONAL_TIERS)).toBe('silver')
    expect(tierFor(90, PROVISIONAL_TIERS)).toBe('gold')
    expect(tierFor(500, PROVISIONAL_TIERS)).toBe('gold')
  })
})

describe('calculateScore', () => {
  it('itemizes objectives, adds the beam total, and assigns the tier', () => {
    const grid = parseGrid(['R1 B2 Y3 G4', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'])
    const objectives = {
      publics: [
        pub('odd', { kind: 'valueParity', parity: 'odd', pointsPerDie: 2 }),
        pub('rowColor', { kind: 'lineDiversity', axis: 'row', trait: 'color', pointsPerLine: 5 }),
        pub('quorum', { kind: 'colorQuorum', minPerColor: 2, pointsPerColor: 3 }),
      ] as [PublicObjective, PublicObjective, PublicObjective],
      privateObjective: priv('red'),
    }
    const report = calculateScore({
      grid,
      objectives,
      beamTotal: 100,
      tiers: { bronze: 40, silver: 65, gold: 90 },
    })
    expect(report.lines.map((l) => [l.objectiveId, l.points])).toEqual([
      ['odd', 4],
      ['rowColor', 5],
      ['quorum', 0],
      ['patron-red', 1],
    ])
    expect(report.lines).toHaveLength(4) // three publics + the private line
    expect(report.lines[3]).toMatchObject({ objectiveId: 'patron-red', points: 1 })
    expect(report.beamTotal).toBe(100)
    expect(report.total).toBe(110)
    expect(report.tier).toBe('gold')
  })
})
