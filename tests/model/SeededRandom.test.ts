/**
 * Criterion: input-domain partitioning + branch coverage of sample().
 * seed: in range (3, 42), above 2^32 (4294967299 ≡ 3), non-finite (NaN ≡ 0).
 * count: 0, 1..n (valid), n+1 (too many), -1 (negative), 1.5 (non-integer).
 */
import { describe, expect, it } from 'vitest'
import { GameError } from '../../src/model/GameError'
import { mulberry32, normalizeSeed, SeededRandom } from '../../src/model/SeededRandom'

/** Precomputed from the reference implementation; any drift here moves the golden master. */
const SEED3_FIRST3 = [0.7202267837710679, 0.03866216051392257, 0.4561921926215291]
const SEED42_FIRST3 = [0.6011037519201636, 0.44829055899754167, 0.8524657934904099]
const SEED0_FIRST = 0.26642920868471265
const SHUFFLE_1_8_SEED42 = [3, 8, 2, 1, 7, 6, 4, 5]
const SAMPLE_AF_3_SEED42 = ['b', 'a', 'e']

describe('SeededRandom stream (seed partitions)', () => {
  it('reproduces the frozen mulberry32 stream for an in-range seed (3)', () => {
    const r = new SeededRandom(3)
    expect([r.next(), r.next(), r.next()]).toEqual(SEED3_FIRST3)
  })

  it('wraps a seed above 2^32 (4294967299 ≡ 3) and keeps next bound when detached', () => {
    const r = new SeededRandom(4294967299)
    const n = r.next
    expect(r.seed).toBe(3)
    expect([n(), n(), n()]).toEqual(SEED3_FIRST3)
  })

  it('exposes the same stream through the mulberry32 function API (seed 42)', () => {
    const rng = mulberry32(42)
    expect([rng(), rng(), rng()]).toEqual(SEED42_FIRST3)
  })

  it('maps a non-finite seed (NaN) to the stable seed 0', () => {
    expect(new SeededRandom(Number.NaN).next()).toBe(SEED0_FIRST)
  })

  it('keeps state per instance: advancing one stream does not affect a new one', () => {
    const a = new SeededRandom(3)
    a.next()
    a.next()
    expect(new SeededRandom(3).next()).toBe(SEED3_FIRST3[0])
  })

  it('produces values in [0, 1)', () => {
    const r = new SeededRandom(7)
    const values = Array.from({ length: 1000 }, r.next)
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...values)).toBeLessThan(1)
  })

  it('produces different sequences for different seeds', () => {
    const a = new SeededRandom(1)
    const b = new SeededRandom(2)
    expect([a.next(), a.next()]).not.toEqual([b.next(), b.next()])
  })
})

describe('SeededRandom.shuffled', () => {
  it('reproduces the frozen Fisher–Yates order (static, seed 42)', () => {
    expect(SeededRandom.shuffled([1, 2, 3, 4, 5, 6, 7, 8], mulberry32(42))).toEqual(
      SHUFFLE_1_8_SEED42,
    )
  })

  it('gives the same order through the instance method as through the static', () => {
    expect(new SeededRandom(42).shuffled([1, 2, 3, 4, 5, 6, 7, 8])).toEqual(SHUFFLE_1_8_SEED42)
  })

  it('is a permutation and leaves the input untouched', () => {
    const items = [1, 2, 3, 4, 5]
    const out = SeededRandom.shuffled(items, mulberry32(9))
    expect(items).toEqual([1, 2, 3, 4, 5])
    expect([...out].sort()).toEqual(items)
  })

  it('varies across seeds (every element reaches the front somewhere in 200 seeds)', () => {
    const fronts = new Set(
      Array.from(
        { length: 200 },
        (_, s) => SeededRandom.shuffled([0, 1, 2, 3, 4], mulberry32(s))[0],
      ),
    )
    expect(fronts.size).toBe(5)
  })
})

describe('SeededRandom.sample (count partitions, validation branches)', () => {
  it('draws distinct elements in the frozen order for a valid count (3 of 6)', () => {
    expect(SeededRandom.sample(['a', 'b', 'c', 'd', 'e', 'f'], 3, mulberry32(42))).toEqual(
      SAMPLE_AF_3_SEED42,
    )
  })

  it('returns an empty array for count 0', () => {
    expect(SeededRandom.sample(['a', 'b', 'c'], 0, mulberry32(42))).toEqual([])
  })

  it.each([
    [3, 'too many (n+1)'],
    [-1, 'negative'],
    [1.5, 'non-integer'],
  ])('throws GameError for count %s (%s)', (count) => {
    expect(() => SeededRandom.sample([1, 2], count, mulberry32(1))).toThrow(GameError)
  })

  it('reports an invalid argument in the message', () => {
    expect(() => SeededRandom.sample([1, 2], 3, mulberry32(1))).toThrow(/invalid argument/)
  })

  it('carries the machine-readable kind invalidArgument', () => {
    const act = () => SeededRandom.sample([1, 2], 3, mulberry32(1))
    expect(act).toThrow(GameError)
    expect(act).toThrow(
      expect.objectContaining({ violation: expect.objectContaining({ kind: 'invalidArgument' }) }),
    )
  })
})

describe('normalizeSeed', () => {
  it.each([
    [-1, 4294967295],
    [3.8, 3],
    [Number.POSITIVE_INFINITY, 0],
  ])('normalizes %s to %s', (seed, expected) => {
    expect(normalizeSeed(seed)).toBe(expected)
  })
})
