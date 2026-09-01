import type { BeamPath } from './beamTracer'
import type { PlacementViolation } from './errors'
import type { ScoreReport } from './scoreCalculator'
import type { Die, Position } from './types'

/**
 * Semantic model events (pitch §8.3). The view consumes these to animate rather
 * than redraw wholesale; they carry enough payload to do so without re-querying.
 */
export type GameEvent =
  | { readonly kind: 'diePlaced'; readonly position: Position; readonly die: Die }
  | {
      readonly kind: 'placementRejected'
      readonly position: Position
      readonly violation: PlacementViolation
    }
  | { readonly kind: 'draftPoolRefreshed'; readonly dice: readonly Die[] }
  | { readonly kind: 'beamTraced'; readonly path: BeamPath }
  | { readonly kind: 'roundScored'; readonly round: number; readonly delta: number }
  | { readonly kind: 'gameOver'; readonly report: ScoreReport }

export type GameListener = (event: GameEvent) => void
