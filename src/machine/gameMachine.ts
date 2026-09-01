import { assign, enqueueActions, setup } from 'xstate'
import { findPlacementViolation } from '../engine/placementValidator'
import type { Game } from '../engine/game'
import type { ScoreReport } from '../engine/scoreCalculator'
import type { Die, Position } from '../engine/types'

/**
 * The game-flow statechart (pitch §10) as an XState v5 machine driving the
 * headless `Game` model.
 *
 * Layering: the **engine stays authoritative** — the machine never implements a
 * rule, it sequences engine calls and gates flow on view animations. Guards are
 * pure pre-checks (engine predicates only), so an illegal event is routed to a
 * friendly fallback instead of throwing; actions mutate only after a guard has
 * passed. The view subscribes to `Game` events for animation payloads and to
 * this actor for the current state.
 *
 * `illuminate` is the animation gate: it holds until the view sends
 * `BEAM_ANIMATION_DONE` — unless the machine input sets `skipAnimations` (tests,
 * headless runs), in which case it passes straight through.
 */

export interface GameMachineInput {
  readonly game: Game
  readonly skipAnimations?: boolean
}

export interface GameMachineContext {
  readonly game: Game
  readonly skipAnimations: boolean
  /** Human-readable reason for the last rejected event, for the view. */
  readonly lastError: string | null
  readonly report: ScoreReport | null
}

export type GameMachineEvent =
  | { readonly type: 'CHOOSE_PATTERN'; readonly id: string }
  | { readonly type: 'SELECT_DIE'; readonly die: Die }
  | { readonly type: 'PLACE_DIE'; readonly position: Position }
  | { readonly type: 'BEAM_ANIMATION_DONE' }
  | { readonly type: 'DIE_PLACED' }
  | { readonly type: 'ROUND_COMPLETED' }

function rejectionReason(game: Game, position: Position): string {
  if (game.phase !== 'place') return `cannot place during phase "${game.phase}"`
  const hand = game.hand
  if (hand === null) return 'no die is in hand'
  const violation = findPlacementViolation({
    grid: game.window!.dice,
    constraints: game.window!.constraints,
    pool: [hand],
    die: hand,
    target: position,
  })
  return violation === null ? 'unknown rejection' : violation.kind
}

export const gameMachine = setup({
  types: {
    context: {} as GameMachineContext,
    events: {} as GameMachineEvent,
    input: {} as GameMachineInput,
  },
  guards: {
    patternOffered: ({ context, event }) =>
      context.game.phase === 'patternSelection' &&
      event.type === 'CHOOSE_PATTERN' &&
      context.game.offeredPatterns.some((p) => p.id === event.id),
    selectLegal: ({ context, event }) =>
      (context.game.phase === 'draft' || context.game.phase === 'place') &&
      event.type === 'SELECT_DIE' &&
      context.game.draftPool.dice.some(
        (d) => d.color === event.die.color && d.value === event.die.value,
      ),
    placementLegal: ({ context, event }) => {
      if (context.game.phase !== 'place' || event.type !== 'PLACE_DIE') return false
      const hand = context.game.hand
      if (hand === null) return false
      return (
        findPlacementViolation({
          grid: context.game.window!.dice,
          constraints: context.game.window!.constraints,
          pool: [hand],
          die: hand,
          target: event.position,
        }) === null
      )
    },
    isGameOver: ({ context }) => context.game.phase === 'gameOver',
    skipAnimations: ({ context }) => context.skipAnimations,
    /** A pre-advanced game (dev demo mode) boots past the setup screen. */
    gameAlreadyInRound: ({ context }) => context.game.phase !== 'patternSelection',
  },
  actions: {
    choosePattern: ({ context, event }) => {
      if (event.type === 'CHOOSE_PATTERN') context.game.choosePattern(event.id)
    },
    selectDie: ({ context, event }) => {
      if (event.type === 'SELECT_DIE') context.game.selectDie(event.die)
    },
    /** Mutates only after `placementLegal`; routes via raised events. */
    performPlacement: enqueueActions(({ context, event, enqueue }) => {
      if (event.type !== 'PLACE_DIE') return
      const roundBefore = context.game.round
      context.game.placeDie(event.position)
      const roundCompleted =
        context.game.phase === 'gameOver' || context.game.round !== roundBefore
      enqueue.assign({ lastError: null })
      enqueue.raise({ type: roundCompleted ? 'ROUND_COMPLETED' : 'DIE_PLACED' })
    }),
    storeReport: assign({
      report: ({ context }) => context.game.report,
    }),
  },
}).createMachine({
  id: 'game',
  context: ({ input }) => ({
    game: input.game,
    skipAnimations: input.skipAnimations ?? false,
    lastError: null,
    report: null,
  }),
  initial: 'setup',
  states: {
    setup: {
      /** Boots in sync with the model: a pre-advanced game (dev demo mode) skips setup. */
      always: [
        { guard: 'isGameOver', target: '#game.finalScoring' },
        { guard: 'gameAlreadyInRound', target: 'round' },
      ],
      on: {
        CHOOSE_PATTERN: [
          { guard: 'patternOffered', target: 'round', actions: 'choosePattern' },
          { actions: assign({ lastError: 'pattern not offered or wrong phase' }) },
        ],
      },
    },
    round: {
      initial: 'draft',
      states: {
        draft: {
          on: {
            SELECT_DIE: [
              { guard: 'selectLegal', target: 'place', actions: 'selectDie' },
              { actions: assign({ lastError: 'die not in pool or wrong phase' }) },
            ],
          },
        },
        place: {
          on: {
            PLACE_DIE: [
              { guard: 'placementLegal', actions: 'performPlacement' },
              {
                actions: assign({
                  lastError: ({ context, event }) =>
                    event.type === 'PLACE_DIE'
                      ? rejectionReason(context.game, event.position)
                      : 'invalid event',
                }),
              },
            ],
            DIE_PLACED: { target: 'draft' },
            ROUND_COMPLETED: { target: 'illuminate' },
          },
        },
        /** Animation gate: holds the flow until the beam animation reports done. */
        illuminate: {
          always: [{ guard: 'skipAnimations', target: 'announceNext' }],
          on: { BEAM_ANIMATION_DONE: { target: 'announceNext' } },
        },
        /** Transient: the engine already announced the next entry and drew the pool. */
        announceNext: {
          always: [
            { guard: 'isGameOver', target: '#game.finalScoring' },
            { target: 'draft' },
          ],
        },
      },
    },
    finalScoring: {
      entry: 'storeReport',
      always: { target: 'gameOver' },
    },
    gameOver: { type: 'final' },
  },
})
