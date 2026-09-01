import { Game } from '../../src/engine/game'
import type { GameEvent } from '../../src/engine/events'
import { findPlacementViolation } from '../../src/engine/placementValidator'
import type { Die, Position } from '../../src/engine/types'

interface Candidate {
  die: Die
  target: Position
}

function legalPairs(game: Game): Candidate[] {
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
  // undo
  window.remove(candidate.target)
  return count
}

/**
 * Deterministic test auto-player that prefers the placement leaving the most
 * future options (max-flexibility greedy). Returns false when hard-stuck.
 */
export function autoPlace(game: Game): boolean {
  const candidates = legalPairs(game)
  if (candidates.length === 0) return false
  let best = candidates[0]!
  let bestFlex = -1
  for (const candidate of candidates) {
    const flex = pairsAfter(game, candidate)
    if (flex > bestFlex) {
      bestFlex = flex
      best = candidate
    }
  }
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
    if (!autoPlace(game) || !autoPlace(game)) {
      throw new Error(`auto-player dead-ended in round ${game.round}`)
    }
  }
  return events
}
