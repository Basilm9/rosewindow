# Prompt 22: GlassWindow Tests

**CRITICAL: Write `tests/model/GlassWindow.test.ts` that pins construction from a pattern, snapshot isolation of `dice`, bounds and occupancy queries, and one test per error kind (`outOfBounds`, `cellOccupied`), including that a rejected `place` leaves the window unchanged (NFR-6.1). Port both tests of `tests/engine/glassWindow.test.ts`.**

---

### INCREMENT 22: GlassWindow unit tests
- **Status:** Standard
- **Dependencies:** Prompts 05, 11, 15, 17, 19, 21
- **Reference implementation:** `tests/engine/glassWindow.test.ts`
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 10)
- **Requirements:** FR-4.1, FR-4.10, NFR-2.4, NFR-6.1

### MANDATORY: Sandwich Requirement
- **Start:** Header comment names the criterion: **input-domain partitioning of positions** (interior, edge, corner, row < 0, row ≥ size, col ≥ size, non-integer) combined with **branch coverage** of `place` (out of bounds / occupied / success).
- **End:** All tests pass; legacy `glassWindow.test.ts` untouched and green.

### 1. Capability Specification
Tests only: `tests/model/GlassWindow.test.ts`; imports `GlassWindow` from `../../src/model/GlassWindow`, `WindowPattern`, `ALL_PATTERNS` from `../../src/model/WindowPattern`, `Die` from `../../src/model/Die`, `WindowCell` from `../../src/model/WindowCell`, `GameError`, `PlacementError` from `../../src/model/GameError`.

### 2. Implementation Instructions
Header comment:
```typescript
/**
 * Criterion: input-domain partitioning of Position + branch coverage of place().
 * Inside: corner {0,0}, edge {0,2}, interior {1,1}, far corner {3,3}.
 * Outside: {-1,0}, {4,0}, {0,4}, {0.5,0}.
 * place(): outside → GameError outOfBounds; occupied → PlacementError; else commit.
 */
```
Fixtures (built inside each test):
```typescript
const novice = () => GlassWindow.fromPattern(ALL_PATTERNS[0]!)   // novice-rose
const tiny = () => GlassWindow.fromPattern(WindowPattern.fromRows('t', 'T', '', ['Y.', '.3'], 2))
```

**Cases:**
| # | Case | Expected |
| --- | --- | --- |
| 1 | fresh novice window | `placedCount === 0`, `isEmpty === true`, `gridSize === 4`, `constraints` `toEqual(ALL_PATTERNS[0].constraints)` |
| 2 | all 16 cells empty | `novice().dice` `toEqual` a literal 4×4 grid of `null` |
| 3 | `cellAt({row:0,col:2})` | `instanceof WindowCell`; `toEqual({ constraint: { kind:'value', value:5 }, die: null })` |
| 4 | place red 3 at {0,0} | `dieAt` equals `{color:'red',value:3}`; `placedCount === 1`; `cellAt` `toEqual({constraint: pattern.constraints[0][0], die})` |
| 5 | snapshot isolation | mutate `w.dice[0][0] = new Die('blue',1)`; `w.dieAt({row:0,col:0})` is `null` |
| 6 | two snapshots are distinct arrays | `w.dice` `not.toBe(w.dice)` |
| 7–10 | `it.each` the four inside positions on `novice()` | `isInside` → `true` |
| 11–14 | `it.each` the four outside positions on `novice()` | `isInside` → `false`; `dieAt` → `null` |
| 15 | `tiny()`: `occupiedPositions()` after placing at {1,1} then {0,0}; `gridSize === 2` | `[{row:0,col:0},{row:1,col:1}]` (row-major) |
| 16 | `remove` | after place + remove at {0,0}: `placedCount === 0` |
| 17–20 | `it.each` outside positions: `place(new Die('red',3), p)` | `toThrow(GameError)` and `toThrow(/outside the grid/)` |
| 21 | `cellAt({row:4,col:0})` | `toThrow(GameError)` |
| 22 | `remove({row:0,col:4})` | `toThrow(GameError)` |
| 23 | occupied | second `place` at {0,0} `toThrow(PlacementError)` |
| 24 | rejected place leaves window unchanged | after case-23 throw: `dice` `toEqual` the snapshot taken before, `placedCount === 1` |
| 25 | out-of-bounds is not a law violation | the error from case 17 is `not.toBeInstanceOf(PlacementError)` (use `expect(() => …).toThrow(GameError)` plus a captured `GameError` via `try`-free helper `catchError(fn)` defined at file level) |

Error kinds raised by `GlassWindow`: `outOfBounds` (17–22, 25) and `cellOccupied` (23–24).

**Ported (none dropped):** "loads the pattern constraints into an empty 4x4 grid" → cases 1–3 (nested loops replaced by literal grids); "places dice immutably-visible and reports occupancy" → case 4.

**JUnit-style rules:** fresh window per test via the factories; no `if`/`for`/`try` inside `it` bodies (a file-level `catchError` helper is allowed); compare with literal grids and positions; exceptions with `toThrow(ErrorClass)`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/GlassWindow.test.ts
pnpm typecheck && pnpm lint && pnpm test
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "test(model): inc 22 GlassWindow tests" && git tag inc-22-green
```
- [ ] ≥ 25 tests, 100 % pass; criterion comment present
- [ ] One test per error kind plus the unchanged-on-rejection case
- [ ] No control flow in test bodies
- [ ] typecheck 0, lint 0/0, golden master 5,5,31,16,2,7,53,37 / 156, `check:classes` ≥ 18

---

**CRITICAL: GlassWindow construction, snapshot isolation, bounds, occupancy and both error kinds (with the window unchanged after a rejection) are pinned and the reference tests ported; golden master stays 5,5,31,16,2,7,53,37 / 156.**
