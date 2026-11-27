import type { BeamSegment, LegacyBeamSegmentData } from './BeamSegment'

/**
 * Why a trace stopped: the next cell would leave the window (`'exitedGrid'`, FR-5.8) or the
 * next (cell, direction) pair was already visited on this trace (`'cycle'`, FR-5.9).
 */
export type BeamTermination = 'exitedGrid' | 'cycle'

/**
 * Plain form of a {@link BeamPath}: the legacy engine `BeamPath` interface shape, with every
 * segment in its {@link LegacyBeamSegmentData} form. Used by the engine shims until prompt 59.
 */
export interface LegacyBeamPathData {
  /** Segments in strike order, each in legacy plain form. */
  readonly segments: readonly LegacyBeamSegmentData[]
  /** Sum of segment points. */
  readonly totalScore: number
  /** Termination reason. */
  readonly termination: BeamTermination
}

/**
 * The complete, ordered result of one beam trace (FR-5.3); carried by `BeamTracedEvent`.
 *
 * Data only: it never traces or applies refraction rules. `totalScore` is derived in the
 * constructor as the sum of `segment.points` — never passed in — so the round's beam score
 * (FR-5.11) can never disagree with the path. An empty path is accepted (length 0, total 0)
 * although the tracer always records the entry cell.
 *
 * Immutable: the segment array is copied and frozen, and the instance is frozen. Its only own
 * enumerable fields are `segments`, `totalScore` and `termination`. Raises no exceptions.
 */
export class BeamPath {
  /** Segments in the order the cells were struck (FR-5.10). A frozen copy of the argument. */
  readonly segments: readonly BeamSegment[]

  /** Sum of segment points — the round's beam score (FR-5.11). */
  readonly totalScore: number

  /** Why the trace stopped. */
  readonly termination: BeamTermination

  /**
   * Copies and freezes `segments`, derives `totalScore`, and freezes the instance.
   * @param segments - the visited cells in strike order; copied, so later mutation of the
   *   argument array has no effect.
   * @param termination - why the trace stopped.
   */
  constructor(segments: readonly BeamSegment[], termination: BeamTermination) {
    this.segments = Object.freeze([...segments])
    this.totalScore = this.segments.reduce((sum, segment) => sum + segment.points, 0)
    this.termination = termination
    Object.freeze(this)
  }

  /**
   * Number of cells entered.
   * @returns the segment count (0 for an empty path).
   */
  get length(): number {
    return this.segments.length
  }

  /**
   * Number of bends visible on the path: segments whose successor has a different direction,
   * compared by identity (`Direction` instances are static). A bend on the last segment — which
   * then exits or meets the cycle guard — is not counted, because no successor records it.
   * Read-only query for the view and tests; never used to score.
   * @returns the count of indices `i` with `segments[i].direction !== segments[i + 1].direction`.
   */
  get bendCount(): number {
    let bends = 0
    for (let i = 0; i + 1 < this.segments.length; i++) {
      if (this.segments[i]!.direction !== this.segments[i + 1]!.direction) bends++
    }
    return bends
  }

  /**
   * Highest multiplier recorded on the path's segments.
   * @returns the maximum `segment.multiplier`, or 1 for an empty path (a straight path is 1).
   */
  get peakMultiplier(): number {
    return this.segments.reduce((peak, segment) => Math.max(peak, segment.multiplier), 1)
  }

  /**
   * The legacy plain shape used by the engine shims.
   * @returns a new `{ segments, totalScore, termination }` object whose segments are fresh
   *   {@link BeamSegment.toData} copies.
   */
  toData(): LegacyBeamPathData {
    return {
      segments: this.segments.map((segment) => segment.toData()),
      totalScore: this.totalScore,
      termination: this.termination,
    }
  }
}
