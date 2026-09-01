import { describe, expect, it } from 'vitest'
import { DraftPool } from '../../src/engine/draftPool'
import { GameError } from '../../src/engine/errors'
import type { Die } from '../../src/engine/types'

const die = (color: Die['color'], value: number): Die => ({ color, value })

describe('DraftPool', () => {
  it('exposes a copy of its dice (mutation-safe view)', () => {
    const pool = new DraftPool([die('red', 3)])
    ;[...pool.dice].pop()
    expect(pool.dice).toHaveLength(1)
  })

  it('take removes the matching die (by color and value)', () => {
    const pool = new DraftPool([die('red', 3), die('blue', 5)])
    pool.take(die('blue', 5))
    expect(pool.dice).toEqual([die('red', 3)])
  })

  it('take throws dieNotInPool when the die is absent', () => {
    const pool = new DraftPool([die('red', 3)])
    expect(() => pool.take(die('red', 4))).toThrowError(GameError)
    expect(() => pool.take(die('red', 4))).toThrowError(/draft pool/)
  })

  it('putBack appends dice and clear empties the pool', () => {
    const pool = new DraftPool([die('red', 3)])
    pool.putBack([die('green', 2), die('green', 2)])
    expect(pool.dice).toHaveLength(3)
    pool.clear()
    expect(pool.size).toBe(0)
  })
})
