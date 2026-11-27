/**
 * The only place the acceptance tests touch game code, so that moving it (prompts 47 and
 * 59: `src/model`, `src/util/autoPlayer`) is an edit to these imports and nothing else.
 */
import { bestPair, fastForward } from '../../../src/dev/autoPlayer'
import type { Candidate } from '../../../src/dev/autoPlayer'
import type { Game } from '../../../src/engine/game'
import type { CellConstraint } from '../../../src/engine/types'

export { bestPair, fastForward }
export type { Candidate, CellConstraint, Game }

/** A printed demand as plain data, whichever shape `CellConstraint` has on this branch. */
export type Demand =
  | { readonly kind: 'color'; readonly color: string }
  | { readonly kind: 'value'; readonly value: number }
  | { readonly kind: 'open' }

/** Reads a constraint as plain data (prompt 15 turns `CellConstraint` into an interface). */
export function demandOf(constraint: CellConstraint): Demand {
  const data = constraint as unknown as Record<string, unknown>
  if (constraint.kind === 'color') return { kind: 'color', color: String(data.color) }
  if (constraint.kind === 'value') return { kind: 'value', value: Number(data.value) }
  return { kind: 'open' }
}

/** A node-side copy of the run the page plays: same seed, same pattern, round 1. */
export function replicaFor(seed: number, patternId: string): Game {
  const game = fastForward(seed, 1)
  game.choosePattern(patternId)
  return game
}

/** The announced beam entry. Reads a direction as today's string or as prompt 13's `Direction`. */
export function announcedEntry(game: Game): { row: number; col: number; direction: string } {
  const { position, direction } = game.currentEntry
  const name: unknown =
    typeof direction === 'string' ? direction : (direction as { readonly name: string }).name
  return { row: position.row, col: position.col, direction: String(name) }
}
