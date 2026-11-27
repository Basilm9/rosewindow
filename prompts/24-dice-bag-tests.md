# Prompt 24: DiceBag Tests

**CRITICAL: Write `tests/model/DiceBag.test.ts` that pins the 90-die composition, the seeded draw order against PRECOMPUTED dice, conservation across draw/return, and one test per error kind (`emptyBag`, `invalidArgument`) with the bag unchanged after each rejection. Port every test of `tests/engine/diceBag.test.ts` and the bag part of the Die case in `classes.test.ts`.**

---

### INCREMENT 24: DiceBag unit tests
- **Status:** Standard
- **Dependencies:** Prompts 05, 07, 09, 11, 23
- **Reference implementation:** `tests/engine/diceBag.test.ts`; `tests/engine/classes.test.ts` ("draws immutable Die instances…")
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 11)
- **Requirements:** FR-3.5, FR-11.2, FR-1.4, NFR-1.2, NFR-2.1

### MANDATORY: Sandwich Requirement
- **Start:** Header comment names the criterion: **input-domain partitioning** of `draw(n)` — `n = 0`, `1 ≤ n ≤ remaining`, `n = remaining`, `n > remaining`, `n < 0`, non-integer — plus a **state partition** (full bag, partly drawn, empty, after return).
- **End:** All tests pass; legacy `diceBag.test.ts` untouched and green.

### 1. Capability Specification
Tests only: `tests/model/DiceBag.test.ts`; imports `DiceBag` from `../../src/model/DiceBag`, `createGameConfig`, `GameConfig` from `../../src/model/GameConfig`, `SeededRandom`, `mulberry32` from `../../src/model/SeededRandom`, `Die`, `DIE_COLORS` from `../../src/model/Die`, `GameError` from `../../src/model/GameError`.

### 2. Implementation Instructions
Header comment:
```typescript
/**
 * Criterion: input-domain partitioning of draw(n) × bag state.
 * n: 0 | 5 | remaining | remaining+1 | -1 | 1.5
 * state: full (90) | partly drawn | empty (0) | refilled by return()
 */
```
Factory and precomputed constants (from the reference build + mulberry32):
```typescript
const bag = (seed: number) => new DiceBag(createGameConfig(seed), mulberry32(seed))
const key = (d: { color: string; value: number }) => `${d.color}${d.value}`
const SEED42_FIRST5 = ['purple4', 'yellow4', 'blue5', 'green1', 'purple6']
const SEED3_FIRST5  = ['blue2', 'yellow5', 'red5', 'red2', 'blue6']
const SEED7_FIRST5  = ['yellow3', 'yellow2', 'blue1', 'yellow5', 'blue5']
```

**Cases:**
| # | Case | Expected |
| --- | --- | --- |
| 1 | full bag | `remainingCount === 90` |
| 2 | composition | counts per `key` over `contents()`: 30 distinct keys, each count 3 (build the histogram with `reduce`, no loop) |
| 3 | colors | `new Set(bag(42).contents().map(d => d.color))` equals `new Set(DIE_COLORS)` |
| 4 | seed 42 draw | `bag(42).draw(5).map(key)` equals `SEED42_FIRST5` |
| 5 | golden seed 3 draw | `bag(3).draw(5).map(key)` equals `SEED3_FIRST5` |
| 6 | seed 7 draw | equals `SEED7_FIRST5` |
| 7 | determinism | `bag(42).draw(5)` `toEqual(bag(42).draw(5))` |
| 8 | seeds differ | `bag(1).draw(5).map(key)` `not.toEqual(bag(2).draw(5).map(key))` |
| 9 | `draw(0)` | `[]`; `remainingCount === 90` |
| 10 | partial | after `draw(10)`: 80; after `draw(80)`: 0 and the 90 drawn dice have the same histogram as case 2 |
| 11 | return to back | `draw(89)`, `last = draw(1)`, `return(last)`, `draw(1)` `toEqual(last)` |
| 12 | return order | from a fresh bag: `d = draw(2)`; `return(d)`; `contents().slice(-2)` `toEqual(d)` |
| 13 | instances | `bag(3).draw(1)[0]` is `instanceof Die` and `Object.isFrozen` |
| 14 | JSON equality | `Die.equals(die, JSON.parse(JSON.stringify(die)))` is `true` |
| 15 | uses only the injected rng | `new DiceBag(new GameConfig(3), new SeededRandom(3).next).draw(5).map(key)` equals `SEED3_FIRST5` |
| 16 | contents is a copy | `b.contents().pop()` leaves `remainingCount === 90` |
| 17 | `emptyBag` | `draw(85)` then `expect(() => b.draw(6)).toThrow(GameError)` and `.toThrow(/cannot satisfy the draw/)` |
| 18 | unchanged after emptyBag | after case-17 throw, `remainingCount === 5` |
| 19–20 | `it.each([-1, 1.5])` | `expect(() => bag(9).draw(n)).toThrow(GameError)` and `.toThrow(/invalid argument/)` |
| 21 | unchanged after invalidArgument | `remainingCount === 90` |

Error kinds raised by `DiceBag`: `emptyBag` (17–18), `invalidArgument` (19–21).

**Ported (none dropped):** "starts with 90 dice" → 1–3; "draws deterministically" → 7; "different seeds" → 8; "decrements remaining count…" → 10; "throws the emptyBag violation" → 17 (the reference `try/catch` + `expect.unreachable` becomes `toThrow`); "returned dice go to the back" → 11; `classes.test.ts` bag/Die part → 13–15.

**JUnit-style rules:** fresh bag per test; no `if`/`for`/`try` in test bodies; compare against the constants above; exceptions with `toThrow(GameError)`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/DiceBag.test.ts
pnpm typecheck && pnpm lint && pnpm test
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "test(model): inc 24 DiceBag tests" && git tag inc-24-green
```
- [ ] ≥ 21 tests, 100 % pass; criterion comment present
- [ ] The three precomputed draw constants appear literally
- [ ] No control flow in test bodies
- [ ] typecheck 0, lint 0/0, golden master 5,5,31,16,2,7,53,37 / 156, `check:classes` ≥ 18

---

**CRITICAL: The 90-die composition, the seeded draw order (seed 3 starts blue2, yellow5, red5, red2, blue6), draw/return conservation and both error kinds are pinned; golden master stays 5,5,31,16,2,7,53,37 / 156.**
