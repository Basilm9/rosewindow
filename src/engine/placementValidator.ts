/**
 * Shim (strangler migration): the placement laws now live in `src/model/PlacementValidator.ts`
 * (Prompt 27). The function API below delegates to one shared stateless instance and is kept for
 * `gameMachine.ts`, `useGame.ts` and the auto-player. Deleted in Prompt 59.
 */
import { PlacementValidator } from '../model/PlacementValidator'
import type { PlacementCheck } from '../model/PlacementValidator'
import type { PlacementViolation } from '../model/GameError'
import type { DieGrid } from '../model/GlassWindow'
import type { Position } from '../model/Position'

export { PlacementValidator } from '../model/PlacementValidator'
export type { PlacementCheck } from '../model/PlacementValidator'
export type { DieGrid } from '../model/GlassWindow'

/** Shared stateless validator behind the function API. */
const validator = new PlacementValidator()

/** Delegates to {@link PlacementValidator.findViolation}. @throws GameError `outOfBounds` */
export function findPlacementViolation(check: PlacementCheck): PlacementViolation | null {
  return validator.findViolation(check)
}

/** Delegates to {@link PlacementValidator.assertValid}. @throws PlacementError, GameError `outOfBounds` */
export function assertPlacementValid(check: PlacementCheck): void {
  validator.assertValid(check)
}

/** Delegates to {@link PlacementValidator.isInsideGrid}. */
export function isInsideGrid(position: Position, size: number): boolean {
  return PlacementValidator.isInsideGrid(position, size)
}

/** Delegates to {@link PlacementValidator.isOnBorderRing}. */
export function isOnBorderRing(position: Position, size: number): boolean {
  return PlacementValidator.isOnBorderRing(position, size)
}

/** Delegates to {@link PlacementValidator.countPlaced}. */
export function countPlaced(grid: DieGrid): number {
  return PlacementValidator.countPlaced(grid)
}
