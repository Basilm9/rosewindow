/**
 * Immutable per-run parameters. Beam behavior (colors, lockout V−1, multiplier cap)
 * is rule law except where explicitly tunable here; thresholds are provisional until
 * the post-phase-5 playtest (pitch §15).
 */
export interface TierThresholds {
  readonly bronze: number
  readonly silver: number
  readonly gold: number
}

export interface GameConfig {
  /** Master seed. Every random draw of the run derives from this one number. */
  readonly seed: number
  readonly rounds: number
  readonly gridSize: number
  readonly draftSize: number
  readonly placementsPerRound: number
  /** Copies of each (color, value) pair in the bag: 3 × 5 colors × 6 values = 90 dice. */
  readonly copiesPerDie: number
  /** Multiplier ceiling for beam scoring (pitch §5). */
  readonly multiplierCap: number
  /** Final-score tiers. TUNABLE — provisional until playtesting. */
  readonly tiers: TierThresholds
}

/** Provisional tier thresholds; revisit after the phase-5 playtest. */
export const PROVISIONAL_TIERS: TierThresholds = { bronze: 40, silver: 65, gold: 90 }

export function createGameConfig(
  seed: number,
  overrides: Partial<Omit<GameConfig, 'seed'>> = {},
): GameConfig {
  return {
    seed,
    rounds: 8,
    gridSize: 4,
    draftSize: 5,
    placementsPerRound: 2,
    copiesPerDie: 3,
    multiplierCap: 5,
    tiers: PROVISIONAL_TIERS,
    ...overrides,
  }
}
