import { GameError } from './GameError'
import { normalizeSeed } from './SeededRandom'

/**
 * Final-score tier thresholds (FR-8.4). Must be strictly increasing: bronze < silver < gold.
 * Provisional until playtesting.
 */
export interface TierThresholds {
  /** Minimum final score for the bronze tier. */
  readonly bronze: number
  /** Minimum final score for the silver tier. */
  readonly silver: number
  /** Minimum final score for the gold tier. */
  readonly gold: number
}

/** Multiplier ceiling of the beam law (FR-4.14); shared by configuration and beam playback. */
export const DEFAULT_MULTIPLIER_CAP = 5

/** Default side length of the square window (a 4×4 grid); shared by configuration and pattern parsing. */
export const DEFAULT_GRID_SIZE = 4

/** Provisional tier thresholds (frozen); revisit after playtesting. */
export const PROVISIONAL_TIERS: TierThresholds = Object.freeze({ bronze: 40, silver: 65, gold: 90 })

/** The integer run parameters that may be overridden; each must be a positive integer. */
const INTEGER_FIELDS = [
  'rounds',
  'gridSize',
  'draftSize',
  'placementsPerRound',
  'copiesPerDie',
  'multiplierCap',
] as const

/**
 * Immutable run parameters; the single home of every tunable number (NFR-4.4).
 *
 * Instances are deeply frozen: the instance itself and its {@link GameConfig.tiers} snapshot.
 * The class holds no logic beyond defaults, seed normalization and override validation.
 */
export class GameConfig {
  /** Master seed, normalized by {@link normalizeSeed}. Every random draw of the run derives from it (FR-1.3). */
  readonly seed: number
  /** Number of rounds in a run (default 8). */
  readonly rounds: number
  /** Side length of the square window (default 4, i.e. a 4×4 grid). */
  readonly gridSize: number
  /** Dice offered in each round's draft pool (default 5). */
  readonly draftSize: number
  /** Dice the player places per round (default 2, FR-3.1). */
  readonly placementsPerRound: number
  /** Copies of each (colour, value) pair in the bag: 3 × 5 colours × 6 values = 90 dice. */
  readonly copiesPerDie: number
  /** Multiplier ceiling for beam scoring (default 5, FR-4.14). */
  readonly multiplierCap: number
  /** Final-score tiers (FR-8.4): a frozen copy, never the caller's object. */
  readonly tiers: TierThresholds

  /**
   * Creates one run's parameters from the defaults merged with `overrides`.
   * @param seed - the run seed; normalized with {@link normalizeSeed}. Never overridable.
   * @param overrides - replacement values for any non-seed field.
   * @throws GameError `invalidArgument` when an integer override is not a positive integer,
   *   or when the tiers are not strictly increasing (bronze < silver < gold).
   */
  constructor(seed: number, overrides: Partial<Omit<GameConfig, 'seed'>> = {}) {
    const settings = {
      rounds: 8,
      gridSize: DEFAULT_GRID_SIZE,
      draftSize: 5,
      placementsPerRound: 2,
      copiesPerDie: 3,
      multiplierCap: DEFAULT_MULTIPLIER_CAP,
      tiers: PROVISIONAL_TIERS,
      ...overrides,
    }
    for (const field of INTEGER_FIELDS) {
      const value = settings[field]
      if (!Number.isInteger(value) || value <= 0) {
        throw new GameError({ kind: 'invalidArgument', detail: `${field} must be a positive integer` })
      }
    }
    const { bronze, silver, gold } = settings.tiers
    if (!(bronze < silver && silver < gold)) {
      throw new GameError({
        kind: 'invalidArgument',
        detail: 'tiers must be strictly increasing (bronze < silver < gold)',
      })
    }
    this.seed = normalizeSeed(seed)
    this.rounds = settings.rounds
    this.gridSize = settings.gridSize
    this.draftSize = settings.draftSize
    this.placementsPerRound = settings.placementsPerRound
    this.copiesPerDie = settings.copiesPerDie
    this.multiplierCap = settings.multiplierCap
    this.tiers = Object.freeze({ bronze, silver, gold })
    Object.freeze(this)
  }
}

/**
 * Creates one run's parameters with a canonical seed shared by links and the RNG. Kept for
 * existing callers (runSession, challenges, autoPlayer, Game tests).
 * @param seed - the run seed; normalized with {@link normalizeSeed}.
 * @param overrides - replacement values for any non-seed field.
 * @returns a new, deeply frozen {@link GameConfig}.
 * @throws GameError `invalidArgument` on an invalid override (see the {@link GameConfig} constructor).
 */
export function createGameConfig(
  seed: number,
  overrides: Partial<Omit<GameConfig, 'seed'>> = {},
): GameConfig {
  return new GameConfig(seed, overrides)
}
