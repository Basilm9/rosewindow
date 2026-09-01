import { describe, expect, it } from 'vitest'
import { createGameConfig, PROVISIONAL_TIERS } from '../../src/engine/config'

describe('createGameConfig', () => {
  it('applies the pitch defaults (§2, §4, §5)', () => {
    const config = createGameConfig(7)
    expect(config).toMatchObject({
      seed: 7,
      rounds: 8,
      gridSize: 4,
      draftSize: 5,
      placementsPerRound: 2,
      copiesPerDie: 3,
      multiplierCap: 5,
    })
  })

  it('derives a 90-die bag from the default parameters (5 colors × 6 values × 3 copies)', () => {
    const config = createGameConfig(7)
    expect(5 * 6 * config.copiesPerDie).toBe(90)
  })

  it('allows overrides without touching the seed', () => {
    const config = createGameConfig(7, { rounds: 4, tiers: { bronze: 1, silver: 2, gold: 3 } })
    expect(config.rounds).toBe(4)
    expect(config.tiers).toEqual({ bronze: 1, silver: 2, gold: 3 })
    expect(config.seed).toBe(7)
    expect(config.gridSize).toBe(4)
  })

  it('exposes provisional tiers for tuning', () => {
    expect(PROVISIONAL_TIERS.bronze).toBeLessThan(PROVISIONAL_TIERS.silver)
    expect(PROVISIONAL_TIERS.silver).toBeLessThan(PROVISIONAL_TIERS.gold)
  })
})
