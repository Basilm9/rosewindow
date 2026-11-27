import type { DieGrid } from './GlassWindow'

/**
 * A scoring rule evaluated over the finished window (FR-2.4, FR-2.5). Implemented by
 * `PublicObjective` (one of eight shared rules) and, from Prompt 39, `PrivateObjective`.
 */
export interface Objective {
  /** Which deal the objective belongs to: one of the three publics or the single private. */
  readonly kind: 'public' | 'private'
  /** Stable identifier (e.g. `odd-values`); score lines and stored runs refer to it. */
  readonly id: string
  /** Display name shown on the objective card and the score report. */
  readonly name: string
  /** One-sentence rule text shown to the player. */
  readonly description: string
  /**
   * Points this objective awards for the grid as it stands (also used for live preview, FR-2.6).
   * @param grid - square die grid, row 0 north, column 0 west; `null` is an empty pane.
   * @returns the points, never negative.
   */
  score(grid: DieGrid): number
}
