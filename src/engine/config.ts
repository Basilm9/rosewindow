/**
 * Strangler shim (Prompt 07): run parameters now live in `src/model/GameConfig.ts`.
 * Deleted in Prompt 59.
 */
export {
  GameConfig,
  createGameConfig,
  PROVISIONAL_TIERS,
  DEFAULT_MULTIPLIER_CAP,
} from '../model/GameConfig'
export type { TierThresholds } from '../model/GameConfig'
