import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../src/engine/rng'
import { ALL_PATTERNS, offerPatterns } from '../../src/engine/patterns'

describe('ALL_PATTERNS', () => {
  it('contains exactly six patterns', () => {
    expect(ALL_PATTERNS).toHaveLength(6)
  })

  it('has unique ids and names', () => {
    expect(new Set(ALL_PATTERNS.map((p) => p.id)).size).toBe(6)
    expect(new Set(ALL_PATTERNS.map((p) => p.name)).size).toBe(6)
  })

  it('each pattern is a 4x4 grid', () => {
    for (const p of ALL_PATTERNS) {
      expect(p.constraints, p.id).toHaveLength(4)
      for (const row of p.constraints) expect(row, p.id).toHaveLength(4)
    }
  })

  it('spans the density range: sparsest ≤ 6 demands, densest ≥ 12', () => {
    const demands = ALL_PATTERNS.map((p) =>
      p.constraints.flat().filter((c) => c.kind !== 'open').length,
    )
    expect(Math.min(...demands)).toBeLessThanOrEqual(6)
    expect(Math.max(...demands)).toBeGreaterThanOrEqual(12)
  })
})

describe('offerPatterns', () => {
  it('is deterministic for a given seed', () => {
    const a = offerPatterns(mulberry32(42))
    const b = offerPatterns(mulberry32(42))
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id))
  })

  it('offers two distinct patterns', () => {
    for (let seed = 0; seed < 50; seed++) {
      const [a, b] = offerPatterns(mulberry32(seed))
      expect(a.id).not.toBe(b.id)
    }
  })

  it('eventually offers every pattern (200 seeds cover all six)', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 200; seed++) {
      for (const p of offerPatterns(mulberry32(seed))) seen.add(p.id)
    }
    expect(seen.size).toBe(6)
  })
})
