/**
 * Test-design criterion: TRANSITION COVERAGE of the Game phase machine
 *   patternSelection -choosePattern-> draft; draft -selectDie-> place; place -selectDie-> place;
 *   place -cancelSelection-> draft; place -placeDie(1st)-> draft; place -placeDie(2nd)-> draft(round+1)
 *   | gameOver(round 8); draft|place -refreshDraft-> draft; draft|place -forfeitRound-> draft(round+1)
 * plus every rejected action in a wrong phase, and ONE TEST PER ERROR KIND:
 *   invalidPhase, unknownPattern, dieNotInPool, refreshSpent, legalMovesRemain, outOfBounds,
 *   PlacementError (illegalFirstPlacement at (1,1) on the empty window).
 *   emptyBag is unreachable through Game (90 dice, ≤ 45 drawn) — documented, not tested.
 * Ported: all 21 cases of tests/engine/game.test.ts (titles + "(ported)").
 *
 * Note on the count: tests/engine/game.test.ts has 22 cases at inc-47-green, not 21; P1–P22 port
 * all 22.
 *
 * Cases:
 *  Setup (NFR-1.1, FR-1.3, FR-2.1, FR-5.1)
 *   S1  it.each seeds 1–20: offered pattern ids, public + private objective ids and entry sequence
 *       equal the literal SETUP_1_20 row (values checked against the pre-migration Game at
 *       inc-46-green when this file was written)
 *   S2  it.each seeds 1, 3, 20: entrySequence.map(toData()) equals the full literal
 *   S3  Object.keys(game) is exactly config, entrySequence, objectives, offeredPatterns (sorted)
 *  Transitions
 *   T1  patternSelection -choosePattern-> draft (pool of 5, one draftPoolRefreshed)
 *   T2  draft -selectDie-> place (die leaves pool, no event)
 *   T3  place -selectDie-> place (held die returns to the END of the pool, FR-3.3)
 *   T4  place -cancelSelection-> draft (FR-3.6: no placement consumed)
 *   T5  place -placeDie(1st)-> draft (placementsRemaining 1, one diePlaced)
 *   T6  place -placeDie(2nd)-> draft(round+1) (diePlaced, beamTraced, roundScored, draftPoolRefreshed)
 *   T7  place -placeDie(2nd)-> gameOver(round 8) on the golden run
 *   T8  rounds: 1 config: the whole stream is draftPoolRefreshed, diePlaced, diePlaced,
 *       beamTraced, roundScored, gameOver; phase gameOver at round 1
 *   T9  draft -refreshDraft-> draft
 *   T10 place -refreshDraft-> draft (held die returns with the pool, hand empty)
 *   T11 draft -forfeitRound-> draft(round+1) (seed 30, deadlocked at the start of round 7)
 *   T12 place -forfeitRound-> draft(round+1) (seed 30, holding an unplaceable die)
 *   T13 draft -forfeitRound-> gameOver in round 8 (seed 7, deadlocked at the start of round 8)
 *  Wrong phase (NFR-2.3): each rejected with invalidPhase and the snapshot unchanged
 *   W1  patternSelection: selectDie, cancelSelection, refreshDraft, placeDie, forfeitRound
 *   W2  draft: choosePattern, cancelSelection, placeDie (nothing held)
 *   W3  place: choosePattern
 *   W4  gameOver: choosePattern, selectDie, cancelSelection, refreshDraft, placeDie, forfeitRound
 *  One test per error kind (NFR-2.2), each with an unchanged-state check (NFR-2.1)
 *   E1  invalidPhase        refreshDraft before a pattern is chosen
 *   E2  unknownPattern      choosePattern('nope'): id 'nope', phase stays patternSelection, window null
 *   E3  dieNotInPool        selectDie of a die absent from the pool (PlacementError)
 *   E4  refreshSpent        a second refreshDraft
 *   E5  legalMovesRemain    forfeitRound on a solvable opening draft
 *   E6  outOfBounds         placeDie({row: 9, col: 0}): GameError, not PlacementError, no event, hand kept
 *   E7  PlacementError      illegalFirstPlacement at (1,1) on the empty window; publishes exactly
 *                           one placementRejected
 *  Golden master (seed 3, novice-rose, max-flex auto-player)
 *   G1  roundScores = GOLDEN_ROUNDS, totalScore = GOLDEN_TOTAL
 *   G2  events.map(kind) = GOLDEN_KINDS (41)
 *   G3  report toEqual GOLDEN_REPORT
 *   G4  replay: autoPlay(...).map(toData()) equal on two fresh games
 *   G5  every event instanceof ModelEvent and source === game
 *   G6  a ModelListener, a legacy subscribe callback and autoPlay receive the same 41 instances
 *       (===) in the same order; every source === game; the last is gameOver
 *  Ported (tests/engine/game.test.ts): P1–P22, titles suffixed "(ported)"
 *
 * Inc-47 temporary checks covered permanently here:
 *   1 seeds 1–20 setup ................................ S1, S2 (seeds 1, 3, 20 as full literals)
 *   2 rounds: 1 stream ................................. T8
 *   3 listener / subscribe / autoPlay same instances .. G6
 *   4 golden round scores .............................. G1
 *   5 choosePattern('nope') ............................ E2
 *   6 placeDie({row: 9, col: 0}) ....................... E6
 *   7 Object.keys(game) ................................ S3
 */
import { describe, expect, it } from 'vitest'
import { ModelEvent } from '@mvc'
import { DIE_COLORS } from '../../src/model/Die'
import type { EntryPoint, EntryPointData } from '../../src/model/EntryPoint'
import type { GameEvent } from '../../src/model/events'
import { Game } from '../../src/model/Game'
import { createGameConfig } from '../../src/model/GameConfig'
import { GameError, PlacementError } from '../../src/model/GameError'
import { autoPlace, autoPlay, bestPair } from '../helpers/autoPlayer'
import { catchError, isDeadlockedAtRoundStart, playUntil, snapshotOf } from '../helpers/safety'

// ---- Golden constants (prompt 48, copied verbatim; NEVER edited to make a test pass) -------
const SEED = 3, PATTERN = 'novice-rose'
const GOLDEN_ROUNDS = [5, 5, 31, 16, 2, 7, 53, 37] as const
const GOLDEN_TOTAL = 156
const ROUND_KINDS = ['diePlaced', 'diePlaced', 'beamTraced', 'roundScored', 'draftPoolRefreshed'] as const
const GOLDEN_KINDS = ['draftPoolRefreshed', ...Array(7).fill(ROUND_KINDS).flat(),
  'diePlaced', 'diePlaced', 'beamTraced', 'roundScored', 'gameOver'] // 41 kinds
const GOLDEN_REPORT = { lines: [
  { objectiveId: 'column-color-variety', name: 'Column Color Variety', points: 10 },
  { objectiveId: 'row-value-variety', name: 'Row Value Variety', points: 4 },
  { objectiveId: 'even-values', name: 'Even Values', points: 7 },
  { objectiveId: 'patron-blue', name: 'Patron of Blue', points: 9 } ],
  beamTotal: 156, total: 186, tier: 'gold' } as const

// ---- Setup literals ---------------------------------------------------------------------------
/**
 * Seeds 1–20: [seed, offered pattern ids, public objective ids, private objective id, entries].
 * An entry is row digit, column digit, first letter of the direction (e.g. `13w` = (1,3) west).
 */
const SETUP_1_20 = [
  [1, 'tracery quatrefoil', 'row-value-variety column-color-variety balanced-palette', 'patron-green', '10e 23w 33w 20e 03w 03s 01s 13w'],
  [2, 'novice-rose rose-majestic', 'column-value-variety even-values column-color-variety', 'patron-blue', '01s 31n 33w 30e 03w 13w 33n 03s'],
  [3, 'lancet novice-rose', 'column-color-variety row-value-variety even-values', 'patron-blue', '13w 02s 33w 23w 03w 32n 30n 03s'],
  [4, 'clerestory lancet', 'balanced-palette even-values odd-values', 'patron-red', '03w 03s 01s 31n 20e 00s 10e 32n'],
  [5, 'tracery novice-rose', 'row-value-variety column-value-variety odd-values', 'patron-yellow', '32n 33n 30n 01s 00e 03s 31n 23w'],
  [6, 'lancet novice-rose', 'even-values row-value-variety diagonal-color-variety', 'patron-green', '01s 10e 31n 13w 00e 32n 03s 02s'],
  [7, 'clerestory quatrefoil', 'row-value-variety diagonal-color-variety even-values', 'patron-red', '00s 13w 10e 01s 33w 03s 20e 02s'],
  [8, 'rose-majestic novice-rose', 'row-color-variety diagonal-color-variety odd-values', 'patron-yellow', '31n 13w 02s 23w 30e 33n 03w 10e'],
  [9, 'novice-rose tracery', 'column-value-variety column-color-variety balanced-palette', 'patron-yellow', '00s 30e 03w 30n 23w 13w 03s 10e'],
  [10, 'quatrefoil novice-rose', 'row-color-variety row-value-variety odd-values', 'patron-blue', '23w 13w 30n 33w 00e 30e 03s 03w'],
  [11, 'tracery lancet', 'diagonal-color-variety even-values row-color-variety', 'patron-purple', '33n 03s 00s 03w 02s 13w 31n 01s'],
  [12, 'rose-majestic lancet', 'row-value-variety row-color-variety balanced-palette', 'patron-red', '03s 32n 13w 10e 23w 01s 20e 31n'],
  [13, 'rose-majestic novice-rose', 'column-value-variety column-color-variety diagonal-color-variety', 'patron-red', '32n 03s 30e 02s 33w 30n 20e 31n'],
  [14, 'novice-rose rose-majestic', 'column-value-variety diagonal-color-variety row-value-variety', 'patron-purple', '20e 30e 23w 33n 00s 03s 10e 02s'],
  [15, 'lancet quatrefoil', 'row-value-variety column-value-variety even-values', 'patron-green', '23w 00s 30n 03w 03s 33n 00e 10e'],
  [16, 'quatrefoil rose-majestic', 'row-color-variety column-value-variety row-value-variety', 'patron-yellow', '01s 33w 03s 23w 10e 00s 00e 03w'],
  [17, 'tracery novice-rose', 'column-value-variety row-value-variety diagonal-color-variety', 'patron-green', '20e 03w 00e 03s 00s 30e 23w 02s'],
  [18, 'tracery novice-rose', 'diagonal-color-variety row-color-variety odd-values', 'patron-green', '00s 30e 32n 23w 33n 20e 31n 33w'],
  [19, 'tracery novice-rose', 'balanced-palette column-value-variety even-values', 'patron-blue', '02s 00s 13w 10e 03w 23w 31n 01s'],
  [20, 'clerestory lancet', 'balanced-palette odd-values column-value-variety', 'patron-green', '00e 10e 03w 02s 32n 23w 33n 31n'],
] as const

/** Full `toData()` entry sequences for three seeds (seed 3 is the golden seed). */
const ENTRIES_BY_SEED: readonly (readonly [number, readonly EntryPointData[]])[] = [
  [1, [
    { position: { row: 1, col: 0 }, direction: 'east' },
    { position: { row: 2, col: 3 }, direction: 'west' },
    { position: { row: 3, col: 3 }, direction: 'west' },
    { position: { row: 2, col: 0 }, direction: 'east' },
    { position: { row: 0, col: 3 }, direction: 'west' },
    { position: { row: 0, col: 3 }, direction: 'south' },
    { position: { row: 0, col: 1 }, direction: 'south' },
    { position: { row: 1, col: 3 }, direction: 'west' },
  ]],
  [3, [
    { position: { row: 1, col: 3 }, direction: 'west' },
    { position: { row: 0, col: 2 }, direction: 'south' },
    { position: { row: 3, col: 3 }, direction: 'west' },
    { position: { row: 2, col: 3 }, direction: 'west' },
    { position: { row: 0, col: 3 }, direction: 'west' },
    { position: { row: 3, col: 2 }, direction: 'north' },
    { position: { row: 3, col: 0 }, direction: 'north' },
    { position: { row: 0, col: 3 }, direction: 'south' },
  ]],
  [20, [
    { position: { row: 0, col: 0 }, direction: 'east' },
    { position: { row: 1, col: 0 }, direction: 'east' },
    { position: { row: 0, col: 3 }, direction: 'west' },
    { position: { row: 0, col: 2 }, direction: 'south' },
    { position: { row: 3, col: 2 }, direction: 'north' },
    { position: { row: 2, col: 3 }, direction: 'west' },
    { position: { row: 3, col: 3 }, direction: 'north' },
    { position: { row: 3, col: 1 }, direction: 'north' },
  ]],
]

/** Seed whose auto-played run (offeredPatterns[0]) is deadlocked at the start of round 7. */
const DEADLOCK_SEED = 30
const DEADLOCK_ROUND = 7
/** Seed whose auto-played run (offeredPatterns[0]) is deadlocked at the start of round 8. */
const LAST_ROUND_DEADLOCK_SEED = 7

// ---- Local helpers (no loops; loops live in tests/helpers) -------------------------------------
const newGame = (seed = SEED) => new Game(createGameConfig(seed))

/** Records every event published from now on, via a ModelListener. */
const record = (game: Game): GameEvent[] => {
  const events: GameEvent[] = []
  game.addModelListener({ modelChanged: (event) => { events.push(event) } })
  return events
}

/** Matches a thrown error whose violation kind is `kind`. */
const violationKind = (kind: string) =>
  expect.objectContaining({ violation: expect.objectContaining({ kind }) })

const encodeEntry = (entry: EntryPoint) =>
  `${entry.position.row}${entry.position.col}${entry.direction.name[0]}`

/** A seed-30 game at the start of its deadlocked round 7 (offeredPatterns[0] chosen). */
const deadlockedGame = (seed = DEADLOCK_SEED): Game => {
  const game = newGame(seed)
  game.choosePattern(game.offeredPatterns[0].id)
  return playUntil(game, isDeadlockedAtRoundStart)
}

/** A finished golden run. */
const finishedGame = (): Game => {
  const game = newGame()
  autoPlay(game, PATTERN)
  return game
}

/** A golden game in `place`: pattern chosen and the auto-player's first die held. */
const holdingGame = (): Game => {
  const game = newGame()
  game.choosePattern(PATTERN)
  game.selectDie(bestPair(game)!.die)
  return game
}

/** Every one of the 30 (colour, value) faces. */
const ALL_FACES = DIE_COLORS.flatMap((color) => [1, 2, 3, 4, 5, 6].map((value) => ({ color, value })))

type Action = readonly [string, (game: Game) => void]

// =================================================================================================
describe('Game — setup', () => {
  it.each(SETUP_1_20)(
    'S1 seed %i offers %s, deals %s + %s, announces %s',
    (seed, patterns, publics, privateId, entries) => {
      const game = newGame(seed)
      expect(game.offeredPatterns.map((p) => p.id).join(' ')).toBe(patterns)
      expect(game.objectives.publics.map((o) => o.id).join(' ')).toBe(publics)
      expect(game.objectives.privateObjective.id).toBe(privateId)
      expect(game.entrySequence.map(encodeEntry).join(' ')).toBe(entries)
    },
  )

  it.each(ENTRIES_BY_SEED)('S2 seed %i: entrySequence via toData() is the full literal', (seed, entries) => {
    expect(newGame(seed).entrySequence.map((e) => e.toData())).toEqual(entries)
  })

  it('S3 the only enumerable own keys are config, entrySequence, objectives, offeredPatterns', () => {
    expect(Object.keys(newGame()).sort()).toEqual(['config', 'entrySequence', 'objectives', 'offeredPatterns'])
  })
})

// =================================================================================================
describe('Game — phase transitions', () => {
  it('T1 patternSelection -choosePattern-> draft', () => {
    const game = newGame()
    const events = record(game)
    expect(game.phase).toBe('patternSelection')
    game.choosePattern(PATTERN)
    expect(game.phase).toBe('draft')
    expect(game.round).toBe(1)
    expect(game.window!.pattern.id).toBe('novice-rose')
    expect(game.draftPool.size).toBe(5)
    expect(events.map((e) => e.kind)).toEqual(['draftPoolRefreshed'])
  })

  it('T2 draft -selectDie-> place', () => {
    const game = newGame()
    game.choosePattern(PATTERN)
    const events = record(game)
    const die = game.draftPool.dice[0]!
    game.selectDie(die)
    expect(game.phase).toBe('place')
    expect(game.hand).toBe(die)
    expect(game.draftPool.size).toBe(4)
    expect(events).toEqual([])
  })

  it('T3 place -selectDie-> place: the held die returns to the end of the pool', () => {
    const game = newGame()
    game.choosePattern(PATTERN)
    const [first, second] = game.draftPool.dice
    game.selectDie(first!)
    game.selectDie(second!)
    expect(game.phase).toBe('place')
    expect(game.hand).toBe(second)
    expect(game.draftPool.size).toBe(4)
    expect(game.draftPool.dice.at(-1)).toBe(first)
  })

  it('T4 place -cancelSelection-> draft without consuming a placement', () => {
    const game = newGame()
    game.choosePattern(PATTERN)
    const die = game.draftPool.dice[0]!
    game.selectDie(die)
    game.cancelSelection()
    expect(game.phase).toBe('draft')
    expect(game.hand).toBeNull()
    expect(game.draftPool.size).toBe(5)
    expect(game.placementsRemaining).toBe(2)
  })

  it('T5 place -placeDie(1st)-> draft', () => {
    const game = newGame()
    game.choosePattern(PATTERN)
    const best = bestPair(game)!
    game.selectDie(best.die)
    const events = record(game)
    game.placeDie(best.target)
    expect(game.phase).toBe('draft')
    expect(game.round).toBe(1)
    expect(game.placementsRemaining).toBe(1)
    expect(game.window!.placedCount).toBe(1)
    expect(events.map((e) => e.kind)).toEqual(['diePlaced'])
  })

  it('T6 place -placeDie(2nd)-> draft(round+1)', () => {
    const game = newGame()
    game.choosePattern(PATTERN)
    autoPlace(game)
    const best = bestPair(game)!
    game.selectDie(best.die)
    expect(game.phase).toBe('place')
    const events = record(game)
    game.placeDie(best.target)
    expect(game.phase).toBe('draft')
    expect(game.round).toBe(2)
    expect(game.placementsRemaining).toBe(2)
    expect(game.roundScores).toEqual([5])
    expect(events.map((e) => e.kind)).toEqual(['diePlaced', 'beamTraced', 'roundScored', 'draftPoolRefreshed'])
  })

  it('T7 place -placeDie(2nd)-> gameOver in round 8', () => {
    const game = newGame()
    game.choosePattern(PATTERN)
    playUntil(game, (g) => g.round === 8 && g.placementsRemaining === 1)
    const best = bestPair(game)!
    game.selectDie(best.die)
    expect(game.phase).toBe('place')
    const events = record(game)
    game.placeDie(best.target)
    expect(game.phase).toBe('gameOver')
    expect(game.round).toBe(8)
    expect(game.report).not.toBeNull()
    expect(events.map((e) => e.kind)).toEqual(['diePlaced', 'beamTraced', 'roundScored', 'gameOver'])
  })

  it('T8 a one-round config publishes exactly one round and gameOver', () => {
    const game = new Game(createGameConfig(SEED, { rounds: 1 }))
    const events = record(game)
    game.choosePattern(PATTERN)
    autoPlace(game)
    const best = bestPair(game)!
    game.selectDie(best.die)
    game.placeDie(best.target)
    expect(events.map((e) => e.kind)).toEqual([
      'draftPoolRefreshed', 'diePlaced', 'diePlaced', 'beamTraced', 'roundScored', 'gameOver',
    ])
    expect(game.phase).toBe('gameOver')
    expect(game.round).toBe(1)
  })

  it('T9 draft -refreshDraft-> draft', () => {
    const game = newGame()
    game.choosePattern(PATTERN)
    const events = record(game)
    game.refreshDraft()
    expect(game.phase).toBe('draft')
    expect(game.draftPool.size).toBe(5)
    expect(game.refreshesRemaining).toBe(0)
    expect(events.map((e) => e.kind)).toEqual(['draftPoolRefreshed'])
  })

  it('T10 place -refreshDraft-> draft: the held die is recast with the pool', () => {
    const game = holdingGame()
    game.refreshDraft()
    expect(game.phase).toBe('draft')
    expect(game.hand).toBeNull()
    expect(game.draftPool.size).toBe(5)
    expect(game.round).toBe(1)
    expect(game.placementsRemaining).toBe(2)
  })

  it('T11 draft -forfeitRound-> draft(round+1)', () => {
    const game = deadlockedGame()
    expect(game.round).toBe(DEADLOCK_ROUND)
    expect(game.phase).toBe('draft')
    const events = record(game)
    game.forfeitRound()
    expect(game.phase).toBe('draft')
    expect(game.round).toBe(8)
    expect(game.roundScores).toHaveLength(7)
    expect(events.map((e) => e.kind)).toEqual(['roundForfeited', 'beamTraced', 'roundScored', 'draftPoolRefreshed'])
    expect(events[0]!.toData()).toEqual({ kind: 'roundForfeited', round: 7 })
  })

  it('T12 place -forfeitRound-> draft(round+1)', () => {
    const game = deadlockedGame()
    game.selectDie(game.draftPool.dice[0]!)
    expect(game.phase).toBe('place')
    game.forfeitRound()
    expect(game.phase).toBe('draft')
    expect(game.round).toBe(8)
    expect(game.hand).toBeNull()
    expect(game.draftPool.size).toBe(5)
  })

  it('T13 draft -forfeitRound-> gameOver in round 8', () => {
    const game = deadlockedGame(LAST_ROUND_DEADLOCK_SEED)
    expect(game.round).toBe(8)
    const events = record(game)
    game.forfeitRound()
    expect(game.phase).toBe('gameOver')
    expect(game.roundScores).toHaveLength(8)
    expect(events.map((e) => e.kind)).toEqual(['roundForfeited', 'beamTraced', 'roundScored', 'gameOver'])
  })
})

// =================================================================================================
describe('Game — actions rejected in a wrong phase (invalidPhase, state unchanged)', () => {
  const W1: readonly Action[] = [
    ['selectDie', (g) => g.selectDie({ color: 'red', value: 3 })],
    ['cancelSelection', (g) => g.cancelSelection()],
    ['refreshDraft', (g) => g.refreshDraft()],
    ['placeDie', (g) => g.placeDie({ row: 0, col: 0 })],
    ['forfeitRound', (g) => g.forfeitRound()],
  ]
  it.each(W1)('W1 patternSelection rejects %s', (_name, act) => {
    const game = newGame()
    const events = record(game)
    const before = snapshotOf(game)
    expect(() => act(game)).toThrow(GameError)
    expect(() => act(game)).toThrow(violationKind('invalidPhase'))
    expect(snapshotOf(game)).toEqual(before)
    expect(game.window).toBeNull()
    expect(events).toEqual([])
  })

  const W2: readonly Action[] = [
    ['choosePattern', (g) => g.choosePattern(PATTERN)],
    ['cancelSelection', (g) => g.cancelSelection()],
    ['placeDie', (g) => g.placeDie({ row: 0, col: 0 })],
  ]
  it.each(W2)('W2 draft rejects %s', (_name, act) => {
    const game = newGame()
    game.choosePattern(PATTERN)
    const events = record(game)
    const before = snapshotOf(game)
    expect(() => act(game)).toThrow(GameError)
    expect(() => act(game)).toThrow(violationKind('invalidPhase'))
    expect(snapshotOf(game)).toEqual(before)
    expect(game.phase).toBe('draft')
    expect(events).toEqual([])
  })

  it('W3 place rejects choosePattern', () => {
    const game = holdingGame()
    const events = record(game)
    const before = snapshotOf(game)
    expect(() => game.choosePattern(PATTERN)).toThrow(GameError)
    expect(() => game.choosePattern(PATTERN)).toThrow(violationKind('invalidPhase'))
    expect(snapshotOf(game)).toEqual(before)
    expect(game.hand).toBe(before.hand)
    expect(events).toEqual([])
  })

  const W4: readonly Action[] = [
    ['choosePattern', (g) => g.choosePattern(PATTERN)],
    ['selectDie', (g) => g.selectDie({ color: 'red', value: 3 })],
    ['cancelSelection', (g) => g.cancelSelection()],
    ['refreshDraft', (g) => g.refreshDraft()],
    ['placeDie', (g) => g.placeDie({ row: 0, col: 0 })],
    ['forfeitRound', (g) => g.forfeitRound()],
  ]
  it.each(W4)('W4 gameOver rejects %s', (_name, act) => {
    const game = finishedGame()
    const events = record(game)
    const before = snapshotOf(game)
    expect(() => act(game)).toThrow(GameError)
    expect(() => act(game)).toThrow(violationKind('invalidPhase'))
    expect(snapshotOf(game)).toEqual(before)
    expect(game.report).toBe(before.report)
    expect(events).toEqual([])
  })
})

// =================================================================================================
describe('Game — one test per error kind', () => {
  it('E1 invalidPhase: refreshDraft before a pattern is chosen; nothing spent', () => {
    const game = newGame()
    const before = snapshotOf(game)
    expect(() => game.refreshDraft()).toThrow(GameError)
    expect(() => game.refreshDraft()).toThrow(/phase/)
    expect(() => game.refreshDraft()).toThrow(violationKind('invalidPhase'))
    expect(snapshotOf(game)).toEqual(before)
    expect(game.refreshesRemaining).toBe(1)
  })

  it("E2 unknownPattern: choosePattern('nope') names the id; phase and window unchanged", () => {
    const game = newGame()
    const events = record(game)
    expect(() => game.choosePattern('nope')).toThrow(GameError)
    expect(() => game.choosePattern('nope')).toThrow(/unknown pattern/i)
    expect(() => game.choosePattern('nope')).toThrow(violationKind('unknownPattern'))
    expect((catchError(() => game.choosePattern('nope')) as GameError).violation).toEqual({ kind: 'unknownPattern', id: 'nope' })
    expect(game.phase).toBe('patternSelection')
    expect(game.window).toBeNull()
    expect(events).toEqual([])
  })

  it('E3 dieNotInPool: selecting an absent die; pool, hand and phase unchanged', () => {
    const game = newGame()
    game.choosePattern(PATTERN)
    const absent = ALL_FACES.find((face) => !game.draftPool.contains(face))!
    const before = snapshotOf(game)
    expect(() => game.selectDie(absent)).toThrow(PlacementError)
    expect(() => game.selectDie(absent)).toThrow(/draft pool/)
    expect(() => game.selectDie(absent)).toThrow(violationKind('dieNotInPool'))
    expect(snapshotOf(game)).toEqual(before)
  })

  it('E4 refreshSpent: a second recast; pool unchanged', () => {
    const game = newGame()
    game.choosePattern(PATTERN)
    game.refreshDraft()
    const before = snapshotOf(game)
    expect(() => game.refreshDraft()).toThrow(GameError)
    expect(() => game.refreshDraft()).toThrow(/refresh/i)
    expect(() => game.refreshDraft()).toThrow(violationKind('refreshSpent'))
    expect(snapshotOf(game)).toEqual(before)
  })

  it('E5 legalMovesRemain: forfeiting a solvable draft; round and pool unchanged', () => {
    const game = newGame()
    game.choosePattern(PATTERN)
    const before = snapshotOf(game)
    expect(() => game.forfeitRound()).toThrow(GameError)
    expect(() => game.forfeitRound()).toThrow(/legal move/)
    expect(() => game.forfeitRound()).toThrow(violationKind('legalMovesRemain'))
    expect(snapshotOf(game)).toEqual(before)
  })

  it('E6 outOfBounds: placeDie({row: 9, col: 0}) is a GameError only, publishes nothing, keeps the hand', () => {
    const game = holdingGame()
    const held = game.hand
    const events = record(game)
    const before = snapshotOf(game)
    expect(() => game.placeDie({ row: 9, col: 0 })).toThrow(GameError)
    expect(() => game.placeDie({ row: 9, col: 0 })).toThrow(/outside the grid/)
    expect(() => game.placeDie({ row: 9, col: 0 })).toThrow(violationKind('outOfBounds'))
    expect(catchError(() => game.placeDie({ row: 9, col: 0 }))).not.toBeInstanceOf(PlacementError)
    expect(snapshotOf(game)).toEqual(before)
    expect(game.hand).toBe(held)
    expect(events).toEqual([])
  })

  it('E7 PlacementError illegalFirstPlacement at (1,1) on the empty window; one rejection event', () => {
    const game = holdingGame()
    const held = game.hand
    const events = record(game)
    const before = snapshotOf(game)
    expect(() => game.placeDie({ row: 1, col: 1 })).toThrow(PlacementError)
    expect(snapshotOf(game)).toEqual(before)
    expect(game.hand).toBe(held)
    expect(game.window!.isEmpty).toBe(true)
    expect(events.map((e) => e.toData())).toEqual([
      { kind: 'placementRejected', position: { row: 1, col: 1 }, violation: { kind: 'illegalFirstPlacement' } },
    ])
    expect(() => game.placeDie({ row: 1, col: 1 })).toThrow(violationKind('illegalFirstPlacement'))
    expect(snapshotOf(game)).toEqual(before)
  })
})

// =================================================================================================
describe('Game — golden master (seed 3, novice-rose, max-flex auto-player)', () => {
  it('G1 golden round scores and total', () => {
    const game = finishedGame()
    expect(game.roundScores).toEqual(GOLDEN_ROUNDS)
    expect(game.totalScore).toBe(GOLDEN_TOTAL)
  })

  it('G2 golden event stream: 41 kinds', () => {
    const events = autoPlay(newGame(), PATTERN)
    expect(GOLDEN_KINDS).toHaveLength(41)
    expect(events.map((e) => e.kind)).toEqual(GOLDEN_KINDS)
  })

  it('G3 golden final report: 186 gold', () => {
    expect(finishedGame().report).toEqual(GOLDEN_REPORT)
  })

  it('G4 golden replay: two fresh games publish identical plain streams', () => {
    const a = autoPlay(newGame(), PATTERN).map((e) => e.toData())
    const b = autoPlay(newGame(), PATTERN).map((e) => e.toData())
    expect(a).toHaveLength(41)
    expect(a).toEqual(b)
  })

  it('G5 golden events are ModelEvents whose source is the game', () => {
    const game = newGame()
    const events = autoPlay(game, PATTERN)
    expect(events.filter((e) => !(e instanceof ModelEvent))).toEqual([])
    expect(events.filter((e) => e.source !== game)).toEqual([])
  })

  it('G6 golden stream reaches a ModelListener, a subscribe callback and autoPlay as the same 41 instances', () => {
    const game = newGame()
    const viaListener = record(game)
    const viaSubscribe: GameEvent[] = []
    game.subscribe((event) => { viaSubscribe.push(event) })
    const viaAutoPlay = autoPlay(game, PATTERN)
    expect(viaListener).toHaveLength(41)
    expect(viaSubscribe).toHaveLength(41)
    expect(viaAutoPlay).toHaveLength(41)
    expect(viaListener.filter((e, i) => e !== viaSubscribe[i] || e !== viaAutoPlay[i])).toEqual([])
    expect(viaAutoPlay.filter((e) => e.source !== game)).toEqual([])
    expect(viaAutoPlay.at(-1)!.kind).toBe('gameOver')
  })
})

// =================================================================================================
// Ported from tests/engine/game.test.ts (inc-47-green). Kind matchers and unchanged-state checks
// were added to every rejection, per the master-context test rules.
describe('Game — setup determinism (ported)', () => {
  it('P1 offers the same patterns, objectives, and entry sequence for the same seed (ported)', () => {
    const a = newGame()
    const b = newGame()
    expect(a.offeredPatterns.map((p) => p.id)).toEqual(b.offeredPatterns.map((p) => p.id))
    expect(a.objectives.publics.map((o) => o.id)).toEqual(b.objectives.publics.map((o) => o.id))
    expect(a.objectives.privateObjective.id).toBe(b.objectives.privateObjective.id)
    expect(a.entrySequence).toEqual(b.entrySequence)
    expect(a.entrySequence).toHaveLength(8)
  })

  it('P2 draws the same opening draft pool for the same seed (ported)', () => {
    const a = newGame()
    const b = newGame()
    a.choosePattern(a.offeredPatterns[0].id)
    b.choosePattern(b.offeredPatterns[0].id)
    expect(a.draftPool.dice).toEqual(b.draftPool.dice)
  })
})

describe('Game — phase law (ported)', () => {
  it('P3 rejects die selection before a pattern is chosen (invalidPhase) (ported)', () => {
    const game = newGame()
    const before = snapshotOf(game)
    expect(() => game.selectDie({ color: 'red', value: 3 })).toThrowError(GameError)
    expect(() => game.selectDie({ color: 'red', value: 3 })).toThrowError(/phase/)
    expect(() => game.selectDie({ color: 'red', value: 3 })).toThrow(violationKind('invalidPhase'))
    expect(snapshotOf(game)).toEqual(before)
  })

  it('P4 rejects choosePattern with an unknown id (ported)', () => {
    const game = newGame()
    expect(() => game.choosePattern('nope')).toThrowError(/unknown pattern/i)
    expect(() => game.choosePattern('nope')).toThrow(violationKind('unknownPattern'))
    expect(game.phase).toBe('patternSelection')
  })

  it('P5 rejects a second choosePattern (invalidPhase) (ported)', () => {
    const game = newGame()
    game.choosePattern(game.offeredPatterns[0].id)
    const before = snapshotOf(game)
    expect(() => game.choosePattern(game.offeredPatterns[1].id)).toThrowError(/phase/)
    expect(() => game.choosePattern(game.offeredPatterns[1].id)).toThrow(violationKind('invalidPhase'))
    expect(snapshotOf(game)).toEqual(before)
  })

  it('P6 rejects placeDie with nothing selected (invalidPhase) (ported)', () => {
    const game = newGame()
    game.choosePattern(game.offeredPatterns[0].id)
    const before = snapshotOf(game)
    expect(() => game.placeDie({ row: 0, col: 0 })).toThrowError(/phase/)
    expect(() => game.placeDie({ row: 0, col: 0 })).toThrow(violationKind('invalidPhase'))
    expect(snapshotOf(game)).toEqual(before)
  })

  it('P7 rejects everything after game over (invalidPhase) (ported)', () => {
    const game = finishedGame()
    expect(game.phase).toBe('gameOver')
    const before = snapshotOf(game)
    expect(() => game.selectDie({ color: 'red', value: 3 })).toThrowError(/phase/)
    expect(() => game.placeDie({ row: 0, col: 0 })).toThrowError(/phase/)
    expect(() => game.selectDie({ color: 'red', value: 3 })).toThrow(violationKind('invalidPhase'))
    expect(() => game.placeDie({ row: 0, col: 0 })).toThrow(violationKind('invalidPhase'))
    expect(snapshotOf(game)).toEqual(before)
  })
})

describe('Game — selection and placement (ported)', () => {
  it('P8 keeps the held die and pool unchanged after an invalid re-selection (ported)', () => {
    const game = newGame()
    game.choosePattern(PATTERN)
    const held = game.draftPool.dice[0]!
    game.selectDie(held)
    const pool = game.draftPool.dice
    expect(() => game.selectDie({ color: 'purple', value: 6 })).toThrowError(/draft pool/)
    expect(() => game.selectDie({ color: 'purple', value: 6 })).toThrow(violationKind('dieNotInPool'))
    expect(game.hand).toEqual(held)
    expect(game.draftPool.dice).toEqual(pool)
    expect(game.phase).toBe('place')
  })

  it('P9 counts a legal held die even when the visible pool is empty (ported)', () => {
    const game = newGame()
    game.choosePattern(PATTERN)
    const playable = game.draftPool.dice[0]!
    game.draftPool.clear()
    game.draftPool.putBack([playable])
    game.selectDie(playable)
    expect(game.hasLegalMove()).toBe(true)
  })

  it('P10 cancels selection by returning the hand to the draft (ported)', () => {
    const game = newGame()
    game.choosePattern(PATTERN)
    const die = game.draftPool.dice[0]!
    game.selectDie(die)
    game.cancelSelection()
    expect(game.phase).toBe('draft')
    expect(game.hand).toBeNull()
    expect(game.draftPool.dice).toHaveLength(5)
    expect(game.draftPool.dice).toContainEqual(die)
  })

  it('P11 selecting moves the die from pool to hand; re-selecting returns the first (ported)', () => {
    const game = newGame()
    game.choosePattern(game.offeredPatterns[0].id)
    const first = game.draftPool.dice[0]!
    const second = game.draftPool.dice[1]!
    game.selectDie(first)
    expect(game.hand).toEqual(first)
    expect(game.draftPool.dice).toHaveLength(4)
    game.selectDie(second)
    expect(game.hand).toEqual(second)
    expect(game.draftPool.dice).toHaveLength(4)
    expect(game.draftPool.dice.some((d) => d.color === first.color && d.value === first.value)).toBe(true)
  })

  it('P12 selecting a die not in the pool throws dieNotInPool (ported)', () => {
    const game = newGame()
    game.choosePattern(game.offeredPatterns[0].id)
    const absent = ALL_FACES.find(
      (d) => !game.draftPool.dice.some((p) => p.color === d.color && p.value === d.value),
    )!
    const before = snapshotOf(game)
    expect(() => game.selectDie(absent)).toThrowError(/draft pool/)
    expect(() => game.selectDie(absent)).toThrow(violationKind('dieNotInPool'))
    expect(snapshotOf(game)).toEqual(before)
  })

  it('P13 a rejected placement throws PlacementError, emits the rejection, and keeps the die in hand (ported)', () => {
    const game = newGame()
    game.choosePattern(game.offeredPatterns[0].id)
    // First die must go on the border ring: the interior (1,1) is always illegal.
    const die = game.draftPool.dice[0]!
    game.selectDie(die)
    const events: GameEvent[] = []
    game.subscribe(events.push.bind(events))
    const windowBefore = game.window!.dice
    expect(() => game.placeDie({ row: 1, col: 1 })).toThrowError(PlacementError)
    const rejection = events.find((e) => e.kind === 'placementRejected')
    expect(rejection?.kind).toBe('placementRejected')
    expect(game.hand).toEqual(die)
    expect(game.window!.dice).toEqual(windowBefore)
  })

  it('P14 completes a round after two placements: refresh, illuminate, announce the next entry (ported)', () => {
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

/** P15 body for one game: recast the opening draft while holding a die. */
const recastOpening = (game: Game) => {
  game.choosePattern(PATTERN)
  game.selectDie(game.draftPool.dice[0]!)
  const original = game.draftPool.dice
  game.refreshDraft()
  return { game, original }
}

/** P15 per-game expectations (the reference ran these inside a `for` loop over two games). */
const expectRecastOpening = ({ game, original }: ReturnType<typeof recastOpening>) => {
  expect(game.draftPool.dice).not.toEqual(original)
  expect(game.draftPool.size).toBe(5)
  expect(game.hand).toBeNull()
  expect(game.phase).toBe('draft')
  expect(game.round).toBe(1)
  expect(game.roundScores).toEqual([])
  expect(game.refreshesRemaining).toBe(0)
  expect(() => game.refreshDraft()).toThrowError(/refresh/i)
  expect(() => game.refreshDraft()).toThrow(violationKind('refreshSpent'))
}

describe('Game — a single draft refresh (ported)', () => {
  it('P15 replaces the unplaced dice deterministically without consuming a placement or round (ported)', () => {
    const a = recastOpening(newGame())
    const b = recastOpening(newGame())
    expectRecastOpening(a)
    expectRecastOpening(b)
    expect(a.game.draftPool.dice).toEqual(b.game.draftPool.dice)
  })

  it('P16 preserves a partially completed round and the remaining draft size (ported)', () => {
    const game = newGame()
    game.choosePattern(PATTERN)
    const first = game.draftPool.dice[0]!
    const target = game.legalPlacementsFor(first)[0]!
    game.selectDie(first)
    game.placeDie(target)
    game.refreshDraft()
    expect(game.window!.placedCount).toBe(1)
    expect(game.draftPool.size).toBe(4)
    expect(game.round).toBe(1)
    const next = game.draftPool.dice.find((die) => game.legalPlacementsFor(die).length > 0)!
    const nextTarget = game.legalPlacementsFor(next)[0]!
    game.selectDie(next)
    game.placeDie(nextTarget)
    expect(game.round).toBe(2)
    expect(game.roundScores).toHaveLength(1)
  })

  it('P17 rejects refresh outside gameplay without spending it (ported)', () => {
    const game = newGame()
    expect(() => game.refreshDraft()).toThrowError(/phase/)
    expect(() => game.refreshDraft()).toThrow(violationKind('invalidPhase'))
    expect(game.refreshesRemaining).toBe(1)
  })
})

describe('Game — forfeiting only a blocked draft (ported)', () => {
  it('P18 rejects a forfeit while a legal move remains and preserves the draft (ported)', () => {
    const game = newGame()
    game.choosePattern(PATTERN)
    const pool = game.draftPool.dice
    expect(() => game.forfeitRound()).toThrowError(/legal move/)
    expect(() => game.forfeitRound()).toThrow(violationKind('legalMovesRemain'))
    expect(game.round).toBe(1)
    expect(game.draftPool.dice).toEqual(pool)
    expect(game.roundScores).toEqual([])
  })

  it('P19 still illuminates and advances a blocked draft exactly once (ported)', () => {
    const game = newGame()
    game.choosePattern(PATTERN)
    game.draftPool.clear()
    game.forfeitRound()
    expect(game.round).toBe(2)
    expect(game.roundScores).toEqual([0])
    expect(game.draftPool.size).toBe(5)
  })
})

describe('Game — golden master (seed 3, novice-rose, max-flex auto-player) (ported)', () => {
  it('P20 produces the exact recorded round scores, total, and event stream (ported)', () => {
    const game = newGame()
    const events = autoPlay(game, PATTERN)
    expect(game.roundScores).toEqual(GOLDEN_ROUNDS)
    expect(game.totalScore).toBe(GOLDEN_TOTAL)
    expect(events.map((e) => e.kind)).toEqual(GOLDEN_KINDS)
    expect(game.phase).toBe('gameOver')
  })

  it('P21 produces the exact recorded final score report (ported)', () => {
    const game = finishedGame()
    expect(game.report).toEqual(GOLDEN_REPORT)
    expect(game.report!.beamTotal).toBe(game.totalScore)
    expect(game.report!.total).toBe(186)
    expect(game.report!.tier).toBe('gold')
  })

  it('P22 replays bit-identically on a fresh instance (ported)', () => {
    const a = autoPlay(newGame(), PATTERN)
    const b = autoPlay(newGame(), PATTERN)
    expect(a).toEqual(b)
  })
})
