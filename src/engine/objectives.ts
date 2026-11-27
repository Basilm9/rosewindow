import type { DieColor } from './types'
import { PublicObjective as ModelPublicObjective } from '../model/PublicObjective'
import { PrivateObjective as ModelPrivateObjective } from '../model/PrivateObjective'
import type { PublicObjectiveStrategy } from '../model/PublicObjective'

/**
 * The strategy union moved to `src/model/PublicObjective.ts` (Prompt 37); re-exported here
 * until Prompt 59.
 */
export type { PublicObjectiveStrategy } from '../model/PublicObjective'

/**
 * Legacy plain shape of a public objective. Kept as an interface (not the model class) because
 * the old tests build literals of it: a `PublicObjective` instance is assignable to this type,
 * a literal is not assignable to the class.
 */
export interface PublicObjective {
  readonly kind: 'public'
  readonly id: string
  readonly name: string
  readonly description: string
  readonly strategy: PublicObjectiveStrategy
}

/**
 * Legacy plain shape of a private objective. Kept as an interface (not the model class) because
 * the old tests build literals of it: a model `PrivateObjective` instance is assignable to this
 * type, a literal is not assignable to the class. Deleted in Prompt 59.
 */
export interface PrivateObjective {
  readonly kind: 'private'
  readonly id: string
  readonly name: string
  readonly description: string
  readonly color: DieColor
}

/** Either legacy objective shape; the view narrows it on `kind`. */
export type ObjectiveCard = PublicObjective | PrivateObjective

/**
 * The eight public objectives (pitch §6): three are dealt per run. Shim: the model's
 * {@link ModelPublicObjective.ALL} (Prompt 37), same ids, order and values.
 */
export const ALL_PUBLIC_OBJECTIVES: readonly PublicObjective[] = ModelPublicObjective.ALL

/**
 * The five private color objectives (pitch §6): one is dealt per run. Shim: the model's
 * {@link ModelPrivateObjective.ALL} (Prompt 39), same ids, names, descriptions and colour order.
 */
export const ALL_PRIVATE_OBJECTIVES: readonly PrivateObjective[] = ModelPrivateObjective.ALL

/**
 * The seeded deal and its result type moved to `src/model/objectiveDeal.ts` (Prompt 39);
 * re-exported here until Prompt 59. The draw order (three publics, then one private) is unchanged.
 */
export { dealObjectives } from '../model/objectiveDeal'
export type { DealtObjectives } from '../model/objectiveDeal'
