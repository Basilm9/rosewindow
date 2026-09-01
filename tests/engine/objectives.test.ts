import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../src/engine/rng'
import {
  ALL_PRIVATE_OBJECTIVES,
  ALL_PUBLIC_OBJECTIVES,
  dealObjectives,
} from '../../src/engine/objectives'
import { DIE_COLORS } from '../../src/engine/types'

describe('ALL_PUBLIC_OBJECTIVES', () => {
  it('contains exactly eight objectives with unique ids', () => {
    expect(ALL_PUBLIC_OBJECTIVES).toHaveLength(8)
    expect(new Set(ALL_PUBLIC_OBJECTIVES.map((o) => o.id)).size).toBe(8)
  })

  it('covers all four strategy families from the pitch (§11)', () => {
    const kinds = new Set(ALL_PUBLIC_OBJECTIVES.map((o) => o.strategy.kind))
    expect(kinds).toEqual(
      new Set(['valueParity', 'lineDiversity', 'diagonalDiversity', 'colorQuorum']),
    )
  })
})

describe('ALL_PRIVATE_OBJECTIVES', () => {
  it('contains exactly one objective per color', () => {
    expect(ALL_PRIVATE_OBJECTIVES).toHaveLength(5)
    expect(new Set(ALL_PRIVATE_OBJECTIVES.map((o) => o.color)).size).toBe(5)
    expect(new Set(ALL_PRIVATE_OBJECTIVES.map((o) => o.color))).toEqual(new Set(DIE_COLORS))
  })
})

describe('dealObjectives', () => {
  it('is deterministic for a given seed', () => {
    const a = dealObjectives(mulberry32(42))
    const b = dealObjectives(mulberry32(42))
    expect(a.publics.map((o) => o.id)).toEqual(b.publics.map((o) => o.id))
    expect(a.privateObjective.id).toBe(b.privateObjective.id)
  })

  it('deals three distinct publics and one private', () => {
    for (let seed = 0; seed < 50; seed++) {
      const deal = dealObjectives(mulberry32(seed))
      expect(new Set(deal.publics.map((o) => o.id)).size).toBe(3)
      expect(deal.privateObjective.kind).toBe('private')
    }
  })

  it('eventually deals every public objective (300 seeds cover all eight)', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 300; seed++) {
      for (const o of dealObjectives(mulberry32(seed)).publics) seen.add(o.id)
    }
    expect(seen.size).toBe(8)
  })
})
