import { DIE_COLORS } from './types'
import type { DieColor } from './types'
import { sample } from './sample'
import type { Rng } from './rng'

/**
 * Public objective strategies (pitch §11 families). Each variant carries its own
 * scoring parameters so the phase-5 `ScoreCalculator` can execute them without
 * special cases. Point values are provisional until the playtest (TUNABLE).
 */
export type PublicObjectiveStrategy =
  | { readonly kind: 'valueParity'; readonly parity: 'odd' | 'even'; readonly pointsPerDie: number }
  | {
      readonly kind: 'lineDiversity'
      readonly axis: 'row' | 'col'
      readonly trait: 'color' | 'value'
      readonly pointsPerLine: number
    }
  | { readonly kind: 'diagonalDiversity'; readonly trait: 'color'; readonly pointsPerDie: number }
  | { readonly kind: 'colorQuorum'; readonly minPerColor: number; readonly pointsPerColor: number }

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

/** The eight public objectives (pitch §6): three are dealt per run. */
export const ALL_PUBLIC_OBJECTIVES: readonly PublicObjective[] = [
  {
    kind: 'public',
    id: 'odd-values',
    name: 'Odd Values',
    description: 'Score 1 point per die with an odd value.',
    strategy: { kind: 'valueParity', parity: 'odd', pointsPerDie: 1 },
  },
  {
    kind: 'public',
    id: 'even-values',
    name: 'Even Values',
    description: 'Score 1 point per die with an even value.',
    strategy: { kind: 'valueParity', parity: 'even', pointsPerDie: 1 },
  },
  {
    kind: 'public',
    id: 'row-color-variety',
    name: 'Row Color Variety',
    description: 'Score 5 points for each row whose four dice all differ in color.',
    strategy: { kind: 'lineDiversity', axis: 'row', trait: 'color', pointsPerLine: 5 },
  },
  {
    kind: 'public',
    id: 'column-color-variety',
    name: 'Column Color Variety',
    description: 'Score 5 points for each column whose four dice all differ in color.',
    strategy: { kind: 'lineDiversity', axis: 'col', trait: 'color', pointsPerLine: 5 },
  },
  {
    kind: 'public',
    id: 'row-value-variety',
    name: 'Row Value Variety',
    description: 'Score 4 points for each row whose four dice all differ in value.',
    strategy: { kind: 'lineDiversity', axis: 'row', trait: 'value', pointsPerLine: 4 },
  },
  {
    kind: 'public',
    id: 'column-value-variety',
    name: 'Column Value Variety',
    description: 'Score 4 points for each column whose four dice all differ in value.',
    strategy: { kind: 'lineDiversity', axis: 'col', trait: 'value', pointsPerLine: 4 },
  },
  {
    kind: 'public',
    id: 'diagonal-color-variety',
    name: 'Diagonal Color Variety',
    description:
      'Score 1 point for each die that shares its color with none of its diagonal neighbors.',
    strategy: { kind: 'diagonalDiversity', trait: 'color', pointsPerDie: 1 },
  },
  {
    kind: 'public',
    id: 'balanced-palette',
    name: 'Balanced Palette',
    description: 'Score 3 points for each color of which at least 2 dice are placed.',
    strategy: { kind: 'colorQuorum', minPerColor: 2, pointsPerColor: 3 },
  },
]

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
