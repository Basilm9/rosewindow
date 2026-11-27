/**
 * Shim (strangler migration): the beam traversal now lives in `src/model/BeamTracer.ts`
 * (Prompt 35), returning `BeamPath`/`BeamSegment` instances. This module keeps the legacy plain
 * shapes and string-direction entry for `game.ts`, `useGame.ts`, `beamMachine.ts` and the views.
 * Deleted in Prompt 59.
 */
import { BeamTracer as ModelBeamTracer } from '../model/BeamTracer'
import { EntryPoint as ModelEntryPoint } from '../model/EntryPoint'
import type { LegacyBeamPathData } from '../model/BeamPath'
import type { LegacyBeamSegmentData } from '../model/BeamSegment'
import type { DieGrid } from '../model/GlassWindow'
import { DEFAULT_MULTIPLIER_CAP } from './config'
import type { EntryPoint } from './types'

/** Legacy plain segment: position, entry direction name, die, points (no multiplier). */
export type BeamSegment = LegacyBeamSegmentData

/** Legacy plain path: plain segments, total, termination. */
export type BeamPath = LegacyBeamPathData

/** Compatibility export; the shared ceiling is defined in the run configuration. */
export { DEFAULT_MULTIPLIER_CAP } from './config'

/**
 * Legacy wrapper with the old `trace(grid, plainEntry)` signature (used by `game.ts` and
 * `classes.test.ts`). Delegates to {@link ModelBeamTracer}; behaviour and errors are the model's.
 */
export class BeamTracer {
  /** The model tracer every trace delegates to. */
  readonly #tracer: ModelBeamTracer

  /**
   * @param multiplierCap - multiplier ceiling passed to the model tracer.
   */
  constructor(multiplierCap: number = DEFAULT_MULTIPLIER_CAP) {
    this.#tracer = new ModelBeamTracer(multiplierCap)
  }

  /** The configured multiplier ceiling. */
  get multiplierCap(): number {
    return this.#tracer.multiplierCap
  }

  /**
   * Delegates to {@link ModelBeamTracer.trace} and returns the legacy plain shape.
   * @throws {GameError} `invalidArgument` for an unknown direction, a non-square grid or a non-inward entry.
   */
  trace(grid: DieGrid, entry: EntryPoint): BeamPath {
    return this.#tracer.trace(grid, ModelEntryPoint.fromData(entry)).toData()
  }
}

/**
 * Function API: `new model.BeamTracer(cap).trace(grid, EntryPoint.fromData(entry)).toData()`.
 * @throws {GameError} `invalidArgument` as {@link BeamTracer.trace}.
 */
export function traceBeam(
  grid: DieGrid,
  entry: EntryPoint,
  multiplierCap: number = DEFAULT_MULTIPLIER_CAP,
): BeamPath {
  return new ModelBeamTracer(multiplierCap).trace(grid, ModelEntryPoint.fromData(entry)).toData()
}
