# Prompt 26: DraftPool Tests

**CRITICAL: Write `tests/model/DraftPool.test.ts` covering every branch of `take` (first match, duplicate dice, absent die), the copy semantics of the constructor and `dice`, `contains`, `putBack`, `clear`, and the `dieNotInPool` rejection — a `PlacementError` — with the pool unchanged. Port all four tests of `tests/engine/draftPool.test.ts`.**

---

### INCREMENT 26: DraftPool unit tests
- **Status:** Standard
- **Dependencies:** Prompts 05, 11, 25
- **Reference implementation:** `tests/engine/draftPool.test.ts`
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 12)
- **Requirements:** FR-3.2, FR-3.4, FR-3.6, NFR-2.1

### MANDATORY: Sandwich Requirement
- **Start:** Header comment names the criterion: **branch (edge) coverage** of `take` (match found / not found) and `contains` (true / false), plus **input-domain partitioning** of the pool content (empty, one die, duplicates).
- **End:** All tests pass; legacy `draftPool.test.ts` untouched and green.

### 1. Capability Specification
Tests only: `tests/model/DraftPool.test.ts`; imports `DraftPool` from `../../src/model/DraftPool`, `Die` from `../../src/model/Die`, `GameError`, `PlacementError` from `../../src/model/GameError`.

### 2. Implementation Instructions
Header comment:
```typescript
/**
 * Criterion: branch coverage of take()/contains() + partitioning of pool content.
 * take: found (first of duplicates) | not found → PlacementError dieNotInPool
 * contains: true | false (same color other value; same value other color)
 * content: empty | single | duplicates [green2, green2]
 */
```
Fixtures (fresh per test):
```typescript
const d = (color: Die['color'], value: number) => new Die(color, value)
```

**Cases:**
| # | Case | Expected |
| --- | --- | --- |
| 1 | `dice` is a copy | `[...pool.dice].pop()`; `pool.dice` has length 1 |
| 2 | constructor copies input | mutate the source array after construction; `pool.size` unchanged |
| 3 | `take` removes the match | pool `[red3, blue5]`, `take(blue5)` → `pool.dice` `toEqual([red3])` |
| 4 | `take` returns the pool's instance | `pool.take({color:'red', value:3})` `toBe(theRed3InThePool)` |
| 5 | first of duplicates | pool `[green2, red1, green2]`, `take(green2)` → remaining `toEqual([red1, green2])` |
| 6 | order preserved | pool `[a, b, c]`, `take(b)` → `[a, c]` |
| 7 | `contains` true | `contains({color:'red', value:3})` |
| 8 | `contains` false — same color, other value | `red4` → `false` |
| 9 | `contains` false — same value, other color | `blue3` → `false` |
| 10 | empty pool | `new DraftPool([]).size === 0`; `contains(red3) === false` |
| 11 | `putBack` appends at end | pool `[red3]`, `putBack([green2, green2])` → `dice` `toEqual([red3, green2, green2])` |
| 12 | `clear` | after `clear()`, `size === 0`; a `dice` copy taken before `clear` still has its dice |
| 13 | absent die → throws | `expect(() => pool.take(d('red', 4))).toThrow(PlacementError)` |
| 14 | message | same call `.toThrow(/draft pool/)` |
| 15 | a placement violation | thrown error `toBeInstanceOf(PlacementError)` and `toBeInstanceOf(GameError)`, `violation` `toEqual({ kind: 'dieNotInPool' })` (captured with a file-level `catchError` helper) |
| 16 | pool unchanged after rejection | after case-13 throw: `pool.dice` `toEqual` the pre-call snapshot (NFR-2.1) |
| 17 | take from empty pool | `expect(() => new DraftPool([]).take(d('red', 3))).toThrow(PlacementError)` |

Error kinds raised by `DraftPool`: only `dieNotInPool`, as a `PlacementError` (cases 13–17).

**Ported (none dropped):** "exposes a copy of its dice" → 1; "take removes the matching die" → 3; "take throws dieNotInPool when the die is absent" → 13–14; "putBack appends dice and clear empties the pool" → 11–12. The reference builds plain `{color, value}` objects; use `new Die(...)` here and keep one plain-object argument (case 4) to prove color+value matching.

**JUnit-style rules:** fresh pool per test; no `if`/`for`/`try` in `it` bodies (file-level helper allowed); compare against literal dice; exceptions via `toThrow(PlacementError)`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/DraftPool.test.ts
pnpm typecheck && pnpm lint && pnpm test
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "test(model): inc 26 DraftPool tests" && git tag inc-26-green
```
- [ ] ≥ 17 tests, 100 % pass; criterion comment present
- [ ] Both branches of `take` and `contains` covered
- [ ] No control flow in test bodies
- [ ] typecheck 0, lint 0/0, golden master 5,5,31,16,2,7,53,37 / 156, `check:classes` ≥ 18

---

**CRITICAL: DraftPool's color+value matching, order, copy semantics and the dieNotInPool rejection as a PlacementError (pool unchanged) are pinned and all reference pool tests ported; golden master stays 5,5,31,16,2,7,53,37 / 156.**
