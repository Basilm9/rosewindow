import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../src/engine/rng'
import { sample, shuffled } from '../../src/engine/sample'

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const seqA = [a(), a(), a()]
    const seqB = [b(), b(), b()]
    expect(seqA).toEqual(seqB)
  })

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    expect([a(), a()]).not.toEqual([b(), b()])
  })
})

describe('shuffled', () => {
  it('is deterministic for the same seed', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(shuffled(items, mulberry32(42))).toEqual(shuffled(items, mulberry32(42)))
  })

  it('is a permutation: same elements, same count, input untouched', () => {
    const items = [1, 2, 3, 4, 5]
    const out = shuffled(items, mulberry32(9))
    expect(out).toHaveLength(items.length)
    expect([...out].sort()).toEqual([...items].sort())
    expect(items).toEqual([1, 2, 3, 4, 5])
  })

  it('varies across seeds (every element reaches the front somewhere in 200 seeds)', () => {
    const items = [0, 1, 2, 3, 4]
    const fronts = new Set<number>()
    for (let seed = 0; seed < 200; seed++) {
      fronts.add(shuffled(items, mulberry32(seed))[0]!)
    }
    expect(fronts.size).toBe(items.length)
  })
})

describe('sample', () => {
  it('draws distinct elements deterministically', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f']
    const first = sample(items, 3, mulberry32(42))
    const second = sample(items, 3, mulberry32(42))
    expect(first).toEqual(second)
    expect(new Set(first).size).toBe(3)
    expect(first.every((x) => items.includes(x))).toBe(true)
  })

  it('throws when sampling more than available', () => {
    expect(() => sample([1, 2], 3, mulberry32(1))).toThrow()
  })
})
