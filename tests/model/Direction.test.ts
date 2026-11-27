/**
 * Criterion: input-domain partitioning — one partition per instance (N, E, S, W)
 * for delta, clockwise, counterClockwise, step, fromName; plus invalid name.
 */
import { describe, expect, it } from 'vitest'
import { Direction, DIRECTION_NAMES } from '../../src/model/Direction'
import { GameError } from '../../src/model/GameError'

/** Expected clockwise successor of each direction (FR-5.4, warm glass). */
const CW = [
  ['north', 'east'],
  ['east', 'south'],
  ['south', 'west'],
  ['west', 'north'],
] as const

/** Expected counter-clockwise successor of each direction (FR-5.4, cool glass). */
const CCW = [
  ['north', 'west'],
  ['west', 'south'],
  ['south', 'east'],
  ['east', 'north'],
] as const

/** Expected unit step (row delta, column delta) of each direction. */
const DELTAS = [
  ['north', -1, 0],
  ['east', 0, 1],
  ['south', 1, 0],
  ['west', 0, -1],
] as const

/** Expected result of stepping once from the interior cell (1, 1) in each direction. */
const STEPS_FROM_1_1 = [
  ['north', 0, 1],
  ['east', 1, 2],
  ['south', 2, 1],
  ['west', 1, 0],
] as const

/** Each compass name paired with the static instance `fromName` must return. */
const BY_NAME = [
  ['north', Direction.NORTH],
  ['east', Direction.EAST],
  ['south', Direction.SOUTH],
  ['west', Direction.WEST],
] as const

describe('Direction instances', () => {
  it('lists the four names clockwise from north, matching DIRECTION_NAMES', () => {
    expect(Direction.ALL.map((d) => d.name)).toEqual(['north', 'east', 'south', 'west'])
    expect(Direction.ALL.map((d) => d.name)).toEqual([...DIRECTION_NAMES])
  })

  it('has exactly four members in ALL', () => {
    expect(Direction.ALL).toHaveLength(4)
  })

  it.each([
    [0, Direction.NORTH],
    [1, Direction.EAST],
    [2, Direction.SOUTH],
    [3, Direction.WEST],
  ] as const)('has ALL[%d] identical to its static instance', (index, instance) => {
    expect(Direction.ALL[index]).toBe(instance)
  })

  it('freezes every instance', () => {
    expect(Object.isFrozen(Direction.WEST)).toBe(true)
  })

  it('stringifies to its compass name', () => {
    expect(String(Direction.SOUTH)).toBe('south')
  })
})

describe('Direction.clockwise (ported: rotates north → east → south → west → north)', () => {
  it.each(CW)('turns %s clockwise to %s (identity)', (from, to) => {
    expect(Direction.fromName(from).clockwise()).toBe(Direction.fromName(to))
  })

  it('returns to the start after a full turn', () => {
    expect(Direction.EAST.clockwise().clockwise().clockwise().clockwise()).toBe(Direction.EAST)
  })

  it('is undone by counterClockwise', () => {
    expect(Direction.SOUTH.clockwise().counterClockwise()).toBe(Direction.SOUTH)
  })
})

describe('Direction.counterClockwise (ported: rotates north → west → south → east → north)', () => {
  it.each(CCW)('turns %s counter-clockwise to %s (identity)', (from, to) => {
    expect(Direction.fromName(from).counterClockwise()).toBe(Direction.fromName(to))
  })
})

describe('Direction deltas (ported: maps each direction to a single-cell unit step)', () => {
  it.each(DELTAS)('steps %s by row %d, column %d', (name, row, col) => {
    const direction = Direction.fromName(name)
    expect(direction.rowDelta).toBe(row)
    expect(direction.colDelta).toBe(col)
    expect(direction.delta).toEqual({ row, col })
  })
})

describe('Direction.step', () => {
  it.each(STEPS_FROM_1_1)('steps %s from (1, 1) to (%d, %d)', (name, row, col) => {
    expect(Direction.fromName(name).step({ row: 1, col: 1 })).toEqual({ row, col })
  })

  it('moves east one column', () => {
    expect(Direction.EAST.step({ row: 2, col: 1 })).toEqual({ row: 2, col: 2 })
  })

  it('does not bounds-check: north from row 0 leaves the grid (caller checks)', () => {
    expect(Direction.NORTH.step({ row: 0, col: 3 })).toEqual({ row: -1, col: 3 })
  })
})

describe('Direction.fromName', () => {
  it.each(BY_NAME)('resolves %s to its static instance (identity)', (name, instance) => {
    expect(Direction.fromName(name)).toBe(instance)
  })

  it('rejects an unknown name with GameError', () => {
    expect(() => Direction.fromName('up')).toThrow(GameError)
  })

  it('reports the violation kind invalidArgument', () => {
    expect(() => Direction.fromName('up')).toThrow(
      expect.objectContaining({ violation: expect.objectContaining({ kind: 'invalidArgument' }) }),
    )
  })

  it('names the unknown direction in the message', () => {
    expect(() => Direction.fromName('up')).toThrow(/unknown direction "up"/)
  })
})
