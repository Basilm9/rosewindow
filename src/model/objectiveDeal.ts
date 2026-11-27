import { PrivateObjective } from './PrivateObjective'
import { PublicObjective } from './PublicObjective'
import { SeededRandom } from './SeededRandom'
import type { Rng } from './SeededRandom'

/** The run's objectives (FR-2.1, FR-2.2): three distinct publics in deal order and one private. */
export interface DealtObjectives {
  /** The three public objectives, in the order they were drawn (score lines follow it). */
  readonly publics: readonly [PublicObjective, PublicObjective, PublicObjective]
  /** The single private colour objective. */
  readonly privateObjective: PrivateObjective
}

/**
 * Deals three distinct publics and one private from the run's seeded stream (FR-2.1, FR-2.2).
 * Consumes the stream exactly as the reference does: `sample(PublicObjective.ALL, 3)` first, then
 * `sample(PrivateObjective.ALL, 1)`; reordering either draw changes every seeded run.
 * @param next - the run's random source (the bound `SeededRandom.next`).
 * @returns the dealt objectives (the objective instances themselves are frozen).
 * @throws {GameError} `invalidArgument` only if `sample` is asked for more items than exist
 *   (cannot happen with 8 and 5).
 */
export function dealObjectives(next: Rng): DealtObjectives {
  const [a, b, c] = SeededRandom.sample(PublicObjective.ALL, 3, next)
  const [privateObjective] = SeededRandom.sample(PrivateObjective.ALL, 1, next)
  return { publics: [a!, b!, c!], privateObjective: privateObjective! }
}
