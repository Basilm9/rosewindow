/**
 * Package `model`: all game state and every game rule (MVC_RoseWindow.md §4).
 * Imports only `@mvc` and itself — no React, DOM, `window`, `localStorage`, XState (§5).
 * @packageDocumentation
 */
export type { Position } from './Position'
export type { CellConstraint } from './CellConstraint'
export { GameError, PlacementError } from './GameError'
export type { GameViolation, PlacementViolation } from './GameError'
export { SeededRandom, mulberry32, normalizeSeed } from './SeededRandom'
export type { Rng } from './SeededRandom'
export { GameConfig, createGameConfig, PROVISIONAL_TIERS, DEFAULT_MULTIPLIER_CAP } from './GameConfig'
export type { TierThresholds } from './GameConfig'
