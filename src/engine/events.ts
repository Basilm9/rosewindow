import type { GameEvent } from '../model/events'

/**
 * Semantic model events (pitch §8.3). Shim (Prompt 47): the union is now the seven event classes
 * in `src/model/events.ts`; `kind` and payload names are unchanged. Deleted in Prompt 59.
 */
export type { GameEvent } from '../model/events'

/** Legacy callback shape accepted by the deprecated `Game.subscribe` adapter. */
export type GameListener = (event: GameEvent) => void
