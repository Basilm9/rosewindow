import { GameError } from './GameError'

/** Injected random source returning a number in the half-open interval [0, 1). */
export type Rng = () => number

/**
 * Canonical unsigned 32-bit seed; non-finite input maps to 0 (FR-1.6).
 *
 * Finite values are coerced with `>>> 0`, so fractions truncate (`3.8 → 3`), negatives wrap
 * (`-1 → 4294967295`) and values past 2³² wrap modulo 2³² (`4294967299 → 3`). `NaN` and
 * `±Infinity` map to the stable seed 0. Links, the RNG and `GameConfig` all share this
 * one normalization, so the same input always names the same run.
 * @param seed - any number, typically parsed from a URL or a challenge code.
 * @returns the seed as an integer in [0, 2³²).
 */
export function normalizeSeed(seed: number): number {
  return Number.isFinite(seed) ? seed >>> 0 : 0
}

/**
 * mulberry32 with private per-run state; the sole source of game randomness (NFR-1.2).
 *
 * `Game` constructs exactly one instance from `config.seed` and injects its bound
 * {@link SeededRandom.next} into every consumer (dice bag, pattern offer, objective deal,
 * entry sampling) in a fixed order, so the same seed reproduces the same run (FR-1.4, NFR-1.1).
 * The arithmetic and the shuffle loop are bit-identical to the reference implementation; any
 * change alters every seeded run and the golden master.
 */
export class SeededRandom {
  /** Normalized seed this stream started from (see {@link normalizeSeed}). */
  readonly seed: number

  /** Private mulberry32 state; advanced by every call to {@link SeededRandom.next}. */
  #state: number

  /**
   * Starts a stream at the normalized seed.
   * @param seed - any number; normalized with {@link normalizeSeed}.
   */
  constructor(seed: number) {
    this.seed = normalizeSeed(seed)
    this.#state = this.seed
  }

  /**
   * Next value of the stream in [0, 1). An arrow-function property (not a prototype method),
   * so it stays bound when detached and can be injected as an {@link Rng}; every call advances
   * this instance only.
   * @returns a pseudo-random number in [0, 1).
   */
  readonly next: Rng = () => {
    let a = this.#state
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    this.#state = a
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /**
   * Fisher–Yates shuffle over a copy using this stream; the input is not mutated.
   * @param items - the elements to permute.
   * @returns a new array holding a permutation of `items`.
   */
  shuffled<T>(items: readonly T[]): T[] {
    return SeededRandom.shuffled(items, this.next)
  }

  /**
   * Draws `count` distinct elements using this stream.
   * @param items - the population to draw from.
   * @param count - how many elements to draw.
   * @returns the first `count` elements of a seeded shuffle of `items`.
   * @throws GameError `invalidArgument` when `count` is negative, non-integer or greater than
   *   `items.length`.
   */
  sample<T>(items: readonly T[], count: number): T[] {
    return SeededRandom.sample(items, count, this.next)
  }

  /**
   * Fisher–Yates shuffle over a copy for callers that hold only an injected {@link Rng}.
   * Draws exactly `n - 1` values from `rng` (none for `n ≤ 1`); the input is not mutated.
   * Deterministic for a given rng and input order — golden-master sequences depend on this.
   * @param items - the elements to permute.
   * @param rng - the random source to consume.
   * @returns a new array holding a permutation of `items`.
   */
  static shuffled<T>(items: readonly T[], rng: Rng): T[] {
    const out = [...items]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      const tmp = out[i]!
      out[i] = out[j]!
      out[j] = tmp
    }
    return out
  }

  /**
   * Draws `count` distinct elements with a seeded shuffle, for callers that hold only an
   * injected {@link Rng}. Validation happens before any value is drawn, so a rejected call
   * leaves the stream untouched.
   * @param items - the population to draw from.
   * @param count - how many elements to draw.
   * @param rng - the random source to consume.
   * @returns the first `count` elements of a seeded shuffle of `items`.
   * @throws GameError `invalidArgument` when `count` is negative, non-integer or greater than
   *   `items.length`.
   */
  static sample<T>(items: readonly T[], count: number, rng: Rng): T[] {
    if (!Number.isInteger(count) || count < 0 || count > items.length) {
      throw new GameError({
        kind: 'invalidArgument',
        detail: `cannot sample ${count} of ${items.length}`,
      })
    }
    return SeededRandom.shuffled(items, rng).slice(0, count)
  }
}

/**
 * Function API kept for existing callers that need an injected random callback.
 * @param seed - any number; normalized with {@link normalizeSeed}.
 * @returns the bound `next` of a fresh {@link SeededRandom}.
 */
export function mulberry32(seed: number): Rng {
  return new SeededRandom(seed).next
}
