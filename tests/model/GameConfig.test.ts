/**
 * Test-design criterion: input-domain partitioning.
 * seed partitions: non-finite (NaN, +Infinity) → 0; negative (-1) → 4294967295;
 *   fractional (3.8) → 3; above 2^32 (4294967299) → 3; in range (7) → 7.
 * override partitions: absent (defaults), valid positive integer, zero, negative,
 *   non-integer, tiers increasing, tiers not increasing.
 */
import { describe, expect, it } from 'vitest'
import {
  createGameConfig,
  DEFAULT_MULTIPLIER_CAP,
  GameConfig,
  PROVISIONAL_TIERS,
} from '../../src/model/GameConfig'
import { GameError } from '../../src/model/GameError'

describe('GameConfig seed normalization', () => {
  it.each([
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
    [-1, 4294967295],
    [3.8, 3],
    [4294967299, 3],
    [7, 7],
  ])('normalizes seed %s to the actual RNG seed %s', (seed, expected) => {
    expect(createGameConfig(seed).seed).toBe(expected)
  })

  it('ignores a seed smuggled in through the overrides', () => {
    const config = new GameConfig(1, { seed: 9 } as never)
    expect(config.seed).toBe(1)
  })
})

describe('GameConfig defaults (overrides absent)', () => {
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

  it('defaults to the provisional tiers and a multiplier cap of 5', () => {
    const config = createGameConfig(7)
    expect(config.tiers).toEqual({ bronze: 40, silver: 65, gold: 90 })
    expect(DEFAULT_MULTIPLIER_CAP).toBe(5)
  })

  it('derives a 90-die bag from the default parameters (5 colors × 6 values × 3 copies)', () => {
    const config = createGameConfig(7)
    expect(5 * 6 * config.copiesPerDie).toBe(90)
  })

  it('exposes provisional tiers for tuning', () => {
    expect(PROVISIONAL_TIERS.bronze).toBeLessThan(PROVISIONAL_TIERS.silver)
    expect(PROVISIONAL_TIERS.silver).toBeLessThan(PROVISIONAL_TIERS.gold)
  })
})

describe('GameConfig valid overrides', () => {
  it('allows overrides without touching the seed', () => {
    const config = createGameConfig(7, { rounds: 4, tiers: { bronze: 1, silver: 2, gold: 3 } })
    expect(config.rounds).toBe(4)
    expect(config.tiers).toEqual({ bronze: 1, silver: 2, gold: 3 })
    expect(config.seed).toBe(7)
    expect(config.gridSize).toBe(4)
  })

  it('does not retain the mutable tier override object', () => {
    const tiers = { bronze: 10, silver: 20, gold: 30 }
    const config = createGameConfig(-1, { tiers })
    expect(config).toBeInstanceOf(GameConfig)
    expect(config.seed).toBe(4294967295)
    tiers.gold = 999
    expect(config.tiers.gold).toBe(30)
  })

  it('is deeply frozen: the instance and its tiers', () => {
    const config = createGameConfig(-1, { tiers: { bronze: 10, silver: 20, gold: 30 } })
    expect(Object.isFrozen(config)).toBe(true)
    expect(Object.isFrozen(config.tiers)).toBe(true)
  })
})

describe('GameConfig invalid overrides (invalidArgument)', () => {
  it.each([
    ['rounds', 0],
    ['draftSize', -1],
    ['gridSize', 2.5],
    ['multiplierCap', 0],
    ['placementsPerRound', 0],
    ['copiesPerDie', -3],
  ])('rejects %s = %s', (field, value) => {
    expect(() => new GameConfig(1, { [field]: value })).toThrow(GameError)
  })

  it('rejects tiers that are not strictly increasing', () => {
    const act = () => new GameConfig(1, { tiers: { bronze: 50, silver: 40, gold: 90 } })
    expect(act).toThrow(GameError)
    expect(act).toThrow(/invalid argument/)
  })
})
