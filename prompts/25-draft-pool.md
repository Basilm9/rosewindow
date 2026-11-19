# Prompt 25: DraftPool

**CRITICAL: Move `DraftPool` into `src/model/DraftPool.ts`: the dice visible this round, with `take` matching by color AND value (never identity) and throwing `GameError` kind `dieNotInPool` when absent, leaving the pool unchanged (FR-3.4, NFR-2.1). Order of `dice` is the draw order and must be preserved; the auto-player and golden master pick by index.**

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
- **Adds:** `src/model/DraftPool.ts`, plus the read-only query `contains(die)` used by `Game.legalPlacementsFor` and the validator's pool check.
- **Unchanged:** constructor copies its input; `dice` returns a copy; `size`; `take` removes the FIRST match; `putBack` appends; `clear` empties. `take` still throws a plain `GameError` (not `PlacementError`) because selection is a draft action, not a placement law.

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
  /** True when a die with the same color and value is visible. */
  contains(die: DieData): boolean
  /** Removes and returns the first die equal by color+value.
   *  @throws GameError dieNotInPool when none matches (pool unchanged) */
  take(die: DieData): Die
  /** Appends dice (a returned held die, FR-3.3/FR-3.6). */
  putBack(dice: readonly Die[]): void
  /** Empties the pool (end of round; Game returns the dice to the bag first). */
  clear(): void
}
```

**Behaviour rules (from `engine/draftPool.ts`):**
1. `take`: `index = this.#dice.findIndex(c => Die.equals(c, die))`; `-1` → `throw new GameError({ kind: 'dieNotInPool' })`; else `splice(index, 1)[0]`. The returned object is the pool's own `Die` instance, not the argument.
2. `contains` uses the same `Die.equals`; `take` may call it.
3. `putBack` appends at the end (a re-selected die moves to the end of the tray; the reference behaviour, keep it).
4. `clear` replaces the array; the previous `dice` copies held by callers are unaffected.
5. TSDoc on the class, `#dice`, constructor, getters and every method, with `@throws` on `take`.
6. **Shim:** `src/engine/draftPool.ts` → `export { DraftPool } from '../model/DraftPool'`.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/draftPool.test.ts tests/engine/game.test.ts
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "feat(model): inc 25 DraftPool" && git tag inc-25-green
```
- [ ] `new DraftPool([red3, blue5]).take({color:'blue', value:5})` leaves `dice` equal to `[red3]`
- [ ] `take` of an absent die throws `GameError` matching `/draft pool/`, and `size` is unchanged
- [ ] `[...pool.dice].pop()` does not change `pool.size`
- [ ] typecheck 0; lint 0/0; unit 100 %; golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 18

---

**CRITICAL: DraftPool keeps draw order, matches dice by color+value, throws GameError dieNotInPool without changing state and never manages the hand; golden master stays 5,5,31,16,2,7,53,37 / 156.**
