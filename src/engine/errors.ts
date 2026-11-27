/** Shim (strangler migration): the exception hierarchy now lives in `src/model/GameError.ts`. Deleted in Prompt 59. */
export { GameError, PlacementError } from '../model/GameError'
export type { GameViolation, PlacementViolation } from '../model/GameError'
