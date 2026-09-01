import type { Rng } from './rng'

/**
 * Fisher–Yates shuffle over a copy; the input is not mutated. Deterministic for a
 * given rng and input order — golden-master sequences depend on this stability.
 */
export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

/** Draws `count` distinct elements using a seeded shuffle. */
export function sample<T>(items: readonly T[], count: number, rng: Rng): T[] {
  if (count > items.length) throw new Error(`cannot sample ${count} of ${items.length}`)
  return shuffled(items, rng).slice(0, count)
}
