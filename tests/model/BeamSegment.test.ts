/**
 * Test-design criterion: INPUT-DOMAIN PARTITIONING of the constructor inputs.
 *   die:        {null} | {value 1} | {value 6}
 *   multiplier: {1} | {3 (interior)} | {5 (default cap)}
 * Cases (expected points precomputed):
 *  P1 null die, m=1 -> 0          P2 null die, m=5 -> 0
 *  P3 R1, m=1 -> 1                P4 B2, m=3 -> 6
 *  P5 P6, m=5 -> 30               P6 Y6, m=1 -> 6
 *  P7 B2, m=1 -> 2 (inc-31 temporary check T1)
 *  P8 R3, m=2 -> 6 (inc-31 temporary check T3)
 *  S1 struck is false for null die, true otherwise
 *  K1 direction stored is the entry direction passed in (pre-refraction)
 *  K2 position is copied: mutating the source object does not change the segment
 *  K3 own enumerable keys are exactly position, direction, die, multiplier, points (T4)
 *  F1 instance is frozen (Object.isFrozen), and so is its position
 *  D1 toData() equals { position:{row:0,col:1}, direction:'east', die:{color:'blue',value:2}, points:2 }
 *  D2 toData() for G5 facing west at m=3 is { position, direction:'west', die, points:15 } with no
 *     multiplier key (T5)
 *  R1 ported: "records die and zero points for empty cells" (null die at every multiplier 1..5)
 * Error kinds: none (BeamSegment raises no exception).
 */
import { describe, expect, it } from 'vitest'
import { BeamSegment } from '../../src/model/BeamSegment'
import { Die } from '../../src/model/Die'
import { Direction } from '../../src/model/Direction'

/** Builds a fresh die (or null) per test, so no fixture is shared between table rows. */
type DieFactory = () => Die | null

/** P1–P8: case ID, die label, die factory, multiplier, precomputed points. */
const POINTS_TABLE: readonly (readonly [string, string, DieFactory, number, number])[] = [
  ['P1', 'null', () => null, 1, 0],
  ['P2', 'null', () => null, 5, 0],
  ['P3', 'red 1', () => new Die('red', 1), 1, 1],
  ['P4', 'blue 2', () => new Die('blue', 2), 3, 6],
  ['P5', 'purple 6', () => new Die('purple', 6), 5, 30],
  ['P6', 'yellow 6', () => new Die('yellow', 6), 1, 6],
  ['P7', 'blue 2', () => new Die('blue', 2), 1, 2],
  ['P8', 'red 3', () => new Die('red', 3), 2, 6],
]

/** S1: die label, die factory, multiplier, expected `struck`. */
const STRUCK_TABLE: readonly (readonly [string, DieFactory, number, boolean])[] = [
  ['null', () => null, 1, false],
  ['null', () => null, 4, false],
  ['red 3', () => new Die('red', 3), 2, true],
  ['green 6', () => new Die('green', 6), 5, true],
]

describe('BeamSegment points', () => {
  it.each(POINTS_TABLE)('%s die %s at multiplier %i scores %i', (_id, _label, makeDie, multiplier, expected) => {
    const segment = new BeamSegment({ row: 0, col: 1 }, Direction.EAST, makeDie(), multiplier)
    expect(segment.points).toBe(expected)
  })

  it.each([1, 2, 3, 4, 5])(
    'R1 records a null die and zero points for an empty pane at multiplier %i (ported from beamTracer.test.ts segment shape)',
    (multiplier) => {
      const segment = new BeamSegment({ row: 2, col: 2 }, Direction.SOUTH, null, multiplier)
      expect(segment.die).toBeNull()
      expect(segment.points).toBe(0)
    },
  )
})

describe('BeamSegment struck', () => {
  it.each(STRUCK_TABLE)('S1 die %s at multiplier %i has struck %s', (_label, makeDie, multiplier, expected) => {
    const segment = new BeamSegment({ row: 1, col: 0 }, Direction.EAST, makeDie(), multiplier)
    expect(segment.struck).toBe(expected)
  })
})

describe('BeamSegment fields', () => {
  it('K1 stores the entry direction, not the post-refraction one (a red die would turn north to east)', () => {
    const segment = new BeamSegment({ row: 3, col: 1 }, Direction.NORTH, new Die('red', 4), 2)
    expect(segment.direction).toBe(Direction.NORTH)
  })

  it('K2 copies the position, so mutating the source afterwards has no effect', () => {
    const position = { row: 0, col: 1 }
    const segment = new BeamSegment(position, Direction.EAST, new Die('red', 3), 2)
    position.row = 3
    position.col = 2
    expect(segment.position).toEqual({ row: 0, col: 1 })
  })

  it('K3 has exactly the own enumerable keys position, direction, die, multiplier, points', () => {
    const segment = new BeamSegment({ row: 0, col: 1 }, Direction.EAST, new Die('blue', 2), 1)
    expect(Object.keys(segment)).toEqual(['position', 'direction', 'die', 'multiplier', 'points'])
  })
})

describe('BeamSegment immutability', () => {
  it('F1 freezes the instance', () => {
    const segment = new BeamSegment({ row: 0, col: 1 }, Direction.EAST, new Die('red', 3), 2)
    expect(Object.isFrozen(segment)).toBe(true)
  })

  it('F1 freezes the stored position', () => {
    const segment = new BeamSegment({ row: 0, col: 1 }, Direction.EAST, new Die('red', 3), 2)
    expect(Object.isFrozen(segment.position)).toBe(true)
  })
})

describe('BeamSegment.toData', () => {
  it('D1 returns the legacy { position, direction-name, die, points } shape', () => {
    const segment = new BeamSegment({ row: 0, col: 1 }, Direction.EAST, new Die('blue', 2), 1)
    expect(segment.toData()).toEqual({
      position: { row: 0, col: 1 },
      direction: 'east',
      die: { color: 'blue', value: 2 },
      points: 2,
    })
  })

  it('D2 gives direction "west" and 15 points for green 5 at multiplier 3', () => {
    const segment = new BeamSegment({ row: 2, col: 3 }, Direction.WEST, new Die('green', 5), 3)
    expect(segment.toData()).toEqual({
      position: { row: 2, col: 3 },
      direction: 'west',
      die: { color: 'green', value: 5 },
      points: 15,
    })
  })

  it('D2 omits the multiplier: the keys are exactly position, direction, die, points', () => {
    const segment = new BeamSegment({ row: 2, col: 3 }, Direction.WEST, new Die('green', 5), 3)
    expect(Object.keys(segment.toData())).toEqual(['position', 'direction', 'die', 'points'])
  })
})
