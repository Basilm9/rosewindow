# Prompt 07: GameConfig

**CRITICAL: Move `GameConfig` into `src/model/GameConfig.ts` as the ONE place every tunable number lives (NFR-4.4): seed, rounds 8, gridSize 4, draftSize 5, placementsPerRound 2, copiesPerDie 3, multiplierCap 5, tiers 40/65/90. Instances are deeply frozen and the seed is normalized exactly as today, or the golden master moves.**

---

### INCREMENT 07: Immutable run parameters
- **Status:** Standard
- **Dependencies:** Prompts 01–06
- **Reference implementation:** `src/engine/config.ts`, `src/engine/rng.ts` (`normalizeSeed`) and `tests/engine/config.test.ts`, `tests/engine/classes.test.ts` (first test)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 1)
- **Requirements:** NFR-4.4, FR-1.3, FR-1.6, FR-3.1, FR-4.14, FR-8.4

### MANDATORY: Sandwich Requirement
- **Start:** `GameConfig` is immutable (`Object.freeze` on the instance and on `tiers`) and contains no logic beyond defaults, normalization and validation.
- **End:** `pnpm test` 100 % green, golden master 5,5,31,16,2,7,53,37 / 156, `check:classes` ≥ 15.

### 1. Capability Specification
- **Adds:** `src/model/GameConfig.ts`; `src/model/SeededRandom.ts` containing **only** the exported function `normalizeSeed` for now (Prompt 09 adds the class to the same file).
- **Changes:** overrides are now validated; an invalid override throws `GameError({ kind: 'invalidArgument', detail })`.
- **Unchanged:** defaults, the seed normalization (`Number.isFinite(seed) ? seed >>> 0 : 0`), `createGameConfig`, `PROVISIONAL_TIERS`, `DEFAULT_MULTIPLIER_CAP`.

### 2. Implementation Instructions
```typescript
// src/model/SeededRandom.ts (this increment)
/** Canonical unsigned 32-bit seed; non-finite input maps to 0 (FR-1.6). */
export function normalizeSeed(seed: number): number

// src/model/GameConfig.ts — imports ./SeededRandom, ./GameError only
export interface TierThresholds { readonly bronze: number; readonly silver: number; readonly gold: number }
export const DEFAULT_MULTIPLIER_CAP = 5
export const PROVISIONAL_TIERS: TierThresholds   // frozen {bronze:40, silver:65, gold:90}

/** Immutable run parameters; the single home of every tunable number. */
export class GameConfig {
  readonly seed: number                 // normalized
  readonly rounds: number               // 8
  readonly gridSize: number             // 4
  readonly draftSize: number            // 5
  readonly placementsPerRound: number   // 2
  readonly copiesPerDie: number         // 3  → 5 colors × 6 values × 3 = 90 dice
  readonly multiplierCap: number        // 5
  readonly tiers: TierThresholds        // frozen copy, never the caller's object
  /** @throws GameError invalidArgument when an override is not a positive integer
   *  or tiers are not strictly increasing (bronze < silver < gold). */
  constructor(seed: number, overrides?: Partial<Omit<GameConfig, 'seed'>>)
}
/** Factory kept for existing callers (runSession, challenges, autoPlayer, Game tests). */
export function createGameConfig(seed: number, overrides?: Partial<Omit<GameConfig, 'seed'>>): GameConfig
```

**Behaviour rules (from `engine/config.ts`):**
1. Merge defaults with `...overrides`; the seed is never overridable.
2. `this.tiers = Object.freeze({ ...settings.tiers })` — mutating the caller's tiers object afterwards must not change the config (see `classes.test.ts`).
3. `Object.freeze(this)` as the last constructor statement.
4. Validation (new): `rounds`, `gridSize`, `draftSize`, `placementsPerRound`, `copiesPerDie`, `multiplierCap` must satisfy `Number.isInteger(x) && x > 0`; `detail` names the field, e.g. `'rounds must be a positive integer'`. Existing tests only override `rounds: 4` and tiers `{1,2,3}` / `{10,20,30}`, so nothing breaks.
5. No other module may contain the literals 8, 5, 2, 3, 40, 65, 90 as rule parameters; they read `GameConfig`.
6. TSDoc on the class, every field, the constructor (`@param`, `@throws`) and both exports.
7. **Shim:** `src/engine/config.ts` becomes `export { GameConfig, createGameConfig, PROVISIONAL_TIERS, DEFAULT_MULTIPLIER_CAP } from '../model/GameConfig'` and `export type { TierThresholds }`; `src/engine/rng.ts` re-exports `normalizeSeed` from `../model/SeededRandom`.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/config.test.ts tests/engine/classes.test.ts
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "feat(model): inc 07 GameConfig" && git tag inc-07-green
```
- [ ] typecheck 0; lint 0 errors 0 warnings; unit pass 100 %
- [ ] `createGameConfig(-1).seed === 4294967295`, `createGameConfig(4294967299).seed === 3`
- [ ] `Object.isFrozen(config) && Object.isFrozen(config.tiers)`
- [ ] `new GameConfig(1, { rounds: 0 })` throws `GameError` with kind `invalidArgument`
- [ ] Golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 15
- [ ] `src/model/GameConfig.ts` imports nothing outside `src/model`

---

**CRITICAL: GameConfig is the frozen, single home of every tunable number, normalizes the seed exactly as before and throws GameError on bad overrides; golden master stays 5,5,31,16,2,7,53,37 / 156.**
