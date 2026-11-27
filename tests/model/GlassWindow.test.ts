/**
 * Criterion: input-domain partitioning of Position + branch coverage of place().
 * Inside: corner {0,0}, edge {0,2}, interior {1,1}, far corner {3,3}.
 * Outside: {-1,0}, {4,0}, {0,4}, {0.5,0}.
 * place(): outside → GameError outOfBounds; occupied → PlacementError; else commit.
 *
 * Ported from tests/engine/glassWindow.test.ts (none dropped):
 * "loads the pattern constraints into an empty 4x4 grid" → cases 1–3 (literal grids replace the
 * nested loops); "places dice immutably-visible and reports occupancy" → case 4.
 */
import { describe, expect, it } from 'vitest'
import { GlassWindow } from '../../src/model/GlassWindow'
import { ALL_PATTERNS, WindowPattern } from '../../src/model/WindowPattern'
import { Die } from '../../src/model/Die'
import { WindowCell } from '../../src/model/WindowCell'
import { GameError, PlacementError } from '../../src/model/GameError'
import type { Position } from '../../src/model/Position'

/** A fresh novice-rose window (4×4). */
const novice = () => GlassWindow.fromPattern(ALL_PATTERNS[0]!)

/** A fresh 2×2 window: yellow demand at {0,0}, value-3 demand at {1,1}. */
const tiny = () => GlassWindow.fromPattern(WindowPattern.fromRows('t', 'T', '', ['Y.', '.3'], 2))

/** A fresh red 3 for each call. */
const RED3 = () => new Die('red', 3)

/** The four inside partitions: corner, edge, interior, far corner. */
const INSIDE: readonly Position[] = [
  { row: 0, col: 0 },
  { row: 0, col: 2 },
  { row: 1, col: 1 },
  { row: 3, col: 3 },
]

/** The four outside partitions: row < 0, row ≥ size, col ≥ size, non-integer. */
const OUTSIDE: readonly Position[] = [
  { row: -1, col: 0 },
  { row: 4, col: 0 },
  { row: 0, col: 4 },
  { row: 0.5, col: 0 },
]

/** An empty 4×4 dice snapshot. */
const EMPTY_4X4 = [
  [null, null, null, null],
  [null, null, null, null],
  [null, null, null, null],
  [null, null, null, null],
]

/** Matches a thrown error whose violation kind is `outOfBounds`. */
const OUT_OF_BOUNDS = expect.objectContaining({
  violation: expect.objectContaining({ kind: 'outOfBounds' }),
})

/** Matches a thrown error whose violation kind is `cellOccupied`. */
const CELL_OCCUPIED = expect.objectContaining({
  violation: expect.objectContaining({ kind: 'cellOccupied' }),
})

/**
 * Runs `fn` and returns what it threw, so a test body can inspect the error without `try`.
 * @param fn - a call expected to throw.
 * @returns the thrown value, or `undefined` when `fn` returned normally.
 */
function catchError(fn: () => unknown): unknown {
  try {
    fn()
  } catch (error) {
    return error
  }
  return undefined
}

describe('construction', () => {
  it('1: a fresh novice window is empty, 4×4 and carries the pattern constraints', () => {
    const w = novice()
    expect(w.placedCount).toBe(0)
    expect(w.isEmpty).toBe(true)
    expect(w.gridSize).toBe(4)
    expect(w.constraints).toEqual(ALL_PATTERNS[0]!.constraints)
  })

  it('2: all 16 cells are empty', () => {
    expect(novice().dice).toEqual(EMPTY_4X4)
  })

  it('3: cellAt returns a WindowCell holding the printed demand and no die', () => {
    const cell = novice().cellAt({ row: 0, col: 2 })
    expect(cell).toBeInstanceOf(WindowCell)
    expect(cell).toEqual({ constraint: { kind: 'value', value: 5 }, die: null })
  })
})

describe('place and snapshots', () => {
  it('4: placing red 3 at {0,0} commits it and reports occupancy', () => {
    const w = novice()
    const die = RED3()
    w.place(die, { row: 0, col: 0 })
    expect(w.dieAt({ row: 0, col: 0 })).toEqual({ color: 'red', value: 3 })
    expect(w.placedCount).toBe(1)
    expect(w.cellAt({ row: 0, col: 0 })).toEqual({
      constraint: ALL_PATTERNS[0]!.constraints[0]![0],
      die,
    })
  })

  it('5: mutating a dice snapshot never changes the window', () => {
    const w = novice()
    const snapshot = w.dice as (Die | null)[][]
    snapshot[0]![0] = new Die('blue', 1)
    expect(w.dieAt({ row: 0, col: 0 })).toBeNull()
  })

  it('6: two snapshots are distinct arrays', () => {
    const w = novice()
    expect(w.dice).not.toBe(w.dice)
  })
})

describe('bounds', () => {
  it.each(INSIDE)('7–10: %o is inside', (p) => {
    expect(novice().isInside(p)).toBe(true)
  })

  it.each(OUTSIDE)('11–14: %o is outside and reads as null', (p) => {
    const w = novice()
    expect(w.isInside(p)).toBe(false)
    expect(w.dieAt(p)).toBeNull()
  })
})

describe('occupancy queries', () => {
  it('15: occupiedPositions is row-major regardless of placement order', () => {
    const w = tiny()
    w.place(RED3(), { row: 1, col: 1 })
    w.place(new Die('yellow', 2), { row: 0, col: 0 })
    expect(w.gridSize).toBe(2)
    expect(w.occupiedPositions()).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 1 },
    ])
  })

  it('16: remove clears a placed die', () => {
    const w = novice()
    w.place(RED3(), { row: 0, col: 0 })
    w.remove({ row: 0, col: 0 })
    expect(w.placedCount).toBe(0)
  })
})

describe('errors: outOfBounds', () => {
  it.each(OUTSIDE)('17–20: place at %o throws GameError outOfBounds', (p) => {
    const w = novice()
    expect(() => w.place(RED3(), p)).toThrow(GameError)
    expect(() => w.place(RED3(), p)).toThrow(/outside the grid/)
    expect(() => w.place(RED3(), p)).toThrow(OUT_OF_BOUNDS)
  })

  it('21: cellAt outside the grid throws GameError outOfBounds', () => {
    expect(() => novice().cellAt({ row: 4, col: 0 })).toThrow(GameError)
    expect(() => novice().cellAt({ row: 4, col: 0 })).toThrow(OUT_OF_BOUNDS)
  })

  it('22: remove outside the grid throws GameError outOfBounds', () => {
    expect(() => novice().remove({ row: 0, col: 4 })).toThrow(GameError)
    expect(() => novice().remove({ row: 0, col: 4 })).toThrow(OUT_OF_BOUNDS)
  })

  it('24b: an out-of-bounds place leaves the window unchanged (NFR-6.1)', () => {
    const w = novice()
    w.place(RED3(), { row: 0, col: 0 })
    const before = w.dice
    expect(() => w.place(new Die('blue', 1), { row: 4, col: 0 })).toThrow(GameError)
    expect(() => w.place(new Die('blue', 1), { row: 4, col: 0 })).toThrow(OUT_OF_BOUNDS)
    expect(w.dice).toEqual(before)
    expect(w.placedCount).toBe(1)
  })

  it('25: out-of-bounds is a caller defect, not a placement-law violation', () => {
    const error = catchError(() => novice().place(RED3(), { row: -1, col: 0 }))
    expect(error).toBeInstanceOf(GameError)
    expect(error).not.toBeInstanceOf(PlacementError)
  })
})

describe('errors: cellOccupied', () => {
  it('23: placing on an occupied cell throws PlacementError cellOccupied', () => {
    const w = novice()
    w.place(RED3(), { row: 0, col: 0 })
    expect(() => w.place(new Die('blue', 1), { row: 0, col: 0 })).toThrow(PlacementError)
    expect(() => w.place(new Die('blue', 1), { row: 0, col: 0 })).toThrow(CELL_OCCUPIED)
  })

  it('24: a rejected place leaves the window unchanged (NFR-6.1)', () => {
    const w = novice()
    w.place(RED3(), { row: 0, col: 0 })
    const before = w.dice
    expect(() => w.place(new Die('blue', 1), { row: 0, col: 0 })).toThrow(PlacementError)
    expect(w.dice).toEqual(before)
    expect(w.placedCount).toBe(1)
  })
})
