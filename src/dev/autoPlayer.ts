import { findPlacementViolation } from '../engine/placementValidator'
import { createGameConfig } from '../engine/config'
import { Game } from '../engine/game'
import type { GameEvent } from '../engine/events'
import type { Die, Position } from '../engine/types'

/**
 * Deterministic auto-player used by tests and the dev-only seeded demo mode
 * (`?seed=..&round=..`). Not part of game rules; prefers placements that leave
 * the most future options open.
 */

export interface Candidate {
  die: Die
  target: Position
}

export function legalPairs(game: Game): Candidate[] {
  const window = game.window!
  const pairs: Candidate[] = []
  for (const die of game.draftPool.dice) {
    for (let row = 0; row < game.config.gridSize; row++) {
      for (let col = 0; col < game.config.gridSize; col++) {
        const target: Position = { row, col }
        if (
          findPlacementViolation({
            grid: window.dice,
            constraints: window.constraints,
            pool: [die],
            die,
            target,
          }) === null
        ) {
          pairs.push({ die, target })
        }
      }
    }
  }
  return pairs
}

function pairsAfter(game: Game, candidate: Candidate): number {
  const window = game.window!
  window.place(candidate.die, candidate.target)
  const remaining = game.draftPool.dice.filter(
    (d) => !(d.color === candidate.die.color && d.value === candidate.die.value),
  )
  let count = 0
  for (const die of remaining) {
    for (let row = 0; row < game.config.gridSize; row++) {
      for (let col = 0; col < game.config.gridSize; col++) {
        const target: Position = { row, col }
        if (
          findPlacementViolation({
            grid: window.dice,
            constraints: window.constraints,
            pool: [die],
            die,
            target,
          }) === null
        ) {
          count += 1
        }
      }
    }
  }
  window.remove(candidate.target)
  return count
}

/** The legal placement leaving the most future options (max-flexibility greedy). */
export function bestPair(game: Game): Candidate | null {
  const candidates = legalPairs(game)
  if (candidates.length === 0) return null
  let best = candidates[0]!
  let bestFlex = -1
  for (const candidate of candidates) {
    const flex = pairsAfter(game, candidate)
    if (flex > bestFlex) {
      bestFlex = flex
      best = candidate
    }
  }
  return best
}

export function autoPlace(game: Game): boolean {
  const best = bestPair(game)
  if (best === null) return false
  game.selectDie(best.die)
  game.placeDie(best.target)
  return true
}

/** Plays a full run; returns the recorded events. Throws if the auto-player dead-ends. */
export function autoPlay(game: Game, patternId: string): GameEvent[] {
  const events: GameEvent[] = []
  game.subscribe(events.push.bind(events))
  game.choosePattern(patternId)
  while (game.phase !== 'gameOver') {
    if (!autoPlace(game)) {
      game.forfeitRound()
    }
  }
  return events
}

/**
 * Dev demo factory: a seeded game booted straight into round `targetRound`
 * (9 = finished game). Offered patterns are probed first so the chosen one can
 * actually reach the target — dead-ended rounds are forfeited (the beam still
 * scores), so every seed completes.
 */
export function fastForward(seed: number, targetRound: number): Game {
  const config = createGameConfig(seed)
  const game = new Game(config)
  if (targetRound <= 1) return game

  const playTo = (sim: Game, patternId: string): boolean => {
    sim.choosePattern(patternId)
    let guard = 0
    while (sim.phase !== 'gameOver' && sim.round < targetRound && guard++ < 300) {
      if (!autoPlace(sim)) sim.forfeitRound()
    }
    return sim.phase === 'gameOver' || sim.round >= targetRound
  }

  const completable = game.offeredPatterns.find((p) => {
    const sim = new Game(config)
    try {
      return playTo(sim, p.id)
    } catch {
      return false
    }
  })
  if (completable === undefined) return game

  playTo(game, completable.id)
  return game
}
