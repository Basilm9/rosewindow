import { DIE_COLORS } from './types'
import type { DieColor } from './types'
import { sample } from './sample'
import type { Rng } from './rng'
import { PublicObjective as ModelPublicObjective } from '../model/PublicObjective'
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

export interface PrivateObjective {
  readonly kind: 'private'
  readonly id: string
  readonly name: string
  readonly description: string
  readonly color: DieColor
}

export type ObjectiveCard = PublicObjective | PrivateObjective

/**
 * The eight public objectives (pitch §6): three are dealt per run. Shim: the model's
 * {@link ModelPublicObjective.ALL} (Prompt 37), same ids, order and values.
 */
export const ALL_PUBLIC_OBJECTIVES: readonly PublicObjective[] = ModelPublicObjective.ALL

/** The five private color objectives (pitch §6): one is dealt per run. */
export const ALL_PRIVATE_OBJECTIVES: readonly PrivateObjective[] = DIE_COLORS.map((color) => ({
  kind: 'private' as const,
  id: `patron-${color}`,
  name: `Patron of ${color[0]!.toUpperCase()}${color.slice(1)}`,
  description: `Score the sum of values of your ${color} dice.`,
  color,
}))

export interface DealtObjectives {
  readonly publics: readonly [PublicObjective, PublicObjective, PublicObjective]
  readonly privateObjective: PrivateObjective
}

/** Deals three distinct public objectives and one private color objective, seeded. */
export function dealObjectives(rng: Rng): DealtObjectives {
  const [a, b, c] = sample(ALL_PUBLIC_OBJECTIVES, 3, rng)
  const [priv] = sample(ALL_PRIVATE_OBJECTIVES, 1, rng)
  return { publics: [a!, b!, c!], privateObjective: priv! }
}
