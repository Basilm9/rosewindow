# Prompt 20: WindowCell Tests

**CRITICAL: Write `tests/model/WindowCell.test.ts` covering every branch of `WindowCell` (empty / occupied for each method), its immutability and data shape, delegation of `satisfiedBy` to the constraint, and the `cellOccupied` rejection. Import only from `src/model/`.**

---

### INCREMENT 20: WindowCell unit tests
- **Status:** Standard
- **Dependencies:** Prompts 05, 11, 15, 19
- **Reference implementation:** `tests/engine/glassWindow.test.ts` (the `cellAt` assertions — the cell-level part is ported here, the grid part in Prompt 22)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 9)
- **Requirements:** FR-4.1, FR-4.2, NFR-6.1

### MANDATORY: Sandwich Requirement
- **Start:** Header comment names the criterion: **branch (edge) coverage** of each method's control flow — the empty and the occupied branch of `isEmpty`, `withDie`, `cleared`, and the accept/reject branch of `satisfiedBy`.
- **End:** All tests pass; legacy suites untouched and green.

### 1. Capability Specification
Tests only: `tests/model/WindowCell.test.ts`; imports `WindowCell` from `../../src/model/WindowCell`, constraint classes and type `CellConstraint` from `../../src/model/CellConstraint`, `Die` from `../../src/model/Die`, `GameError`, `PlacementError` from `../../src/model/GameError`.

### 2. Implementation Instructions
Header comment:
```typescript
/**
 * Criterion: branch coverage.
 * isEmpty: die null → true | die set → false
 * withDie: empty → new occupied cell | occupied → PlacementError cellOccupied
 * cleared: occupied → new empty cell | empty → new empty cell
 * satisfiedBy: constraint accepts → true | rejects → false (per constraint class)
 */
```

Fixture factory (called inside each test, never shared): 
```typescript
const RED3 = () => new Die('red', 3)
const yellowCell = (): WindowCell => new WindowCell(new ColorConstraint('yellow'))
```

**Cases:**
| # | Case | Expected |
| --- | --- | --- |
| 1 | `new WindowCell(new OpenConstraint())` | `isEmpty === true`, `die === null` |
| 2 | constructor with a die | `isEmpty === false`, `die` `toBe` the passed die |
| 3 | `withDie(RED3())` on open empty cell | result `isEmpty === false`, `result.die` equals `{color:'red', value:3}` |
| 4 | original untouched after `withDie` | original `isEmpty === true` |
| 5 | `withDie` returns a new object | `not.toBe(original)` |
| 6 | constraint carried over | `result.constraint` `toBe(original.constraint)` |
| 7 | occupied → throws | `expect(() => cell.withDie(RED3()).withDie(RED3())).toThrow(PlacementError)` |
| 8 | the throw is in the GameError family | same call `.toThrow(GameError)` and `.toThrow(/already holds a die/)` |
| 9 | `cleared()` on occupied | new cell, `isEmpty === true`, same constraint |
| 10 | `cleared()` on empty | `isEmpty === true`, `not.toBe(original)` |
| 11 | `satisfiedBy` accept | `yellowCell().satisfiedBy(new Die('yellow', 6))` is `true` |
| 12 | `satisfiedBy` reject | `yellowCell().satisfiedBy(RED3())` is `false` |
| 13 | `satisfiedBy` with value demand | `new WindowCell(new ValueConstraint(4)).satisfiedBy(RED3())` is `false` |
| 14 | data shape | `Object.keys(cell)` equals `['constraint','die']`; `toEqual({ constraint: cell.constraint, die: null })` |
| 15 | frozen | `Object.isFrozen(cell)` |
| 16 | declared by interface | `const demand: CellConstraint = new OpenConstraint(); new WindowCell(demand).constraint.kind === 'open'` |

Error kinds raised by `WindowCell`: only `cellOccupied` (cases 7–8).

**Ported:** the `cellAt(...)` `toEqual({ constraint, die })` expectations from `glassWindow.test.ts` → cases 3 and 14 at cell level.

**JUnit-style rules:** fresh cell per test via the factories; no `if`/`for`/`try` in test bodies; compare with literal values; exceptions via `toThrow(PlacementError)` / `toThrow(GameError)`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/WindowCell.test.ts
pnpm typecheck && pnpm lint && pnpm test
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "test(model): inc 20 WindowCell tests" && git tag inc-20-green
```
- [ ] ≥ 16 tests, 100 % pass; criterion comment present
- [ ] Both branches of each method covered (if `@vitest/coverage-v8` is installed: `pnpm vitest run --coverage tests/model/WindowCell.test.ts` shows 100 % branches for `WindowCell.ts`)
- [ ] No control flow in test bodies
- [ ] typecheck 0, lint 0/0, golden master 5,5,31,16,2,7,53,37 / 156, `check:classes` ≥ 18

---

**CRITICAL: Every branch of WindowCell, its immutability and the cellOccupied rejection are tested with fresh fixtures and literal expectations; golden master stays 5,5,31,16,2,7,53,37 / 156.**
