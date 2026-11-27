import { SeededRandom } from '../model/SeededRandom'
import type { Rng } from '../model/SeededRandom'

/**
 * Strangler shim (Prompt 09): the seeded shuffle now lives in `src/model/SeededRandom.ts`.
 * Deleted in Prompt 59.
 */
export const shuffled: <T>(items: readonly T[], rng: Rng) => T[] = SeededRandom.shuffled

/**
 * Strangler shim (Prompt 09): seeded sampling now lives in `src/model/SeededRandom.ts`.
 * @throws GameError `invalidArgument` (see {@link SeededRandom.sample}).
 */
export const sample: <T>(items: readonly T[], count: number, rng: Rng) => T[] =
  SeededRandom.sample
