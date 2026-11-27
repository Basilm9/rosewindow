import { PROVISIONAL_TIERS } from './config'
import type { Die, DieColor } from './types'
import { PublicObjective as ModelPublicObjective } from '../model/PublicObjective'
import { PrivateObjective as ModelPrivateObjective } from '../model/PrivateObjective'
import type { TierThresholds } from './config'
import type { PrivateObjective, PublicObjective } from './objectives'
import { ScoreReport } from '../model/ScoreReport'
import type { ScoreLine, Tier } from '../model/ScoreReport'

/**
 * Shim (Prompt 41): `ScoreLine`, `Tier` and `ScoreReport` now live in `src/model/ScoreReport.ts`.
 * `ScoreReport` is re-exported as a type only; reports are built by {@link ScoreCalculator}.
 */
export type { ScoreLine, Tier } from '../model/ScoreReport'
export type { ScoreReport }

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

/**
 * The private color objective: the sum of values of the patron color. Shim (Prompt 39): the
 * scoring now lives in `src/model/PrivateObjective.ts`; plain legacy objectives are wrapped with
 * `PrivateObjective.from` (only `color` is read) and scored by the model.
 */
export function scorePrivateObjective(grid: Grid, objective: PrivateObjective): number {
  return ModelPrivateObjective.from(objective).score(grid)
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
  /**
   * The dealt objectives in legacy plain shape (the model's `DealtObjectives` is assignable; the
   * old tests pass literals). Deleted with the shim in Prompt 59.
   */
  readonly objectives: {
    readonly publics: readonly [PublicObjective, PublicObjective, PublicObjective]
    readonly privateObjective: PrivateObjective
  }
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
    return new ScoreReport(lines, beamTotal, tierFor(total, this.tiers))
  }
}

/** Function API retaining the original per-call tier settings. */
export function calculateScore(
  input: ScoreInput & { readonly tiers: TierThresholds },
): ScoreReport {
  return new ScoreCalculator(input.tiers).calculate(input)
}
