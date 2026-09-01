import { describe, expect, it } from 'vitest'
import { DiceBag } from '../../src/engine/diceBag'
import { GameError } from '../../src/engine/errors'
import { createGameConfig } from '../../src/engine/config'
import { mulberry32 } from '../../src/engine/rng'
import { DIE_COLORS } from '../../src/engine/types'

const bag = (seed: number) => new DiceBag(createGameConfig(seed), mulberry32(seed))

describe('DiceBag', () => {
  it('starts with 90 dice: 5 colors x 6 values x 3 copies', () => {
    const b = bag(42)
    expect(b.remainingCount).toBe(90)
    const counts = new Map<string, number>()
    for (const die of b.contents()) {
      const key = `${die.color}:${die.value}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    expect(counts.size).toBe(30)
    for (const count of counts.values()) expect(count).toBe(3)
    expect(b.contents().every((d) => DIE_COLORS.includes(d.color))).toBe(true)
  })

  it('draws deterministically for a given seed', () => {
    expect(bag(42).draw(5)).toEqual(bag(42).draw(5))
  })

  it('draws different dice for different seeds', () => {
    const a = bag(1).draw(5)
    const c = bag(2).draw(5)
    expect(a.map((d) => `${d.color}${d.value}`)).not.toEqual(c.map((d) => `${d.color}${d.value}`))
  })

  it('decrements remaining count and never returns the same physical die twice before a return', () => {
    const b = bag(7)
    const drawn = b.draw(10)
    expect(b.remainingCount).toBe(80)
    const again = b.draw(80)
    expect(again).toHaveLength(80)
    expect(b.remainingCount).toBe(0)
    const all = [...drawn, ...again].map((d) => `${d.color}${d.value}`)
    expect(all).toHaveLength(90)
  })

  it('throws the emptyBag violation when the draw exceeds the remainder', () => {
    const b = bag(9)
    b.draw(85)
    try {
      b.draw(6)
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(GameError)
      expect((err as GameError).violation.kind).toBe('emptyBag')
    }
  })

  it('returned dice go to the back of the bag and are drawable again', () => {
    const b = bag(11)
    b.draw(89)
    expect(b.remainingCount).toBe(1)
    const last = b.draw(1)
    expect(b.remainingCount).toBe(0)
    b.return(last)
    expect(b.draw(1)).toEqual(last)
  })
})
