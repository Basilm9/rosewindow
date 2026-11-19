# Prompt 23: DiceBag

**CRITICAL: Move `DiceBag` into `src/model/DiceBag.ts`: 90 dice (5 colors × 6 values × `config.copiesPerDie`), built in DIE_COLORS × value × copy order and shuffled ONCE with the injected rng; draws from the front, returns to the back. The bag is the first consumer of the run's rng (89 draws) — any change to build order, shuffle or draw policy changes every later random draw and the golden master.**

---

### INCREMENT 23: Seeded dice bag
- **Status:** Standard
- **Dependencies:** Prompts 05, 07, 09, 11
- **Reference implementation:** `src/engine/diceBag.ts` and `tests/engine/diceBag.test.ts`, `tests/engine/classes.test.ts` ("draws immutable Die instances…")
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 11)
- **Requirements:** FR-3.1, FR-3.5, FR-11.2, FR-11.4, FR-1.4, NFR-1.2

### MANDATORY: Sandwich Requirement
- **Start:** `DiceBag` takes its size from `GameConfig` and its randomness only from the injected `Rng` (no `Math.random`, no own `SeededRandom`).
- **End:** `pnpm test` 100 % green, golden master unchanged, `check:classes` ≥ 18.

### 1. Capability Specification
- **Adds:** `src/model/DiceBag.ts`.
- **Changes:** `draw(n)` additionally rejects a negative or non-integer `n` with `GameError` kind `invalidArgument` (the reference silently returns `[]` for `splice(0, -1)`).
- **Unchanged:** `emptyBag` when `n > remainingCount`; front-draw / back-return policy; `contents()` copy; the method name `return` (called by `Game` at refresh, recast and forfeit).

### 2. Implementation Instructions
```typescript
// src/model/DiceBag.ts — imports ./GameConfig (type), ./Die, ./SeededRandom, ./GameError
/** The run's dice bag; the sole owner of dice-randomness consumption order. */
export class DiceBag {
  /** Remaining dice; index 0 is the next die drawn. */
  #dice: Die[]
  /**
   * Builds copiesPerDie × 5 colors × 6 values dice and shuffles them once.
   * @param config run parameters (only copiesPerDie is read)
   * @param rng injected stream — Game passes `new SeededRandom(config.seed).next`
   */
  constructor(config: GameConfig, rng: Rng)
  /** Dice left in the bag. */
  get remainingCount(): number
  /** Copy of the remaining dice in draw order (tests/debug UIs). */
  contents(): Die[]
  /** Removes and returns the first n dice.
   *  @throws GameError emptyBag if n > remainingCount
   *  @throws GameError invalidArgument if n is negative or not an integer */
  draw(n: number): Die[]
  /** Appends dice to the back (unselected draft dice at refresh/recast/forfeit). */
  return(dice: readonly Die[]): void
}
```

**Behaviour rules (copy from `engine/diceBag.ts`):**
1. Build: `for color of DIE_COLORS` → `for value = Die.MIN_VALUE..Die.MAX_VALUE` → `for copy < config.copiesPerDie` → `push(new Die(color, value))`. Exactly this nesting.
2. Shuffle once: `this.#dice = SeededRandom.shuffled(all, rng)` (Fisher–Yates, 89 rng calls for 90 dice).
3. `draw`: validate `n` (invalidArgument first, then emptyBag), then `this.#dice.splice(0, n)`. On a throw the bag is unchanged (NFR-2.1).
4. `return`: `this.#dice.push(...dice)`; returned dice become drawable again after the current contents.
5. Accept the `GameConfig` **type** (`import type`) — the bag does not construct configs.
6. TSDoc on the class, `#dice`, constructor, getter and both methods, with `@throws`.
7. **Shim:** `src/engine/diceBag.ts` → `export { DiceBag } from '../model/DiceBag'`.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/diceBag.test.ts tests/engine/classes.test.ts tests/engine/game.test.ts
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "feat(model): inc 23 DiceBag" && git tag inc-23-green
```
- [ ] `new DiceBag(createGameConfig(42), mulberry32(42)).draw(5)` equals purple 4, yellow 4, blue 5, green 1, purple 6
- [ ] Seed 3 (the golden-master seed) first five: blue 2, yellow 5, red 5, red 2, blue 6
- [ ] `remainingCount` 90 → `draw(10)` → 80; `draw(85)` then `draw(6)` throws `GameError` kind `emptyBag`
- [ ] `draw(-1)` and `draw(1.5)` throw `GameError` kind `invalidArgument`
- [ ] typecheck 0; lint 0/0; unit 100 %; golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 18

---

**CRITICAL: DiceBag builds 90 dice in DIE_COLORS × value × copy order, shuffles once with the injected rng, draws from the front, returns to the back and throws GameError emptyBag / invalidArgument; golden master stays 5,5,31,16,2,7,53,37 / 156.**
