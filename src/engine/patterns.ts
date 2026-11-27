import { WindowPattern } from '../model/WindowPattern'
import type { CellConstraint } from '../model/CellConstraint'
import type { Rng } from '../model/SeededRandom'

/**
 * Strangler shim (Prompt 17): the six-pattern catalog now lives in `src/model/WindowPattern.ts`.
 * Deleted in Prompt 59.
 */
export { ALL_PATTERNS } from '../model/WindowPattern'

/**
 * Strangler shim (Prompt 17): parsing now lives in {@link WindowPattern.parseConstraints}.
 * @throws GameError `malformedPattern` on an invalid character or a non-square layout.
 */
export const parseConstraints: (rows: readonly string[]) => CellConstraint[][] =
  WindowPattern.parseConstraints

/**
 * Strangler shim (Prompt 17): the seeded offer now lives in {@link WindowPattern.offer}.
 * @param rng - the run's injected random source.
 * @returns two distinct catalog patterns, deterministic for the rng.
 */
export const offerPatterns = (rng: Rng): [WindowPattern, WindowPattern] => WindowPattern.offer(rng)
