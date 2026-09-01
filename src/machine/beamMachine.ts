import { assign, setup } from 'xstate'
import { DEFAULT_MULTIPLIER_CAP } from '../engine/beamTracer'
import type { BeamPath } from '../engine/beamTracer'
import { REFRACTION_BY_COLOR } from '../engine/types'

/**
 * The beam's own statechart (pitch §10 second diagram): TRAVELING →
 * REFRACTING / LOCKED_STRAIGHT → TERMINATED. It replays a finished `BeamPath`
 * segment by segment for the view's animation sequencing — the tracer already
 * computed the law; this machine dramatizes it.
 *
 * `ADVANCE` consumes the next segment. A bending die moves the machine through
 * `refracting` (flare the die, multiplier climbs); a die under lockout moves
 * through `lockedStraight`; empty or purple cells keep it `traveling`. Running
 * out of segments terminates the trace.
 */

export interface BeamMachineInput {
  readonly path: BeamPath
  readonly multiplierCap?: number
}

export interface BeamMachineContext {
  readonly path: BeamPath
  readonly multiplierCap: number
  /** Index of the NEXT segment to consume. */
  readonly index: number
  readonly multiplier: number
  readonly lockout: number
}

export type BeamMachineEvent = { readonly type: 'ADVANCE' }

export const beamMachine = setup({
  types: {
    context: {} as BeamMachineContext,
    events: {} as BeamMachineEvent,
    input: {} as BeamMachineInput,
  },
  guards: {
    pathExhausted: ({ context }) => context.index >= context.path.segments.length,
    nextBends: ({ context }) => {
      const segment = context.path.segments[context.index]
      return (
        segment !== undefined &&
        segment.die !== null &&
        context.lockout === 0 &&
        REFRACTION_BY_COLOR[segment.die.color] !== 'straight'
      )
    },
    nextLocked: ({ context }) => {
      const segment = context.path.segments[context.index]
      return segment !== undefined && segment.die !== null && context.lockout > 0
    },
  },
  actions: {
    advanceStraight: assign({
      index: ({ context }) => context.index + 1,
      lockout: ({ context }) => Math.max(0, context.lockout - 1),
    }),
    applyBend: assign({
      index: ({ context }) => context.index + 1,
      multiplier: ({ context }) => Math.min(context.multiplier + 1, context.multiplierCap),
      lockout: ({ context }) => {
        const segment = context.path.segments[context.index]!
        return segment.die === null ? 0 : segment.die.value - 1
      },
    }),
    applyLocked: assign({
      index: ({ context }) => context.index + 1,
      lockout: ({ context }) => Math.max(0, context.lockout - 1),
    }),
  },
}).createMachine({
  id: 'beam',
  context: ({ input }) => ({
    path: input.path,
    multiplierCap: input.multiplierCap ?? DEFAULT_MULTIPLIER_CAP,
    index: 0,
    multiplier: 1,
    lockout: 0,
  }),
  initial: 'traveling',
  states: {
    traveling: {
      on: {
        ADVANCE: [
          { guard: 'pathExhausted', target: 'terminated' },
          { guard: 'nextBends', target: 'refracting', actions: 'applyBend' },
          { guard: 'nextLocked', target: 'lockedStraight', actions: 'applyLocked' },
          { actions: 'advanceStraight' },
        ],
      },
    },
    /**
     * Dwell state: the struck die flares here. The next `ADVANCE` acknowledges
     * the bend and resumes travel — no segment is consumed by the exit, so the
     * view paces each beam step with one `ADVANCE`.
     */
    refracting: {
      on: { ADVANCE: { target: 'traveling' } },
    },
    /** Dwell state: the struck die lights without bending (under lockout). */
    lockedStraight: {
      on: { ADVANCE: { target: 'traveling' } },
    },
    terminated: { type: 'final' },
  },
})
