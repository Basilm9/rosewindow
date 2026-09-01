import { describe, expect, it } from 'vitest'
import { Game } from '../../src/engine/game'
import { GameError, PlacementError } from '../../src/engine/errors'
import { createGameConfig } from '../../src/engine/config'
import { DIE_COLORS } from '../../src/engine/types'
import { autoPlay } from '../helpers/autoPlayer'
import type { GameEvent } from '../../src/engine/events'

const SEED = 3
const PATTERN = 'novice-rose'

const newGame = (seed = SEED) => new Game(createGameConfig(seed))

describe('Game — setup determinism', () => {
  it('offers the same patterns, objectives, and entry sequence for the same seed', () => {
    const a = newGame()
    const b = newGame()
    expect(a.offeredPatterns.map((p) => p.id)).toEqual(b.offeredPatterns.map((p) => p.id))
    expect(a.objectives.publics.map((o) => o.id)).toEqual(b.objectives.publics.map((o) => o.id))
    expect(a.objectives.privateObjective.id).toBe(b.objectives.privateObjective.id)
    expect(a.entrySequence).toEqual(b.entrySequence)
    expect(a.entrySequence).toHaveLength(8)
  })

  it('draws the same opening draft pool for the same seed', () => {
    const a = newGame()
    const b = newGame()
    a.choosePattern(a.offeredPatterns[0]!.id)
    b.choosePattern(b.offeredPatterns[0]!.id)
    expect(a.draftPool.dice).toEqual(b.draftPool.dice)
  })
})

describe('Game — phase law', () => {
  it('rejects die selection before a pattern is chosen (invalidPhase)', () => {
    const game = newGame()
    expect(() => game.selectDie({ color: 'red', value: 3 })).toThrowError(GameError)
    expect(() => game.selectDie({ color: 'red', value: 3 })).toThrowError(/phase/)
  })

  it('rejects choosePattern with an unknown id', () => {
    const game = newGame()
    expect(() => game.choosePattern('nope')).toThrowError(/unknown pattern/i)
  })

  it('rejects a second choosePattern (invalidPhase)', () => {
    const game = newGame()
    game.choosePattern(game.offeredPatterns[0]!.id)
    expect(() => game.choosePattern(game.offeredPatterns[1]!.id)).toThrowError(/phase/)
  })

  it('rejects placeDie with nothing selected (invalidPhase)', () => {
    const game = newGame()
    game.choosePattern(game.offeredPatterns[0]!.id)
    expect(() => game.placeDie({ row: 0, col: 0 })).toThrowError(/phase/)
  })

  it('rejects everything after game over (invalidPhase)', () => {
    const game = newGame()
    autoPlay(game, PATTERN)
    expect(game.phase).toBe('gameOver')
    expect(() => game.selectDie({ color: 'red', value: 3 })).toThrowError(/phase/)
    expect(() => game.placeDie({ row: 0, col: 0 })).toThrowError(/phase/)
  })
})

describe('Game — selection and placement', () => {
  it('selecting moves the die from pool to hand; re-selecting returns the first', () => {
    const game = newGame()
    game.choosePattern(game.offeredPatterns[0]!.id)
    const first = game.draftPool.dice[0]!
    const second = game.draftPool.dice[1]!
    game.selectDie(first)
    expect(game.hand).toEqual(first)
    expect(game.draftPool.dice).toHaveLength(4)
    game.selectDie(second)
    expect(game.hand).toEqual(second)
    expect(game.draftPool.dice).toHaveLength(4)
    expect(
      game.draftPool.dice.some((d) => d.color === first.color && d.value === first.value),
    ).toBe(true)
  })

  it('selecting a die not in the pool throws dieNotInPool', () => {
    const game = newGame()
    game.choosePattern(game.offeredPatterns[0]!.id)
    const absent = DIE_COLORS.flatMap((color) =>
      [1, 2, 3, 4, 5, 6].map((value) => ({ color, value })),
    ).find((d) => !game.draftPool.dice.some((p) => p.color === d.color && p.value === d.value))!
    expect(() => game.selectDie(absent)).toThrowError(/draft pool/)
  })

  it('a rejected placement throws PlacementError, emits the rejection, and keeps the die in hand', () => {
    const game = newGame()
    game.choosePattern(game.offeredPatterns[0]!.id)
    // First die must go on the border ring: the interior (1,1) is always illegal.
    const die = game.draftPool.dice[0]!
    game.selectDie(die)
    const events: GameEvent[] = []
    game.subscribe(events.push.bind(events))
    expect(() => game.placeDie({ row: 1, col: 1 })).toThrowError(PlacementError)
    const rejection = events.find((e) => e.kind === 'placementRejected')
    expect(rejection?.kind).toBe('placementRejected')
    expect(game.hand).toEqual(die)
  })

  it('completes a round after two placements: refresh, illuminate, announce the next entry', () => {
    const game = newGame()
    const events: GameEvent[] = []
    game.subscribe(events.push.bind(events))
    autoPlay(game, PATTERN) // full run; assertions below use its known shape
    expect(game.round).toBe(8)
    expect(events.filter((e) => e.kind === 'beamTraced')).toHaveLength(8)
    expect(events.filter((e) => e.kind === 'roundScored')).toHaveLength(8)
    expect(events.filter((e) => e.kind === 'draftPoolRefreshed')).toHaveLength(8)
    expect(events.at(-1)?.kind).toBe('gameOver')
    // the announced entry advanced round by round
    expect(game.currentEntry).toEqual(game.entrySequence[7])
  })
})

describe('Game — golden master (seed 3, novice-rose, max-flex auto-player)', () => {
  // Values frozen from a verified full run (commit `phase 4`). Any intentional
  // rule change must update these numbers explicitly in the commit summary.
  it('produces the exact recorded round scores, total, and event stream', () => {
    const game = newGame()
    const events = autoPlay(game, PATTERN)
    expect(game.roundScores).toEqual([5, 5, 31, 16, 2, 7, 53, 37])
    expect(game.totalScore).toBe(156)
    expect(events.map((e) => e.kind)).toEqual([
      'draftPoolRefreshed',
      'diePlaced',
      'diePlaced',
      'beamTraced',
      'roundScored',
      'draftPoolRefreshed',
      'diePlaced',
      'diePlaced',
      'beamTraced',
      'roundScored',
      'draftPoolRefreshed',
      'diePlaced',
      'diePlaced',
      'beamTraced',
      'roundScored',
      'draftPoolRefreshed',
      'diePlaced',
      'diePlaced',
      'beamTraced',
      'roundScored',
      'draftPoolRefreshed',
      'diePlaced',
      'diePlaced',
      'beamTraced',
      'roundScored',
      'draftPoolRefreshed',
      'diePlaced',
      'diePlaced',
      'beamTraced',
      'roundScored',
      'draftPoolRefreshed',
      'diePlaced',
      'diePlaced',
      'beamTraced',
      'roundScored',
      'draftPoolRefreshed',
      'diePlaced',
      'diePlaced',
      'beamTraced',
      'roundScored',
      'gameOver',
    ])
    expect(game.phase).toBe('gameOver')
  })

  it('replays bit-identically on a fresh instance', () => {
    const a = autoPlay(newGame(), PATTERN)
    const b = autoPlay(newGame(), PATTERN)
    expect(a).toEqual(b)
  })
})
