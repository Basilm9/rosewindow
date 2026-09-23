import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createActor } from 'xstate'
import { Game } from '../../src/engine/game'
import { createGameConfig } from '../../src/engine/config'
import { gameMachine } from '../../src/machine/gameMachine'
import type { GameMachineEvent } from '../../src/machine/gameMachine'
import { clearSession, loadSession, replaySession, saveSession } from '../../src/hooks/runSession'
import type { RunSession } from '../../src/hooks/runSession'
import { bestPair } from '../helpers/autoPlayer'

const KEY = 'rosewindow-active-v1'

function session(overrides: Partial<RunSession> = {}): RunSession {
  return {
    id: 'run-3',
    seed: 3,
    mode: 'free',
    targetRound: 1,
    tutorial: false,
    actions: [{ type: 'CHOOSE_PATTERN', id: 'novice-rose' }],
    ...overrides,
  }
}

function recording(seed = 3) {
  const game = new Game(createGameConfig(seed))
  const actor = createActor(gameMachine, { input: { game, skipAnimations: true } }).start()
  const actions: GameMachineEvent[] = []
  const send = (event: GameMachineEvent) => {
    actions.push(event)
    actor.send(event)
  }
  send({ type: 'CHOOSE_PATTERN', id: game.offeredPatterns[0]!.id })
  const placeNext = () => {
    const pair = bestPair(game)
    if (!pair) throw new Error('expected an available move after automatic deadlock handling')
    send({ type: 'SELECT_DIE', die: pair.die })
    send({ type: 'PLACE_DIE', position: pair.target })
  }
  return { game, actor, actions, send, placeNext }
}

function expectSameGame(actual: Game, expected: Game) {
  expect(actual.phase).toBe(expected.phase)
  expect(actual.round).toBe(expected.round)
  expect(actual.window?.dice).toEqual(expected.window?.dice)
  expect(actual.draftPool.dice).toEqual(expected.draftPool.dice)
  expect(actual.hand).toEqual(expected.hand)
  expect(actual.refreshesRemaining).toBe(expected.refreshesRemaining)
  expect(actual.placementsRemaining).toBe(expected.placementsRemaining)
  expect(actual.roundScores).toEqual(expected.roundScores)
  expect(actual.report).toEqual(expected.report)
}

beforeEach(() => {
  const entries = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => entries.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      entries.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      entries.delete(key)
    }),
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('run session replay', () => {
  it('restores a selected die and resumes the machine in place', () => {
    const { game, actions, send, actor } = recording()
    const pair = bestPair(game)!
    send({ type: 'SELECT_DIE', die: pair.die })
    const resumed = replaySession(3, actions)
    expectSameGame(resumed, game)
    const resumedActor = createActor(gameMachine, { input: { game: resumed } }).start()
    expect(resumedActor.getSnapshot().matches({ round: 'place' })).toBe(true)
    resumedActor.send({ type: 'PLACE_DIE', position: pair.target })
    expect(resumed.window?.placedCount).toBe(1)
    expect(resumedActor.getSnapshot().context.heldDie).toBeNull()
    actor.stop()
    resumedActor.stop()
  })

  it('preserves cancellation, the spent refresh, and a partially completed round', () => {
    const { game, actor, actions, send, placeNext } = recording()
    send({ type: 'SELECT_DIE', die: game.draftPool.dice[0]! })
    send({ type: 'CANCEL_SELECTION' })
    placeNext()
    send({ type: 'REFRESH_DRAFT' })
    const resumed = replaySession(3, actions)
    expectSameGame(resumed, game)
    expect(resumed.refreshesRemaining).toBe(0)
    expect(resumed.placementsRemaining).toBe(1)
    expect(() => resumed.refreshDraft()).toThrow(/refresh/)
    actor.stop()
  })

  it.each([0, 1, 3, 17, 91, 4294967295])(
    'replays the full run for seed %s including auto-forfeited rounds',
    (seed) => {
      const { game, actor, actions, placeNext } = recording(seed)
      let turns = 0
      while (actor.getSnapshot().status !== 'done' && turns++ < 32) placeNext()
      expect(actor.getSnapshot().status).toBe('done')
      const resumed = replaySession(seed, actions)
      expectSameGame(resumed, game)
      expect(resumed.roundScores).toHaveLength(8)
      expect(resumed.report?.total).toBeGreaterThan(0)
      actor.stop()
    },
  )

  it('ignores animation and internal orchestration events when replaying', () => {
    const base = session().actions
    const clean = replaySession(3, base)
    const injected = replaySession(3, [
      ...base,
      { type: 'BEAM_ANIMATION_DONE' },
      { type: 'DIE_PLACED' },
      { type: 'ROUND_COMPLETED' },
    ])
    expectSameGame(injected, clean)
  })
})

describe('run session persistence validation', () => {
  it('preserves the maximum target score accepted by friend challenge codes', () => {
    const original = session({ mode: 'challenge', targetScore: 1_000_000 })
    expect(saveSession(original)).toBe(true)
    expect(loadSession()).toEqual(original)
  })

  it('saves, loads, and clears a valid session without changing the actions', () => {
    const original = session()
    expect(saveSession(original)).toBe(true)
    expect(loadSession()).toEqual(original)
    clearSession()
    expect(loadSession()).toBeNull()
  })

  it.each([
    { id: '' },
    { tutorial: 'yes' },
    { seed: -1 },
    { seed: 4294967296 },
    { seed: 2.5 },
    { mode: 'ranked' },
    { targetRound: 9 },
    { targetScore: -1 },
    { targetScore: 1000001 },
    { actions: [{ type: 'ROUND_COMPLETED' }] },
    { actions: [{ type: 'SELECT_DIE', die: { color: 'red', value: 7 } }] },
    { actions: [{ type: 'SELECT_DIE', die: { color: 'orange', value: 2 } }] },
    { actions: [{ type: 'PLACE_DIE', position: { row: 4, col: 0 } }] },
    { actions: [{ type: 'PLACE_DIE', position: { row: 0.5, col: 0 } }] },
    { actions: [null] },
  ])('rejects a malformed saved session: %j', (invalid) => {
    localStorage.setItem(KEY, JSON.stringify({ ...session(), ...invalid }))
    expect(loadSession()).toBeNull()
  })

  it('rejects an action history longer than the replay limit', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify(
        session({
          actions: Array.from({ length: 1001 }, () => ({ type: 'REFRESH_DRAFT' })),
        }),
      ),
    )
    expect(loadSession()).toBeNull()
  })

  it('rejects malformed JSON and never trusts stored scores as engine state', () => {
    localStorage.setItem(KEY, '{')
    expect(loadSession()).toBeNull()
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...session(), totalScore: 99999, report: { total: 99999 } }),
    )
    const loaded = loadSession()!
    const replayed = replaySession(loaded.seed, loaded.actions)
    expect(replayed.totalScore).toBe(0)
    expect(replayed.report).toBeNull()
  })

  it('handles unavailable browser storage without crashing gameplay', () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('blocked')
      },
      setItem() {
        throw new Error('blocked')
      },
      removeItem() {
        throw new Error('blocked')
      },
    })
    expect(saveSession(session())).toBe(false)
    expect(loadSession()).toBeNull()
    expect(() => clearSession()).not.toThrow()
  })
})
