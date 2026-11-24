# Prompt 25: DraftPool

**CRITICAL: Move `DraftPool` into `src/model/DraftPool.ts`: the dice visible this round, with `take` matching by color AND value (never identity) and throwing `PlacementError` kind `dieNotInPool` (a placement violation) when absent, leaving the pool unchanged (FR-3.4, NFR-2.1). Its `contains` check is the ONE pool-membership rule; `PlacementValidator` reuses it. Order of `dice` is the draw order and must be preserved; the auto-player and golden master pick by index.**

---

### INCREMENT 25: Draft pool
- **Status:** Standard
- **Dependencies:** Prompts 05, 11, 23
- **Reference implementation:** `src/engine/draftPool.ts` and `tests/engine/draftPool.test.ts`
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 12)
- **Requirements:** FR-3.1, FR-3.2, FR-3.3, FR-3.4, FR-3.6, NFR-2.1

### MANDATORY: Sandwich Requirement
- **Start:** `DraftPool` only holds and hands out dice; hand management (at most one held die, FR-3.3) stays in `Game`.
- **End:** `pnpm test` 100 % green, golden master unchanged, `check:classes` ≥ 18.

### 1. Capability Specification
- **Adds:** `src/model/DraftPool.ts`, plus the read-only membership check `contains` — static `DraftPool.contains(dice, die)` and the instance form `contains(die)` that delegates to it — used by `Game.legalPlacementsFor` and by `PlacementValidator`'s dieNotInPool law (Prompt 27 calls `DraftPool.contains(check.pool, check.die)`).
- **Changes:** `take` throws `PlacementError({ kind: 'dieNotInPool' })` instead of a plain `GameError`: `dieNotInPool` is one of the six `PlacementViolation` kinds (Prompt 05), so it is raised as a `PlacementError` wherever it occurs. `PlacementError extends GameError`, so the reference `toThrowError(GameError)` and `/draft pool/` assertions still pass.
- **Unchanged:** constructor copies its input; `dice` returns a copy; `size`; `take` removes the FIRST match; `putBack` appends; `clear` empties.

### 2. Implementation Instructions
```typescript
// src/model/DraftPool.ts — imports ./Die and ./GameError only
/** The dice currently visible for selection this round. */
export class DraftPool {
  /** Visible dice in draw order. */
  #dice: Die[]
  /** Copies `dice`; later changes to the caller's array do not affect the pool. */
  constructor(dice: readonly Die[])
  /** Mutation-safe copy of the visible dice, in order. */
  get dice(): readonly Die[]
  /** Number of visible dice. */
  get size(): number
  /** The pool-membership rule: true when `dice` holds a die with the same color and value. */
  static contains(dice: readonly DieData[], die: DieData): boolean
  /** True when a die with the same color and value is visible. */
  contains(die: DieData): boolean
  /** Removes and returns the first die equal by color+value.
   *  @throws PlacementError dieNotInPool when none matches (pool unchanged) */
  take(die: DieData): Die
  /** Appends dice (a returned held die, FR-3.3/FR-3.6). */
  putBack(dice: readonly Die[]): void
  /** Empties the pool (end of round; Game returns the dice to the bag first). */
  clear(): void
}
```

**Behaviour rules (from `engine/draftPool.ts`):**
1. `take`: `index = this.#dice.findIndex(c => Die.equals(c, die))`; `-1` → `throw new PlacementError({ kind: 'dieNotInPool' })`; else `splice(index, 1)[0]`. The returned object is the pool's own `Die` instance, not the argument.
2. `static contains(dice, die)` is `dice.some(c => Die.equals(c, die))`; the instance `contains(die)` returns `DraftPool.contains(this.#dice, die)`; `take` may call it. No other model file re-implements pool membership (the validator calls the static form).
3. `putBack` appends at the end (a re-selected die moves to the end of the tray; the reference behaviour, keep it).
4. `clear` replaces the array; the previous `dice` copies held by callers are unaffected.
5. TSDoc on the class, `#dice`, constructor, getters and every method (both `contains` forms), with `@throws` on `take`.
6. **Shim:** `src/engine/draftPool.ts` → `export { DraftPool } from '../model/DraftPool'`.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/draftPool.test.ts tests/engine/game.test.ts
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "feat(model): inc 25 DraftPool" && git tag inc-25-green
```
- [ ] `new DraftPool([red3, blue5]).take({color:'blue', value:5})` leaves `dice` equal to `[red3]`
- [ ] `take` of an absent die throws `PlacementError` (kind `dieNotInPool`, also `instanceof GameError`) matching `/draft pool/`, and `size` is unchanged
- [ ] `DraftPool.contains([red3], {color:'red', value:3})` is `true` and equals `new DraftPool([red3]).contains(red3)`
- [ ] `[...pool.dice].pop()` does not change `pool.size`
- [ ] typecheck 0; lint 0/0; unit 100 %; golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 18

---

**CRITICAL: DraftPool keeps draw order, matches dice by color+value through its single `contains` rule, throws PlacementError dieNotInPool without changing state and never manages the hand; golden master stays 5,5,31,16,2,7,53,37 / 156.**
