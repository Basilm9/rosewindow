# Prompt 09: SeededRandom

**CRITICAL: Move `SeededRandom` (mulberry32) and the Fisher–Yates `shuffled`/`sample` helpers into `src/model/SeededRandom.ts` as the SOLE randomness source of the model (NFR-1.2). The stream must be bit-identical: `new SeededRandom(3).next()` returns `0.7202267837710679`, or every seeded run and the golden master change.**

---

### INCREMENT 09: Single seeded randomness source
- **Status:** Standard
- **Dependencies:** Prompts 05, 07
- **Reference implementation:** `src/engine/rng.ts`, `src/engine/sample.ts` and `tests/engine/rng.test.ts`, `tests/engine/classes.test.ts` (second test)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 2), §5
- **Requirements:** FR-1.4, FR-1.6, NFR-1.1, NFR-1.2

### MANDATORY: Sandwich Requirement
- **Start:** No model file may call `Math.random()`; all randomness flows from one `SeededRandom` per run.
- **End:** `pnpm test` 100 % green, golden master unchanged, `check:classes` ≥ 15.

### 1. Capability Specification
- **Adds:** the `SeededRandom` class and static/instance `shuffled` and `sample` to the file Prompt 07 created (which already holds `normalizeSeed`).
- **Changes:** `sample` with `count > items.length` (or a negative / non-integer count) throws `GameError({ kind: 'invalidArgument', detail })` instead of `throw new Error(...)` (`sample.ts` line 20).
- **Unchanged:** the mulberry32 arithmetic, the shuffle loop and the consumption order. `Game` constructs one `SeededRandom(config.seed)` and passes its bound `next` to `DiceBag`, then `offerPatterns`, `dealObjectives`, entry sampling — in that order; do not reorder.

### 2. Implementation Instructions
```typescript
// src/model/SeededRandom.ts — imports ./GameError only
/** Injected random source returning a number in [0, 1). */
export type Rng = () => number

export function normalizeSeed(seed: number): number        // from Prompt 07

/** mulberry32 with private per-run state; the sole source of game randomness. */
export class SeededRandom {
  /** Normalized seed this stream started from. */
  readonly seed: number
  /** Private mulberry32 state; advanced by every call to `next`. */
  #state: number
  constructor(seed: number)
  /** Bound arrow property so it can be injected as an `Rng`; advances this instance only. */
  readonly next: Rng
  /** Fisher–Yates over a copy using this stream. */
  shuffled<T>(items: readonly T[]): T[]
  /** @throws GameError invalidArgument when count is negative, non-integer or > items.length */
  sample<T>(items: readonly T[], count: number): T[]
  /** Same algorithm for callers that hold only an injected `Rng`. */
  static shuffled<T>(items: readonly T[], rng: Rng): T[]
  /** @throws GameError invalidArgument (see instance `sample`) */
  static sample<T>(items: readonly T[], count: number, rng: Rng): T[]
}
/** Function API kept for existing callers. */
export function mulberry32(seed: number): Rng
```

**Behaviour rules (copy, do not rewrite):**
1. `next`: `a = state | 0; a = (a + 0x6d2b79f5) | 0; state = a; t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296`.
2. `next` must be an arrow-function **property** (not a prototype method) so `const r = random.next; r()` works detached.
3. `shuffled`: copy input; `for (i = n-1; i > 0; i--) { j = Math.floor(rng() * (i + 1)); swap(i, j) }`; input never mutated. Exactly `n-1` draws.
4. `sample`: validate, then `shuffled(items, rng).slice(0, count)`.
5. Instance methods delegate to the static ones with `this.next`; static methods call `SeededRandom.shuffled` by name (never `this`) so they survive being detached by the shim.
6. TSDoc on class, both fields (including the private `#state`), constructor, every method, with `@throws` on both `sample`s.
7. **Shims:** `src/engine/rng.ts` → `export { SeededRandom, mulberry32, normalizeSeed } from '../model/SeededRandom'; export type { Rng }`. `src/engine/sample.ts` → `export const shuffled = SeededRandom.shuffled` and `export const sample = SeededRandom.sample` (same generic signatures).

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/rng.test.ts tests/engine/classes.test.ts
pnpm vitest run tests/engine/game.test.ts -t "golden master"
grep -rn "Math.random" src/model src/engine     # must print nothing
git commit -am "feat(model): inc 09 SeededRandom" && git tag inc-09-green
```
- [ ] `new SeededRandom(4294967299)` → `seed === 3`; first three `next()` = `0.7202267837710679, 0.03866216051392257, 0.4561921926215291`
- [ ] Two instances with the same seed have independent state
- [ ] `sample([1,2], 3, rng)` throws `GameError` with kind `invalidArgument` (legacy `rng.test.ts` still passes because it only asserts `toThrow()`)
- [ ] typecheck 0; lint 0/0; unit 100 %; golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 15

---

**CRITICAL: SeededRandom is the only randomness in the model, its mulberry32 stream and shuffle are bit-identical to the reference, and sample throws GameError instead of Error; golden master stays 5,5,31,16,2,7,53,37 / 156.**
