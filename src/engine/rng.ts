/** Injected random source returning a number in the half-open interval [0, 1). */
export type Rng = () => number

/** Canonical unsigned 32-bit seed; invalid URL numbers map to the stable seed 0. */
export function normalizeSeed(seed: number): number {
  return Number.isFinite(seed) ? seed >>> 0 : 0
}

/**
 * mulberry32 — small, fast, seedable PRNG.
 * The sole randomness source for the entire game; always injected, never global.
 */
export function mulberry32(seed: number): Rng {
  let a = normalizeSeed(seed)
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
