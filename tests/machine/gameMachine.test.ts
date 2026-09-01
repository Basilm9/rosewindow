import { describe, expect, it } from 'vitest'
import { createActor } from 'xstate'
import { Game } from '../../src/engine/game'
import { createGameConfig } from '../../src/engine/config'
import { gameMachine } from '../../src/machine/gameMachine'
import { bestPair } from '../helpers/autoPlayer'
import type { GameEvent } from '../../src/engine/events'

const SEED = 3
const PATTERN = 'novice-rose'

function makeActor(seed = SEED, skipAnimations = true) {
  const game = new Game(createGameConfig(seed))
  const actor = createActor(gameMachine, { input: { game, skipAnimations } }).start()
  return { game, actor }
}

type GameActor = ReturnType<typeof makeActor>['actor']
type GameSnapshot = ReturnType<GameActor['getSnapshot']>

/** Dot path of the current state ('setup', 'round.draft', 'round.illuminate', ...). */
function statePath(snap: GameSnapshot): string {
  const value = snap.value as string | { round: string }
  return typeof value === 'string' ? value : `round.${value.round}`
}

/** Drives the machine to game over with the deterministic max-flex player. */
function drive(actor: GameActor, game: Game, skipAnimations: boolean): void {
  actor.send({ type: 'CHOOSE_PATTERN', id: PATTERN })
  let guard = 0
  while (actor.getSnapshot().status !== 'done' && guard++ < 200) {
    const path = statePath(actor.getSnapshot())
    if (path === 'round.draft' || path === 'round.place') {
      const pair = bestPair(game)
      if (pair === null) throw new Error('driver stuck: no legal placement')
      actor.send({ type: 'SELECT_DIE', die: pair.die })
      actor.send({ type: 'PLACE_DIE', position: pair.target })
    } else if (path === 'round.illuminate') {
      if (!skipAnimations) actor.send({ type: 'BEAM_ANIMATION_DONE' })
    } else {
      throw new Error(`driver stuck in unexpected state: ${path}`)
    }
  }
}

describe('gameMachine — setup', () => {
  it('starts in setup and permits only pattern choice', () => {
    const { actor } = makeActor()
    const snap = actor.getSnapshot()
    expect(statePath(snap)).toBe('setup')
    expect(snap.can({ type: 'CHOOSE_PATTERN', id: PATTERN })).toBe(true)
    expect(snap.can({ type: 'SELECT_DIE', die: { color: 'red', value: 3 } })).toBe(false)
    expect(snap.can({ type: 'PLACE_DIE', position: { row: 0, col: 0 } })).toBe(false)
  })

  it('stores an error and stays in setup on an unknown pattern id', () => {
    const { actor } = makeActor()
    actor.send({ type: 'CHOOSE_PATTERN', id: 'nope' })
    const snap = actor.getSnapshot()
    expect(statePath(snap)).toBe('setup')
    expect(snap.context.lastError).toBe('pattern not offered or wrong phase')
  })

  it('enters round.draft after a valid pattern choice', () => {
    const { actor } = makeActor()
    actor.send({ type: 'CHOOSE_PATTERN', id: PATTERN })
    expect(statePath(actor.getSnapshot())).toBe('round.draft')
  })
})

describe('gameMachine — selection and placement', () => {
  it('moves draft -> place on SELECT_DIE and back to draft after a legal placement', () => {
    const { game, actor } = makeActor()
    actor.send({ type: 'CHOOSE_PATTERN', id: PATTERN })
    const pair = bestPair(game)!
    actor.send({ type: 'SELECT_DIE', die: pair.die })
    expect(statePath(actor.getSnapshot())).toBe('round.place')
    actor.send({ type: 'PLACE_DIE', position: pair.target })
    expect(statePath(actor.getSnapshot())).toBe('round.draft')
    expect(game.window!.placedCount).toBe(1)
  })

  it('stores the rejection reason and keeps state on an illegal placement', () => {
    const { game, actor } = makeActor()
    actor.send({ type: 'CHOOSE_PATTERN', id: PATTERN })
    const die = game.draftPool.dice[0]!
    actor.send({ type: 'SELECT_DIE', die })
    actor.send({ type: 'PLACE_DIE', position: { row: 1, col: 1 } }) // interior: first-placement law
    const snap = actor.getSnapshot()
    expect(statePath(snap)).toBe('round.place')
    expect(snap.context.lastError).toBe('illegalFirstPlacement')
    expect(game.hand).toEqual(die)
    expect(game.window!.placedCount).toBe(0)
  })

  it('stores an error on a selection of a die outside the pool', () => {
    const { actor } = makeActor()
    actor.send({ type: 'CHOOSE_PATTERN', id: PATTERN })
    actor.send({ type: 'SELECT_DIE', die: { color: 'purple', value: 6 } })
    expect(statePath(actor.getSnapshot())).toBe('round.draft')
    expect(actor.getSnapshot().context.lastError).toBe('die not in pool or wrong phase')
  })
})

describe('gameMachine — animation gating', () => {
  it('holds in illuminate until BEAM_ANIMATION_DONE, then advances the round', () => {
    const { game, actor } = makeActor(SEED, false)
    const events: GameEvent[] = []
    game.subscribe(events.push.bind(events))
    actor.send({ type: 'CHOOSE_PATTERN', id: PATTERN })
    // First placement (does not end the round).
    const first = bestPair(game)!
    actor.send({ type: 'SELECT_DIE', die: first.die })
    actor.send({ type: 'PLACE_DIE', position: first.target })
    expect(statePath(actor.getSnapshot())).toBe('round.draft')
    // Second placement ends the round: the machine gates in illuminate.
    const second = bestPair(game)!
    actor.send({ type: 'SELECT_DIE', die: second.die })
    actor.send({ type: 'PLACE_DIE', position: second.target })
    expect(statePath(actor.getSnapshot())).toBe('round.illuminate')
    actor.send({ type: 'BEAM_ANIMATION_DONE' })
    expect(statePath(actor.getSnapshot())).toBe('round.draft')
    expect(game.round).toBe(2)
    // The model emitted the beam event for the view even while gated.
    expect(events.filter((e) => e.kind === 'beamTraced')).toHaveLength(1)
  })

  it('passes through illuminate immediately when skipAnimations is set', () => {
    const { game, actor } = makeActor(SEED, true)
    actor.send({ type: 'CHOOSE_PATTERN', id: PATTERN })
    const first = bestPair(game)!
    actor.send({ type: 'SELECT_DIE', die: first.die })
    actor.send({ type: 'PLACE_DIE', position: first.target })
    // The first placement does not end the round, so illuminate is never reached;
    // the machine is already back in draft with the placement committed.
    expect(statePath(actor.getSnapshot())).toBe('round.draft')
    expect(game.round).toBe(1)
    expect(game.window!.placedCount).toBe(1)
  })
})

describe('gameMachine — full run', () => {
  it('drives the golden run to game over with the report in context', () => {
    const { game, actor } = makeActor()
    drive(actor, game, true)
    expect(actor.getSnapshot().status).toBe('done')
    expect(game.phase).toBe('gameOver')
    expect(actor.getSnapshot().context.report?.total).toBe(186)
    expect(actor.getSnapshot().context.report?.tier).toBe('gold')
    expect(game.totalScore).toBe(156)
  })

  it('drives the golden run with animation gating enabled', () => {
    const { game, actor } = makeActor(SEED, false)
    drive(actor, game, false)
    expect(actor.getSnapshot().status).toBe('done')
    expect(game.report?.total).toBe(186)
  })

  it('ignores out-of-phase events without crashing', () => {
    const { actor } = makeActor()
    actor.send({ type: 'PLACE_DIE', position: { row: 0, col: 0 } })
    actor.send({ type: 'BEAM_ANIMATION_DONE' })
    expect(statePath(actor.getSnapshot())).toBe('setup')
  })
})
