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
