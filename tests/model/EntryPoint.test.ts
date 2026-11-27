/**
 * Test-design criterion: BRANCH (EDGE) COVERAGE of EntryPoint.allFor — each of the four
 * edge conditions (row===0, col===last, row===last, col===0) taken true and false —
 * plus INPUT-DOMAIN PARTITIONING of isInwardFor (inward / outward / parallel-to-edge / interior).
 * Cases:
 *  A1 allFor(4) has 16 entries                       (all four branches)
 *  A2 corner (0,0) -> [south, east] in that order     (row===0 and col===0 true)
 *  A3 corner (0,3) -> [south, west]; (3,0) -> [north, east]; (3,3) -> [west, north]
 *  A4 interior cell (1,1) yields no entry             (all four branches false)
 *  A5 first five entries of allFor(4) equal a precomputed constant (order lock)
 *  A6 every entry of allFor(3), allFor(4), allFor(5) isInwardFor its size
 *  A7 every Direction is used at least once on 4x4
 *  A8 the full 16-entry allFor(4) sequence equals a precomputed constant (row-major, S/W/N/E)
 *  A9 allFor(3) has 12 entries and allFor(5) has 20 (4n entries on an n x n grid)
 *  A10 legacy allEntryPoints(4) equals the same 16-entry constant (shim; delete in Prompt 59)
 *  I1 isInwardFor(4) table: (0,0,south) true; (0,0,north) false (outward);
 *     (0,1,east) false (parallel to its edge); (1,1,east) false (interior);
 *     (1,1,north) false (interior)
 *  I2 isInwardFor(4) is true for one inward entry per direction (each switch arm true)
 *  I3 isInwardFor(4) is false for a cell outside the grid or with non-integer coordinates
 *  E1 equals: same data true; different direction false; different row / column false
 *  D1 toData() returns { position:{row,col}, direction:'south' } plain object
 *  D2 EntryPoint.fromData(entry.toData()).equals(entry) for an edge and a corner entry
 *  F1 instances are frozen (instance, its position, and the allFor array)
 *  X1 fromData with direction 'up' -> toThrow(GameError) and toThrow(/invalid argument/)
 *  X2 after the X1 rejection the input data object is unchanged
 * Error kinds: invalidArgument only (X1).
 */
import { describe, expect, it } from 'vitest'
import { Direction } from '../../src/model/Direction'
import { EntryPoint } from '../../src/model/EntryPoint'
import type { EntryPointData } from '../../src/model/EntryPoint'
import { GameError } from '../../src/model/GameError'
import { allEntryPoints } from '../../src/engine/types'

/** First five entries of allFor(4); verified once against the pre-inc-29 `allEntryPoints(4)`. */
const FIRST_FIVE_4X4 = [
  { position: { row: 0, col: 0 }, direction: 'south' },
  { position: { row: 0, col: 0 }, direction: 'east' },
  { position: { row: 0, col: 1 }, direction: 'south' },
  { position: { row: 0, col: 2 }, direction: 'south' },
  { position: { row: 0, col: 3 }, direction: 'south' },
] as const

/**
 * The complete allFor(4) sequence: cells row-major, S/W/N/E within each cell. Verified once
 * against the pre-inc-29 `allEntryPoints(4)` (git 2c28522^). `Game` samples this list with the
 * seeded RNG, so any change here changes the golden master.
 */
const ALL_4X4 = [
  { position: { row: 0, col: 0 }, direction: 'south' },
  { position: { row: 0, col: 0 }, direction: 'east' },
  { position: { row: 0, col: 1 }, direction: 'south' },
  { position: { row: 0, col: 2 }, direction: 'south' },
  { position: { row: 0, col: 3 }, direction: 'south' },
  { position: { row: 0, col: 3 }, direction: 'west' },
  { position: { row: 1, col: 0 }, direction: 'east' },
  { position: { row: 1, col: 3 }, direction: 'west' },
  { position: { row: 2, col: 0 }, direction: 'east' },
  { position: { row: 2, col: 3 }, direction: 'west' },
  { position: { row: 3, col: 0 }, direction: 'north' },
  { position: { row: 3, col: 0 }, direction: 'east' },
  { position: { row: 3, col: 1 }, direction: 'north' },
  { position: { row: 3, col: 2 }, direction: 'north' },
  { position: { row: 3, col: 3 }, direction: 'west' },
  { position: { row: 3, col: 3 }, direction: 'north' },
] as const

/** Corner cells of a 4x4 grid and their inward directions in allFor order (A2, A3). */
const CORNERS_4X4 = [
  [0, 0, ['south', 'east']],
  [0, 3, ['south', 'west']],
  [3, 0, ['north', 'east']],
  [3, 3, ['west', 'north']],
] as const

/** Grid size paired with the expected allFor length, 4n (A1, A9). */
const LENGTHS = [
  [3, 12],
  [4, 16],
  [5, 20],
] as const

/** isInwardFor(4) partition table: row, column, direction name, expected (I1). */
const INWARD_TABLE_4X4 = [
  [0, 0, 'south', true, 'inward'],
  [0, 0, 'north', false, 'outward'],
  [0, 1, 'east', false, 'parallel to its edge'],
  [1, 1, 'east', false, 'interior'],
  [1, 1, 'north', false, 'interior'],
] as const

/** One inward entry per direction on 4x4, covering every switch arm's true outcome (I2). */
const INWARD_PER_DIRECTION_4X4 = [
  [0, 2, 'south'],
  [2, 3, 'west'],
  [3, 1, 'north'],
  [1, 0, 'east'],
] as const

/** Positions outside a 4x4 grid or with non-integer coordinates (I3). */
const OFF_GRID_4X4 = [
  [-1, 0, 'south'],
  [4, 0, 'north'],
  [0, 4, 'west'],
  [0.5, 0, 'east'],
] as const

/** Direction names of the allFor(4) entries at one cell, in list order. */
const directionsAt = (row: number, col: number): readonly string[] =>
  EntryPoint.allFor(4)
    .filter((e) => e.position.row === row && e.position.col === col)
    .map((e) => e.direction.name)

describe('EntryPoint.allFor', () => {
  it('A1 yields 16 entry points on a 4x4 grid (8 non-corner edges, 4 corners with two inward directions) (ported from types.test.ts)', () => {
    expect(EntryPoint.allFor(4)).toHaveLength(16)
  })

  it.each(CORNERS_4X4)('A2/A3 gives corner (%d, %d) its inward directions in order %j', (row, col, expected) => {
    expect(directionsAt(row, col)).toEqual(expected)
  })

  it('A3 gives every corner both of its inward directions (ported from types.test.ts)', () => {
    expect([...directionsAt(0, 0)].sort()).toEqual(['east', 'south'])
    expect([...directionsAt(0, 3)].sort()).toEqual(['south', 'west'])
    expect([...directionsAt(3, 0)].sort()).toEqual(['east', 'north'])
    expect([...directionsAt(3, 3)].sort()).toEqual(['north', 'west'])
  })

  it('A4 yields no entry for the interior cell (1, 1)', () => {
    expect(directionsAt(1, 1)).toEqual([])
  })

  it('A5 starts with the precomputed first five entries (order lock)', () => {
    expect(
      EntryPoint.allFor(4)
        .slice(0, 5)
        .map((e) => e.toData()),
    ).toEqual(FIRST_FIVE_4X4)
  })

  it.each([3, 4, 5])(
    'A6 only admits directions that step inside the grid: every allFor(%d) entry isInwardFor it (ported from types.test.ts)',
    (n) => {
      expect(EntryPoint.allFor(n).every((e) => e.isInwardFor(n))).toBe(true)
    },
  )

  it('A7 uses every direction at least once (ported from types.test.ts)', () => {
    const used = new Set(EntryPoint.allFor(4).map((e) => e.direction))
    expect(used.size).toBe(4)
    expect([...used]).toEqual(expect.arrayContaining([...Direction.ALL]))
  })

  it('A8 produces exactly the precomputed 16-entry row-major S/W/N/E sequence', () => {
    expect(EntryPoint.allFor(4).map((e) => e.toData())).toEqual(ALL_4X4)
  })

  it.each(LENGTHS)('A9 allFor(%d) has %d entries', (n, length) => {
    expect(EntryPoint.allFor(n)).toHaveLength(length)
  })

  it('A10 legacy allEntryPoints(4) delegates and yields the same sequence (remove in Prompt 59)', () => {
    expect(allEntryPoints(4)).toEqual(ALL_4X4)
  })
})

describe('EntryPoint.isInwardFor', () => {
  it.each(INWARD_TABLE_4X4)('I1 (%d, %d) facing %s is %s on 4x4 (%s)', (row, col, name, expected) => {
    expect(new EntryPoint({ row, col }, Direction.fromName(name)).isInwardFor(4)).toBe(expected)
  })

  it.each(INWARD_PER_DIRECTION_4X4)('I2 (%d, %d) facing %s is inward on 4x4', (row, col, name) => {
    expect(new EntryPoint({ row, col }, Direction.fromName(name)).isInwardFor(4)).toBe(true)
  })

  it.each(OFF_GRID_4X4)('I3 (%d, %d) facing %s is not inward on 4x4 (off grid)', (row, col, name) => {
    expect(new EntryPoint({ row, col }, Direction.fromName(name)).isInwardFor(4)).toBe(false)
  })
})

describe('EntryPoint.equals', () => {
  it('E1 is true for an entry with the same cell and direction', () => {
    const a = new EntryPoint({ row: 0, col: 2 }, Direction.SOUTH)
    const b = new EntryPoint({ row: 0, col: 2 }, Direction.SOUTH)
    expect(a.equals(b)).toBe(true)
  })

  it('E1 is false when only the direction differs', () => {
    const a = new EntryPoint({ row: 0, col: 0 }, Direction.SOUTH)
    expect(a.equals(new EntryPoint({ row: 0, col: 0 }, Direction.EAST))).toBe(false)
  })

  it('E1 is false when only the row differs', () => {
    const a = new EntryPoint({ row: 1, col: 0 }, Direction.EAST)
    expect(a.equals(new EntryPoint({ row: 2, col: 0 }, Direction.EAST))).toBe(false)
  })

  it('E1 is false when only the column differs', () => {
    const a = new EntryPoint({ row: 0, col: 1 }, Direction.SOUTH)
    expect(a.equals(new EntryPoint({ row: 0, col: 2 }, Direction.SOUTH))).toBe(false)
  })
})

describe('EntryPoint.toData / fromData', () => {
  it('D1 toData returns a plain { position, direction-name } object with a fresh position', () => {
    const entry = new EntryPoint({ row: 0, col: 1 }, Direction.SOUTH)
    const data = entry.toData()
    expect(data).toEqual({ position: { row: 0, col: 1 }, direction: 'south' })
    expect(Object.getPrototypeOf(data)).toBe(Object.prototype)
    expect(data.position).not.toBe(entry.position)
  })

  it.each([
    ['edge', 0, 1, Direction.SOUTH],
    ['corner', 3, 3, Direction.WEST],
  ] as const)('D2 fromData(toData()) round-trips a %s entry', (_kind, row, col, direction) => {
    const entry = new EntryPoint({ row, col }, direction)
    expect(EntryPoint.fromData(entry.toData()).equals(entry)).toBe(true)
  })

  it('D2 fromData resolves the direction to its static instance', () => {
    expect(EntryPoint.fromData({ position: { row: 3, col: 1 }, direction: 'north' }).direction).toBe(Direction.NORTH)
  })
})

describe('EntryPoint immutability', () => {
  it('F1 freezes each instance and its position', () => {
    const entry = new EntryPoint({ row: 0, col: 0 }, Direction.EAST)
    expect(Object.isFrozen(entry)).toBe(true)
    expect(Object.isFrozen(entry.position)).toBe(true)
  })

  it('F1 freezes the allFor array and every entry in it', () => {
    const points = EntryPoint.allFor(4)
    expect(Object.isFrozen(points)).toBe(true)
    expect(points.every((e) => Object.isFrozen(e) && Object.isFrozen(e.position))).toBe(true)
  })

  it('F1 copies the constructor position, so later mutation of the argument has no effect', () => {
    const position = { row: 0, col: 2 }
    const entry = new EntryPoint(position, Direction.SOUTH)
    position.row = 3
    expect(entry.position).toEqual({ row: 0, col: 2 })
  })
})

describe('EntryPoint.fromData rejection', () => {
  /** Data whose direction name is not a compass direction. */
  const badData = (): EntryPointData =>
    ({ position: { row: 0, col: 0 }, direction: 'up' }) as unknown as EntryPointData

  it('X1 rejects direction "up" with GameError', () => {
    expect(() => EntryPoint.fromData(badData())).toThrow(GameError)
  })

  it('X1 reports the message "invalid argument"', () => {
    expect(() => EntryPoint.fromData(badData())).toThrow(/invalid argument/)
  })

  it('X1 reports the violation kind invalidArgument', () => {
    expect(() => EntryPoint.fromData(badData())).toThrow(
      expect.objectContaining({ violation: expect.objectContaining({ kind: 'invalidArgument' }) }),
    )
  })

  it('X2 leaves the input data unchanged after the rejection', () => {
    const data = badData()
    expect(() => EntryPoint.fromData(data)).toThrow(GameError)
    expect(data).toEqual({ position: { row: 0, col: 0 }, direction: 'up' })
  })
})
