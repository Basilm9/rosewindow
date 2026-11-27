/**
 * Test helpers for prompt 48 (Game tests, golden master, NFR-6 safety properties).
 *
 * Every loop and every `try/catch` the Game suites need lives here, so the test files themselves
 * contain no `if/for/while`. Pure test code: nothing here is imported by production.
 *
 * Pattern choice: every helper that starts a game from a bare seed chooses
 * `offeredPatterns[0]`. This is the convention the prompt-48 author used; it reproduces the
 * prompt's statement that seeds 7, 30, 46, 63 and 71 have no recast moment in round
 * `(seed % 8) + 1` (checked when this file was written). The golden master uses `novice-rose`
 * explicitly and does not go through {@link startGame}.
 *
 * Every helper accepts optional config overrides so the isolation protocol can run them on a
 * simplified config first (`{ rounds: 1 }`).
 */
import type { GameConfig } from '../../src/model/GameConfig'
import { createGameConfig } from '../../src/model/GameConfig'
import { Game } from '../../src/model/Game'
import { GameError, PlacementError } from '../../src/model/GameError'
import type { Position } from '../../src/model/Position'
import { autoPlace, bestPair } from './autoPlayer'

/** Config overrides accepted by {@link createGameConfig}. */
export type ConfigOverrides = Partial<Omit<GameConfig, 'seed'>>

/** The terminations the beam tracer may report (NFR-6.2). */
const KNOWN_TERMINATIONS: ReadonlySet<string> = new Set(['exitedGrid', 'cycle'])

/**
 * Runs `fn` and returns what it threw.
 * @returns the thrown value, or `undefined` when `fn` returned normally.
 */
export function catchError(fn: () => unknown): unknown {
  try {
    fn()
  } catch (error) {
    return error
  }
  return undefined
}

/** A fresh game in `patternSelection`. */
export function newGame(seed: number, overrides: ConfigOverrides = {}): Game {
  return new Game(createGameConfig(seed, overrides))
}

/** A fresh game with `offeredPatterns[0]` chosen (phase `draft`, round 1). */
export function startGame(seed: number, overrides: ConfigOverrides = {}): Game {
  const game = newGame(seed, overrides)
  game.choosePattern(game.offeredPatterns[0].id)
  return game
}

/**
 * Plays with the max-flex auto-player, forfeiting when it finds no move, until `stop(game)` is
 * true or the game is over. `stop` is checked before every step.
 * @returns the same game, for chaining.
 */
export function playUntil(game: Game, stop: (game: Game) => boolean = () => false): Game {
  while (game.phase !== 'gameOver' && !stop(game)) {
    if (!autoPlace(game)) game.forfeitRound()
  }
  return game
}

/**
 * True at the start of a round (nothing placed yet, nothing held) in which no visible die has
 * any legal cell: the forfeit-from-`draft` moment.
 */
export function isDeadlockedAtRoundStart(game: Game): boolean {
  return (
    game.phase === 'draft' &&
    game.placementsRemaining === game.config.placementsPerRound &&
    !game.hasLegalMove()
  )
}

/** Every cell of an n×n grid, row-major. */
export function allCells(gridSize: number): Position[] {
  const cells: Position[] = []
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) cells.push({ row, col })
  }
  return cells
}

/**
 * Everything observable about a game that a rejected action must not change (NFR-2.1, NFR-2.3).
 * Arrays are copied, so a later change in the game never shows up in an earlier snapshot.
 */
export function snapshotOf(game: Game) {
  return {
    phase: game.phase,
    round: game.round,
    window: game.window === null ? null : game.window.dice,
    pool: game.draftPool.dice,
    hand: game.hand,
    refreshesRemaining: game.refreshesRemaining,
    placementsRemaining: game.placementsRemaining,
    roundScores: [...game.roundScores],
    totalScore: game.totalScore,
    report: game.report,
  }
}

/**
 * Plays `seed` with the auto-player. Before each placement it holds the chosen die and tries
 * EVERY cell where that die is illegal (occupied cells included), comparing the window and the
 * hand before and after each attempt (NFR-6.1, FR-4.10).
 *
 * `kinds` collects the violation kind of each rejection. An attempt that does not throw a
 * {@link PlacementError} adds `'accepted'` (no throw) or the {@link GameError} kind / `'unexpected'`,
 * so the union check in the suite fails loudly. On the first changed window or hand the audit
 * stops and returns, because later play from a corrupted state means nothing.
 * @returns counts of attempts that changed the window or the hand, and the rejection kinds seen.
 */
export function rejectedPlacementAudit(
  seed: number,
  overrides: ConfigOverrides = {},
): { windowChanged: number; handChanged: number; kinds: ReadonlySet<string> } {
  const game = startGame(seed, overrides)
  const kinds = new Set<string>()
  let windowChanged = 0
  let handChanged = 0
  while (game.phase !== 'gameOver') {
    const best = bestPair(game)
    if (best === null) {
      game.forfeitRound()
      continue
    }
    game.selectDie(best.die)
    const held = game.hand
    const legal = game.legalPlacementsFor(best.die)
    const illegal = allCells(game.config.gridSize).filter(
      (cell) => !legal.some((p) => p.row === cell.row && p.col === cell.col),
    )
    for (const target of illegal) {
      const windowBefore = JSON.stringify(game.window!.dice)
      const error = catchError(() => game.placeDie(target))
      if (error instanceof PlacementError) kinds.add(error.violation.kind)
      else if (error instanceof GameError) kinds.add(error.violation.kind)
      else kinds.add(error === undefined ? 'accepted' : 'unexpected')
      if (JSON.stringify(game.window!.dice) !== windowBefore) windowChanged++
      if (game.hand !== held || game.phase !== 'place') handChanged++
      if (windowChanged + handChanged > 0) return { windowChanged, handChanged, kinds }
    }
    game.placeDie(best.target)
  }
  return { windowChanged, handChanged, kinds }
}

/**
 * Plays `seed` with the auto-player and, at every `roundScored` event, records
 * `totalScore − Σ roundScores` (NFR-6.3, FR-5.11).
 * @returns one drift value per scored round, in round order (all 0 when the property holds).
 */
export function runningTotalDrift(seed: number, overrides: ConfigOverrides = {}): readonly number[] {
  const game = newGame(seed, overrides)
  const drift: number[] = []
  game.addModelListener({
    modelChanged: (event) => {
      if (event.kind === 'roundScored') {
        drift.push(game.totalScore - game.roundScores.reduce((sum, score) => sum + score, 0))
      }
    },
  })
  game.choosePattern(game.offeredPatterns[0].id)
  playUntil(game)
  return drift
}

/**
 * Plays `seed` with the auto-player and audits every `beamTraced` path (NFR-6.2): the longest
 * path, the number of repeated (cell, direction) entries within one path (the cycle guard must
 * make this 0), and the number of paths whose termination is neither `exitedGrid` nor `cycle`.
 */
export function beamStopAuditForSeed(
  seed: number,
  overrides: ConfigOverrides = {},
): { longest: number; repeats: number; badEndings: number } {
  const game = newGame(seed, overrides)
  const audit = { longest: 0, repeats: 0, badEndings: 0 }
  game.addModelListener({
    modelChanged: (event) => {
      if (event.kind !== 'beamTraced') return
      const { segments, termination } = event.path
      const entries = new Set(
        segments.map((s) => `${s.position.row},${s.position.col},${s.direction.name}`),
      )
      audit.longest = Math.max(audit.longest, segments.length)
      audit.repeats += segments.length - entries.size
      if (!KNOWN_TERMINATIONS.has(termination)) audit.badEndings++
    },
  })
  game.choosePattern(game.offeredPatterns[0].id)
  playUntil(game)
  return audit
}

/** The counters a recast must not change (NFR-6.4, FR-11.5), plus the recast count itself. */
export interface Counters {
  /** Current round. */
  readonly round: number
  /** Placements left in the current round. */
  readonly placementsRemaining: number
  /** Copy of the finished rounds' scores. */
  readonly roundScores: readonly number[]
  /** Running beam total. */
  readonly totalScore: number
  /** Dice in the window. */
  readonly placedCount: number
  /** Recasts left this run. */
  readonly refreshesRemaining: number
}

/** Reads the {@link Counters} of a game whose pattern is chosen. */
export function countersOf(game: Game): Counters {
  return {
    round: game.round,
    placementsRemaining: game.placementsRemaining,
    roundScores: [...game.roundScores],
    totalScore: game.totalScore,
    placedCount: game.window!.placedCount,
    refreshesRemaining: game.refreshesRemaining,
  }
}

/** True right after the first placement of a round that has not ended. */
function isAfterFirstPlacement(game: Game, round: number): boolean {
  return (
    game.phase !== 'gameOver' &&
    game.round === round &&
    game.placementsRemaining === game.config.placementsPerRound - 1
  )
}

/**
 * Dry run: the rounds in which the auto-player places exactly one die and has not ended the
 * round. A round that deadlocks before its first placement offers no such moment.
 */
export function recastRounds(seed: number, overrides: ConfigOverrides = {}): number[] {
  const game = startGame(seed, overrides)
  const rounds: number[] = []
  while (game.phase !== 'gameOver') {
    const round = game.round
    if (!autoPlace(game)) game.forfeitRound()
    else if (isAfterFirstPlacement(game, round)) rounds.push(round)
  }
  return rounds
}

/**
 * Recasts once, right after the first placement of a round, and returns counters before/after.
 * A dry run first lists the rounds in which the auto-player places exactly one die and has not
 * ended the round (a round that deadlocks before its first placement offers no such moment), and
 * the recast happens in rounds[seed % rounds.length]. A fixed round, e.g. (seed % 8) + 1, does NOT
 * work: seeds 7, 30, 46, 63 and 71 have no such moment in that round.
 * The run then continues to game over; `roundsPlayed` is the number of scored rounds (FR-6.6).
 * @throws Error when the dry run finds no recast moment or the live run never reaches it.
 */
export function recastCounters(
  seed: number,
  overrides: ConfigOverrides = {},
): { before: Counters; after: Counters; roundsPlayed: number } {
  const rounds = recastRounds(seed, overrides)
  if (rounds.length === 0) throw new Error(`seed ${seed}: no recast moment`)
  const recastRound = rounds[seed % rounds.length]!
  const game = startGame(seed, overrides)
  let recast: { before: Counters; after: Counters } | null = null
  while (game.phase !== 'gameOver') {
    if (!autoPlace(game)) {
      game.forfeitRound()
    } else if (recast === null && isAfterFirstPlacement(game, recastRound)) {
      const before = countersOf(game)
      game.refreshDraft()
      recast = { before, after: countersOf(game) }
    }
  }
  if (recast === null) throw new Error(`seed ${seed}: round ${recastRound} never reached`)
  return { ...recast, roundsPlayed: game.roundScores.length }
}
