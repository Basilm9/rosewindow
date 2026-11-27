/**
 * Criterion: branch coverage of take()/contains() + partitioning of pool content.
 * take: found (first of duplicates) | not found → PlacementError dieNotInPool
 * contains: true | false (same color other value; same value other color)
 * content: empty | single | duplicates [green2, green2]
 *
 * Ported from tests/engine/draftPool.test.ts (none dropped): "exposes a copy of its dice" → 1;
 * "take removes the matching die" → 3; "take throws dieNotInPool when the die is absent" → 13–14;
 * "putBack appends dice and clear empties the pool" → 11–12.
 */
import { describe, expect, it } from 'vitest'
import { DraftPool } from '../../src/model/DraftPool'
import { Die } from '../../src/model/Die'
import { GameError, PlacementError } from '../../src/model/GameError'

/** A fresh die of the given colour and value. */
const d = (color: Die['color'], value: number) => new Die(color, value)

/** Runs `fn` and returns what it threw (undefined if nothing was thrown). */
const catchError = (fn: () => unknown): unknown => {
  try {
    fn()
  } catch (error) {
    return error
  }
  return undefined
}

/** Matches a thrown error whose violation kind is `dieNotInPool`. */
const DIE_NOT_IN_POOL = expect.objectContaining({
  violation: expect.objectContaining({ kind: 'dieNotInPool' }),
})

describe('copy semantics', () => {
  it('1: dice is a copy; mutating it does not affect the pool', () => {
    const pool = new DraftPool([d('red', 3)])
    ;[...pool.dice].pop()
    expect(pool.dice).toHaveLength(1)
  })

  it('2: the constructor copies its input array', () => {
    const source = [d('red', 3), d('blue', 5)]
    const pool = new DraftPool(source)
    source.pop()
    expect(pool.size).toBe(2)
  })

  it('18: popping a dice copy leaves pool.size at 1', () => {
    const pool = new DraftPool([d('red', 3)])
    ;[...pool.dice].pop()
    expect(pool.size).toBe(1)
  })
})

describe('take: match found', () => {
  it('3: removes the matching die (by color and value)', () => {
    const pool = new DraftPool([d('red', 3), d('blue', 5)])
    pool.take(d('blue', 5))
    expect(pool.dice).toEqual([d('red', 3)])
  })

  it("4: returns the pool's own instance for a plain {color, value} argument", () => {
    const red3 = d('red', 3)
    const pool = new DraftPool([red3, d('blue', 5)])
    expect(pool.take({ color: 'red', value: 3 })).toBe(red3)
  })

  it('5: takes the first of duplicate dice', () => {
    const pool = new DraftPool([d('green', 2), d('red', 1), d('green', 2)])
    pool.take(d('green', 2))
    expect(pool.dice).toEqual([d('red', 1), d('green', 2)])
  })

  it('6: preserves the order of the remaining dice', () => {
    const pool = new DraftPool([d('red', 3), d('blue', 5), d('purple', 6)])
    pool.take(d('blue', 5))
    expect(pool.dice).toEqual([d('red', 3), d('purple', 6)])
  })
})

describe('contains', () => {
  it('7: true for a die with the same color and value', () => {
    expect(new DraftPool([d('red', 3)]).contains({ color: 'red', value: 3 })).toBe(true)
  })

  it('8: false for the same color with another value', () => {
    expect(new DraftPool([d('red', 3)]).contains(d('red', 4))).toBe(false)
  })

  it('9: false for the same value with another color', () => {
    expect(new DraftPool([d('red', 3)]).contains(d('blue', 3))).toBe(false)
  })

  it('10: an empty pool has size 0 and contains nothing', () => {
    const pool = new DraftPool([])
    expect(pool.size).toBe(0)
    expect(pool.contains(d('red', 3))).toBe(false)
  })

  it('19: the static DraftPool.contains rule is true for an equal die and agrees with the instance method', () => {
    expect(DraftPool.contains([d('red', 3)], d('red', 3))).toBe(true)
    expect(DraftPool.contains([d('red', 3)], d('red', 3))).toBe(
      new DraftPool([d('red', 3)]).contains(d('red', 3)),
    )
  })

  it('20: the static DraftPool.contains rule is false for an absent die', () => {
    expect(DraftPool.contains([d('red', 3)], d('red', 4))).toBe(false)
  })
})

describe('putBack and clear', () => {
  it('11: putBack appends dice at the end, duplicates included', () => {
    const pool = new DraftPool([d('red', 3)])
    pool.putBack([d('green', 2), d('green', 2)])
    expect(pool.dice).toEqual([d('red', 3), d('green', 2), d('green', 2)])
  })

  it('12: clear empties the pool; an earlier dice copy keeps its dice', () => {
    const pool = new DraftPool([d('red', 3), d('green', 2)])
    const before = pool.dice
    pool.clear()
    expect(pool.size).toBe(0)
    expect(before).toEqual([d('red', 3), d('green', 2)])
  })
})

describe('take: match not found (dieNotInPool)', () => {
  it('13: an absent die throws PlacementError dieNotInPool', () => {
    const pool = new DraftPool([d('red', 3)])
    expect(() => pool.take(d('red', 4))).toThrow(PlacementError)
    expect(() => pool.take(d('red', 4))).toThrow(DIE_NOT_IN_POOL)
  })

  it('14: the message names the draft pool', () => {
    const pool = new DraftPool([d('red', 3)])
    expect(() => pool.take(d('red', 4))).toThrow(/draft pool/)
  })

  it('15: the error is a PlacementError and a GameError with violation { kind: dieNotInPool }', () => {
    const error = catchError(() => new DraftPool([d('red', 3)]).take(d('red', 4)))
    expect(error).toBeInstanceOf(PlacementError)
    expect(error).toBeInstanceOf(GameError)
    expect(error).toEqual(DIE_NOT_IN_POOL)
    expect((error as PlacementError).violation).toEqual({ kind: 'dieNotInPool' })
  })

  it('16: the pool is unchanged after the rejection (NFR-2.1)', () => {
    const pool = new DraftPool([d('red', 3), d('blue', 5)])
    const snapshot = pool.dice
    expect(() => pool.take(d('red', 4))).toThrow(PlacementError)
    expect(pool.dice).toEqual(snapshot)
  })

  it('17: taking from an empty pool throws dieNotInPool and leaves it empty', () => {
    const pool = new DraftPool([])
    expect(() => pool.take(d('red', 3))).toThrow(PlacementError)
    expect(() => pool.take(d('red', 3))).toThrow(DIE_NOT_IN_POOL)
    expect(pool.size).toBe(0)
  })

  it('21: rejecting red4 from [red3] leaves size 1 and dice [red3]', () => {
    const pool = new DraftPool([d('red', 3)])
    expect(() => pool.take(d('red', 4))).toThrow(DIE_NOT_IN_POOL)
    expect(pool.size).toBe(1)
    expect(pool.dice).toEqual([d('red', 3)])
  })
})
