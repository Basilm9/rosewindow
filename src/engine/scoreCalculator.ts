import { PROVISIONAL_TIERS } from './config'
import type { Die, DieColor } from './types'
import { PublicObjective as ModelPublicObjective } from '../model/PublicObjective'
import type { TierThresholds } from './config'
import type { DealtObjectives, PrivateObjective, PublicObjective } from './objectives'

/** A single itemized line of the final score (pitch §8.2 `ScoreReport`). */
export interface ScoreLine {
  readonly objectiveId: string
  readonly name: string
  readonly points: number
}

export type Tier = 'none' | 'bronze' | 'silver' | 'gold'

export interface ScoreReport {
  /** Three public lines then the private line, in deal order. */
  readonly lines: readonly ScoreLine[]
  readonly beamTotal: number
  readonly total: number
  readonly tier: Tier
}

type Grid = readonly (readonly (Die | null)[])[]

/** Counts dice of one color anywhere on the window (delegates to `PublicObjective.colorCount`). */
export function colorCount(grid: Grid, color: DieColor): number {
  return ModelPublicObjective.colorCount(grid, color)
}

/**
 * Scores one public objective over the window (pitch §11). Shim (Prompt 37): the four strategy
 * families now live in `src/model/PublicObjective.ts`; plain legacy objectives are wrapped with
 * `PublicObjective.from` and scored by the model.
 */
export function scorePublicObjective(grid: Grid, objective: PublicObjective): number {
  return ModelPublicObjective.from(objective).score(grid)
}

/** The private color objective: the sum of values of the patron color. */
export function scorePrivateObjective(grid: Grid, objective: PrivateObjective): number {
  return grid
    .flat()
    .filter((d) => d !== null && d.color === objective.color)
    .reduce((sum, d) => sum + d!.value, 0)
}

/** Maps a final total onto the bronze/silver/gold tiers (pitch §10). */
export function tierFor(total: number, tiers: TierThresholds): Tier {
  if (total >= tiers.gold) return 'gold'
  if (total >= tiers.silver) return 'silver'
  if (total >= tiers.bronze) return 'bronze'
  return 'none'
}

/** Inputs for final scoring; tier settings belong to the calculator instance. */
export interface ScoreInput {
  readonly grid: Grid
  readonly objectives: DealtObjectives
  readonly beamTotal: number
}

/** Computes itemized reports with a fixed snapshot of the run's tier settings. */
export class ScoreCalculator {
  readonly tiers: TierThresholds

  constructor(tiers: TierThresholds = PROVISIONAL_TIERS) {
    this.tiers = Object.freeze({ ...tiers })
  }

  /** Pure final scoring over a finished window: objectives + beam totals (pitch §4). */
  calculate(input: ScoreInput): ScoreReport {
    const { grid, objectives, beamTotal } = input
    const lines: ScoreLine[] = objectives.publics.map((o) => ({
      objectiveId: o.id,
      name: o.name,
      points: scorePublicObjective(grid, o),
    }))
    const privateLine: ScoreLine = {
      objectiveId: objectives.privateObjective.id,
      name: objectives.privateObjective.name,
      points: scorePrivateObjective(grid, objectives.privateObjective),
    }
    lines.push(privateLine)
    const objectiveTotal = lines.reduce((sum, line) => sum + line.points, 0)
    const total = beamTotal + objectiveTotal
    return { lines, beamTotal, total, tier: tierFor(total, this.tiers) }
  }
}

/** Function API retaining the original per-call tier settings. */
export function calculateScore(
  input: ScoreInput & { readonly tiers: TierThresholds },
): ScoreReport {
  return new ScoreCalculator(input.tiers).calculate(input)
}
