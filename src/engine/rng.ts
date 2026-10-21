/** Injected random source returning a number in the half-open interval [0, 1). */
export type Rng = () => number

/** Canonical unsigned 32-bit seed; invalid URL numbers map to the stable seed 0. */
export function normalizeSeed(seed: number): number {
  return Number.isFinite(seed) ? seed >>> 0 : 0
}

/** mulberry32 with private per-run state; the sole source of game randomness. */
export class SeededRandom {
  readonly seed: number
  #state: number

  constructor(seed: number) {
    this.seed = normalizeSeed(seed)
    this.#state = this.seed
  }

  /** Bound callback for injection; every call advances this instance's stream. */
  readonly next: Rng = () => {
    let a = this.#state
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    this.#state = a
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Function API for callers that need an injected random callback. */
export function mulberry32(seed: number): Rng {
  return new SeededRandom(seed).next
}
