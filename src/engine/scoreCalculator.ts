import type { Die, DieColor } from './types'
import { PublicObjective as ModelPublicObjective } from '../model/PublicObjective'
import { PrivateObjective as ModelPrivateObjective } from '../model/PrivateObjective'
import type { TierThresholds } from './config'
import type { PrivateObjective, PublicObjective } from './objectives'
import type { ScoreReport, Tier } from '../model/ScoreReport'
import { ScoreCalculator } from '../model/ScoreCalculator'

/**
 * Shim (Prompt 41): `ScoreLine`, `Tier` and `ScoreReport` now live in `src/model/ScoreReport.ts`.
 * `ScoreReport` is re-exported as a type only; reports are built by {@link ScoreCalculator}.
 */
export type { ScoreLine, Tier } from '../model/ScoreReport'
export type { ScoreReport }

/**
 * Shim (Prompt 43): `ScoreCalculator` and its `ScoreInput` now live in
 * `src/model/ScoreCalculator.ts`; re-exported here until Prompt 59.
 */
export { ScoreCalculator }
export type { ScoreInput } from '../model/ScoreCalculator'

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

/**
 * Maps a final total onto the bronze/silver/gold tiers (pitch §10); inclusive lower bounds.
 * Shim (Prompt 43): delegates to `new ScoreCalculator(tiers).tierFor(total)`.
 */
export function tierFor(total: number, tiers: TierThresholds): Tier {
  return new ScoreCalculator(tiers).tierFor(total)
}

/**
 * Legacy plain input of {@link calculateScore}: the objectives may be plain literals with no
 * `score` method (the old tests build them); model instances are assignable too. Deleted with
 * the shim in Prompt 59.
 */
export interface LegacyScoreInput {
  readonly grid: Grid
  readonly objectives: {
    readonly publics: readonly [PublicObjective, PublicObjective, PublicObjective]
    readonly privateObjective: PrivateObjective
  }
  readonly beamTotal: number
}

/**
 * Function API retaining the original per-call tier settings. Shim (Prompt 43): wraps the plain
 * objectives with `PublicObjective.from` / `PrivateObjective.from` (instances pass through as
 * they are) and scores them with the model's {@link ScoreCalculator}.
 */
export function calculateScore(
  input: LegacyScoreInput & { readonly tiers: TierThresholds },
): ScoreReport {
  const [a, b, c] = input.objectives.publics
  return new ScoreCalculator(input.tiers).calculate({
    grid: input.grid,
    objectives: {
      publics: [
        ModelPublicObjective.from(a),
        ModelPublicObjective.from(b),
        ModelPublicObjective.from(c),
      ],
      privateObjective: ModelPrivateObjective.from(input.objectives.privateObjective),
    },
    beamTotal: input.beamTotal,
  })
}
