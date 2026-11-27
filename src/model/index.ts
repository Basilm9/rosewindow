/**
 * Package `model`: all game state and every game rule (MVC_RoseWindow.md §4).
 * Imports only `@mvc` and itself — no React, DOM, `window`, `localStorage`, XState (§5).
 * @packageDocumentation
 */
export type { Position } from './Position'
export { ORTHOGONAL_DELTAS, DIAGONAL_DELTAS } from './Position'
export { Direction, DIRECTION_NAMES } from './Direction'
export type { DirectionName } from './Direction'
export { OpenConstraint, ColorConstraint, ValueConstraint } from './CellConstraint'
export type { CellConstraint, ConstraintKind } from './CellConstraint'
export { WindowPattern, ALL_PATTERNS } from './WindowPattern'
export { WindowCell } from './WindowCell'
export { GlassWindow } from './GlassWindow'
export type { DieGrid } from './GlassWindow'
export { DiceBag } from './DiceBag'
export { DraftPool } from './DraftPool'
export { GameError, PlacementError } from './GameError'
export type { GameViolation, PlacementViolation } from './GameError'
export { Die, DIE_COLORS } from './Die'
export type { DieColor, DieData } from './Die'
export { SeededRandom, mulberry32, normalizeSeed } from './SeededRandom'
export type { Rng } from './SeededRandom'
export { GameConfig, createGameConfig, PROVISIONAL_TIERS, DEFAULT_MULTIPLIER_CAP, DEFAULT_GRID_SIZE } from './GameConfig'
export type { TierThresholds } from './GameConfig'
