/**
 * Test-design criterion: BRANCH (EDGE) COVERAGE of the derived getters —
 * reduce over 0 / 1 / n segments; bendCount's "direction changes" branch taken and not taken;
 * peakMultiplier over empty and non-empty paths.
 * Fixtures (helper `seg(row, col, dir, die, m)` defined OUTSIDE the tests; each fixture is a
 * factory, so every test builds a fresh array):
 *  EMPTY   = []                                              -> total 0, length 0, bends 0, peak 1
 *  SINGLE  = [ (0,0,E, null, 1) ]                            -> total 0, length 1, bends 0, peak 1
 *  STRAIGHT= [ (0,0,E,null,1), (0,1,E,P4,1), (0,2,E,null,1) ]-> total 4, bends 0, peak 1
 *  ORBIT   = the 2x2 "R1 R1 / B1 R1" path from beamTracer.test.ts:
 *            (1,0,E,B1,1) (0,0,N,R1,2) (0,1,E,R1,3) (1,1,S,R1,4) (1,0,W,B1,5)
 *                                                            -> total 15, length 5, bends 4, peak 5
 *  PAIR    = [ (0,0,E,R1,1), (0,1,S,Y1,2) ], 'cycle'          -> total 3 (inc-33 temporary check T6)
 * Cases:
 *  T1..T4  totalScore for EMPTY, SINGLE, STRAIGHT, ORBIT (0, 0, 4, 15)
 *  L0..L1  length of EMPTY is 0 (inc-33 T5), length of ORBIT is 5 (inc-33 T1)
 *  B0..B3  bendCount for EMPTY (0, inc-33 T5), SINGLE (0), STRAIGHT (0), ORBIT (4, inc-33 T2)
 *  M1..M2  peakMultiplier for EMPTY (1, inc-33 T5), ORBIT (5, inc-33 T2)
 *  N1      termination is stored as given ('cycle' and 'exitedGrid')
 *  I1      segments array is a frozen copy: pushing throws TypeError; the source array is not
 *          aliased, and popping the source afterwards does not change the length (inc-33 T3)
 *  F1      instance is frozen (inc-33 T4)
 *  K1      own enumerable keys are exactly segments, totalScore, termination (inc-33 T4)
 *  D1      toData() of STRAIGHT equals the precomputed plain object (directions as 'east')
 *  D2      toData() of PAIR equals the legacy { segments, totalScore: 3, termination: 'cycle' }
 *          shape (inc-33 T6)
 * Error kinds: none (BeamPath raises no exception).
 */
import { describe, expect, it } from 'vitest'
import { BeamPath, type BeamTermination } from '../../src/model/BeamPath'
import { BeamSegment } from '../../src/model/BeamSegment'
import { Die } from '../../src/model/Die'
import { Direction } from '../../src/model/Direction'

/** Builds one segment at (row, col) entered heading `dir`, holding `die`, scored at multiplier `m`. */
const seg = (row: number, col: number, dir: Direction, die: Die | null, m: number): BeamSegment =>
  new BeamSegment({ row, col }, dir, die, m)

/** Builds a fresh segment array per call, so no fixture array is shared between tests. */
type SegmentsFactory = () => BeamSegment[]

const EMPTY: SegmentsFactory = () => []

const SINGLE: SegmentsFactory = () => [seg(0, 0, Direction.EAST, null, 1)]

const STRAIGHT: SegmentsFactory = () => [
  seg(0, 0, Direction.EAST, null, 1),
  seg(0, 1, Direction.EAST, new Die('purple', 4), 1),
  seg(0, 2, Direction.EAST, null, 1),
]

const ORBIT: SegmentsFactory = () => [
  seg(1, 0, Direction.EAST, new Die('blue', 1), 1),
  seg(0, 0, Direction.NORTH, new Die('red', 1), 2),
  seg(0, 1, Direction.EAST, new Die('red', 1), 3),
  seg(1, 1, Direction.SOUTH, new Die('red', 1), 4),
  seg(1, 0, Direction.WEST, new Die('blue', 1), 5),
]

const PAIR: SegmentsFactory = () => [
  seg(0, 0, Direction.EAST, new Die('red', 1), 1),
  seg(0, 1, Direction.SOUTH, new Die('yellow', 1), 2),
]

/** T1–T4: case ID, fixture name, fixture factory, precomputed total. */
const TOTAL_TABLE: readonly (readonly [string, string, SegmentsFactory, number])[] = [
  ['T1', 'EMPTY', EMPTY, 0],
  ['T2', 'SINGLE', SINGLE, 0],
  ['T3', 'STRAIGHT', STRAIGHT, 4],
  ['T4', 'ORBIT', ORBIT, 15],
]

/** L0–L1: case ID, fixture name, fixture factory, precomputed length. */
const LENGTH_TABLE: readonly (readonly [string, string, SegmentsFactory, number])[] = [
  ['L0', 'EMPTY', EMPTY, 0],
  ['L1', 'ORBIT', ORBIT, 5],
]

/** B0–B3: case ID, fixture name, fixture factory, precomputed bend count. */
const BEND_TABLE: readonly (readonly [string, string, SegmentsFactory, number])[] = [
  ['B0', 'EMPTY', EMPTY, 0],
  ['B1', 'SINGLE', SINGLE, 0],
  ['B2', 'STRAIGHT', STRAIGHT, 0],
  ['B3', 'ORBIT', ORBIT, 4],
]

/** M1–M2: case ID, fixture name, fixture factory, precomputed peak multiplier. */
const PEAK_TABLE: readonly (readonly [string, string, SegmentsFactory, number])[] = [
  ['M1', 'EMPTY', EMPTY, 1],
  ['M2', 'ORBIT', ORBIT, 5],
]

/** N1: termination passed in. */
const TERMINATION_TABLE: readonly BeamTermination[] = ['cycle', 'exitedGrid']

describe('BeamPath totalScore', () => {
  it.each(TOTAL_TABLE)('%s %s path totals %i', (_id, _name, makeSegments, expected) => {
    const path = new BeamPath(makeSegments(), 'exitedGrid')
    expect(path.totalScore).toBe(expected)
  })
})

describe('BeamPath length', () => {
  it.each(LENGTH_TABLE)('%s %s path has length %i', (_id, _name, makeSegments, expected) => {
    const path = new BeamPath(makeSegments(), 'exitedGrid')
    expect(path.length).toBe(expected)
  })
})

describe('BeamPath bendCount', () => {
  it.each(BEND_TABLE)('%s %s path has %i bends', (_id, _name, makeSegments, expected) => {
    const path = new BeamPath(makeSegments(), 'exitedGrid')
    expect(path.bendCount).toBe(expected)
  })
})

describe('BeamPath peakMultiplier', () => {
  it.each(PEAK_TABLE)('%s %s path peaks at multiplier %i', (_id, _name, makeSegments, expected) => {
    const path = new BeamPath(makeSegments(), 'exitedGrid')
    expect(path.peakMultiplier).toBe(expected)
  })
})

describe('BeamPath termination', () => {
  it.each(TERMINATION_TABLE)('N1 stores termination %s as given', (termination) => {
    const path = new BeamPath(STRAIGHT(), termination)
    expect(path.termination).toBe(termination)
  })
})

describe('BeamPath immutability', () => {
  it('I1 stores a copy, not the argument array', () => {
    const source = ORBIT()
    const path = new BeamPath(source, 'exitedGrid')
    expect(path.segments).not.toBe(source)
  })

  it('I1 freezes the segments array: pushing throws TypeError', () => {
    const path = new BeamPath(ORBIT(), 'exitedGrid')
    const extra = seg(0, 0, Direction.EAST, null, 1)
    expect(() => (path.segments as BeamSegment[]).push(extra)).toThrow(TypeError)
  })

  it('I1 is not aliased: popping the source afterwards leaves length 5', () => {
    const source = ORBIT()
    const path = new BeamPath(source, 'exitedGrid')
    source.pop()
    expect(path.length).toBe(5)
  })

  it('F1 freezes the instance', () => {
    const path = new BeamPath(ORBIT(), 'exitedGrid')
    expect(Object.isFrozen(path)).toBe(true)
  })

  it('K1 has exactly the own enumerable keys segments, totalScore, termination', () => {
    const path = new BeamPath(ORBIT(), 'exitedGrid')
    expect(Object.keys(path)).toEqual(['segments', 'totalScore', 'termination'])
  })
})

describe('BeamPath.toData', () => {
  it('D1 returns the plain STRAIGHT shape with direction names', () => {
    const path = new BeamPath(STRAIGHT(), 'exitedGrid')
    expect(path.toData()).toEqual({
      segments: [
        { position: { row: 0, col: 0 }, direction: 'east', die: null, points: 0 },
        { position: { row: 0, col: 1 }, direction: 'east', die: { color: 'purple', value: 4 }, points: 4 },
        { position: { row: 0, col: 2 }, direction: 'east', die: null, points: 0 },
      ],
      totalScore: 4,
      termination: 'exitedGrid',
    })
  })

  it('D2 returns the legacy shape for a 2-segment cycle path totalling 3', () => {
    const path = new BeamPath(PAIR(), 'cycle')
    expect(path.toData()).toEqual({
      segments: [
        { position: { row: 0, col: 0 }, direction: 'east', die: { color: 'red', value: 1 }, points: 1 },
        { position: { row: 0, col: 1 }, direction: 'south', die: { color: 'yellow', value: 1 }, points: 2 },
      ],
      totalScore: 3,
      termination: 'cycle',
    })
  })
})
