/**
 * The only place the acceptance tests touch game code, so that moving it (prompt 59:
 * `src/util/autoPlayer`) is an edit to these imports and nothing else. Since prompt 47 `Game`
 * and `CellConstraint` come from `src/model`.
 */
import { bestPair, fastForward } from '../../../src/dev/autoPlayer'
import type { Candidate } from '../../../src/dev/autoPlayer'
import type { Game } from '../../../src/model/Game'
import type { CellConstraint } from '../../../src/model/CellConstraint'

export { bestPair, fastForward }
export type { Candidate, CellConstraint, Game }

/** A printed demand as plain data. */
export type Demand =
  | { readonly kind: 'color'; readonly color: string }
  | { readonly kind: 'value'; readonly value: number }
  | { readonly kind: 'open' }

/** Reads a constraint as plain data (`CellConstraint` is an interface since prompt 15). */
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

/** The announced beam entry, with the `Direction` read as its compass name. */
export function announcedEntry(game: Game): { row: number; col: number; direction: string } {
  const { position, direction } = game.currentEntry
  return { row: position.row, col: position.col, direction: direction.name }
}
