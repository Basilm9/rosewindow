/**
 * Strangler shim (Prompts 07, 09): seed normalization and the seeded RNG now live in
 * `src/model/SeededRandom.ts`. Deleted in Prompt 59.
 */
export { SeededRandom, mulberry32, normalizeSeed } from '../model/SeededRandom'
export type { Rng } from '../model/SeededRandom'
