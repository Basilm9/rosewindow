# Prompt 28: PlacementValidator Tests

**CRITICAL: Write `tests/model/PlacementValidator.test.ts` with one test per placement law (six), one precedence test for each of the 11 law pairs (of all 15) that can occur together, a comment naming the 4 pairs that cannot and why, the `outOfBounds` caller-defect cases, and branch coverage of every law method. Port EVERY test of `tests/engine/placementValidator.test.ts` and the validator case of `classes.test.ts`; none may be dropped.**

---

### INCREMENT 28: PlacementValidator unit tests
- **Status:** Standard
- **Dependencies:** Prompts 05, 11, 15, 17, 21, 27
- **Reference implementation:** `tests/engine/placementValidator.test.ts`, `tests/engine/classes.test.ts` ("reuses a validator without retaining a previous board or rejection"), fixture `tests/helpers/board.ts` (`parseGrid`)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 13)
- **Requirements:** FR-4.2–FR-4.9, FR-4.12, NFR-2.2, NFR-2.4

### MANDATORY: Sandwich Requirement
- **Start:** Header comment names the criterion: **branch (edge) coverage** of `findViolation` — the true and false edge of the bounds check and of each of the six law checks — and lists every case below.
- **End:** All tests pass; with coverage available, `PlacementValidator.ts` shows 100 % branches.

### 1. Capability Specification
Tests only: `tests/model/PlacementValidator.test.ts`; imports `PlacementValidator`, type `PlacementCheck` from `../../src/model/PlacementValidator`, `WindowPattern` (for `parseConstraints`), `Die`, `GameError`, `PlacementError` from `src/model`; `parseGrid` from `../helpers/board`.

### 2. Implementation Instructions
Fixture factory — a NEW validator and check per test:
```typescript
const EMPTY_4 = ['.. .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']
const check = (o: Partial<PlacementCheck> = {}): PlacementCheck => {
  const die = o.die ?? new Die('red', 3)
  return { grid: parseGrid(EMPTY_4), constraints: WindowPattern.parseConstraints(['....','....','....','....']),
           pool: [die], die, target: { row: 0, col: 0 }, ...o }
}
const find = (o?: Partial<PlacementCheck>) => new PlacementValidator().findViolation(check(o))
```

**One test per law (true edge) — expected `kind`:**
| Law | Input | Expected |
| --- | --- | --- |
| cellOccupied (FR-4.2) | grid `R2` at {0,0} | `'cellOccupied'` |
| dieNotInPool (FR-4.3) | pool `[blue5]` | `'dieNotInPool'` |
| constraintMismatch color (FR-4.4) | demand `Y` at {0,0} | `toEqual({kind:'constraintMismatch', expected:{kind:'color', color:'yellow'}})` |
| constraintMismatch value (FR-4.5) | demand `4` | `expected: {kind:'value', value:4}` |
| adjacency color / value / multiple (FR-4.6, FR-4.12) | `R5` at {0,1}; `B3` at {0,1}; red 1 with `Y1` {0,1}, `B1` {0,2}, `Y1` {1,0} | kind; for multiple `offendingNeighbors` `toEqual([{row:1,col:0},{row:0,col:1}])` |
| illegalFirstPlacement (FR-4.7) | `it.each` the 4 interior cells of a 4×4; 5×5 {2,2} | `'illegalFirstPlacement'` |
| disconnectedPlacement (FR-4.8) | `R5` at {0,0}, target {3,3}; `B3` at {3,3}, target {0,0} | `'disconnectedPlacement'` |

**False edges (legal → `null`):** legal first placement on {0,0}; pool membership by color+value with a plain `{color:'red', value:3}`; color demand with any value (`yellow 6` on `Y`); diagonal neighbour `R5` at {1,1} (no adjacency, gives connectivity); diagonal same-colour `R2`; 5×5 border first placement {2,0}; `it.each` the 12 border cells of an empty 4×4 (replaces the reference nested loop with `continue`).

**Precedence (FR-4.9) — pair plan.** The six laws form C(6,2) = 15 pairs. 11 can occur together and each gets exactly one test whose input breaks BOTH laws of the pair (and no law earlier than the pair's first); the expected result is always the earlier law. Defaults unless stated: empty 4×4, open demands, die red 3, pool `[die]`, target {0,0}.
| # | Pair (earlier wins) | Constructed to violate both | Expected |
| --- | --- | --- | --- |
| P1 | cellOccupied > dieNotInPool (ported) | `R2` at {0,0}, pool `[blue5]` | `'cellOccupied'` |
| P2 | cellOccupied > constraintMismatch | `R2` at {0,0}, demand `Y` at {0,0} | `'cellOccupied'` |
| P3 | cellOccupied > adjacencyViolation | `R2` at {0,0}, `R5` at {0,1} | `'cellOccupied'` |
| P4 | cellOccupied > disconnectedPlacement | `R2` at {0,0} only (no die among the target's 8 neighbours) | `'cellOccupied'` |
| P5 | dieNotInPool > constraintMismatch (ported) | demand `Y` at {0,0}, pool `[blue5]` | `'dieNotInPool'` |
| P6 | dieNotInPool > adjacencyViolation | `R5` at {0,1}, pool `[blue5]` | `'dieNotInPool'` |
| P7 | dieNotInPool > illegalFirstPlacement | empty grid, target {1,1}, pool `[blue5]` | `'dieNotInPool'` |
| P8 | dieNotInPool > disconnectedPlacement | `B5` at {3,3}, pool `[blue5]` | `'dieNotInPool'` |
| P9 | constraintMismatch > adjacencyViolation (ported) | demand `Y` at {0,0}, `Y1` at {0,1}, die red 1 | `'constraintMismatch'` |
| P10 | constraintMismatch > illegalFirstPlacement (ported) | 5×5, demand `Y` at {2,2}, target {2,2} | `'constraintMismatch'` |
| P11 | constraintMismatch > disconnectedPlacement | demand `Y` at {0,0}, `B5` at {3,3} | `'constraintMismatch'` |
| — | outOfBounds before every law | target {4,0} with an occupied grid and empty pool | `toThrow(GameError)` |

The other 4 pairs cannot occur together. Put this comment above the precedence `describe` in the test file, listing each with its reason:
```typescript
// Precedence pairs that cannot occur together (15 pairs − 11 tested = 4):
// - cellOccupied × illegalFirstPlacement: illegalFirst needs an empty window; an occupied target means it is not empty.
// - adjacencyViolation × illegalFirstPlacement: an offending orthogonal neighbour means the window is not empty.
// - adjacencyViolation × disconnectedPlacement: an orthogonal neighbour already connects the die.
// - illegalFirstPlacement × disconnectedPlacement: illegalFirst applies only to an empty window, disconnected only to a non-empty one.
```

**Error kinds raised:** six `PlacementViolation` kinds via `assertValid` → `expect(() => v.assertValid(check(o))).toThrow(PlacementError)` once per kind (`it.each` over the six law inputs above); `outOfBounds` → `it.each([{row:4,col:0}, {row:0.5,col:0}, {row:Number.NaN,col:0}, {row:Number.POSITIVE_INFINITY,col:0}])` with `toThrow(GameError)` and `toThrow(/outside the grid/)`, plus one test that the thrown error is `not.toBeInstanceOf(PlacementError)` (NFR-2.4).

**Other cases:** `assertValid` silent on a legal check; message `/printed demand/` for a 2×2 `['R.','..']` mismatch then `not.toThrow()` at {0,1} with the same validator (statelessness, from `classes.test.ts`); inputs unchanged — `grid` and `pool` `toEqual` their pre-call snapshots after a rejection (NFR-2.1); `PlacementValidator.isOnBorderRing({row:1,col:1}, 4) === false`, `countPlaced(parseGrid(['R1 ..', '.. B2'])) === 2`.

**Ported (none dropped):** all 18 cases of "individual laws", the 4 "documented precedence" cases (P1, P5, P9, P10), and the 4 `assertPlacementValid` cases (the `try/catch` + `expect.unreachable` case becomes `toThrow(PlacementError)` plus a `violation.kind` check through a file-level `catchError` helper).

**JUnit-style rules:** fresh validator and check per test; no `if`/`for`/`try`/`continue` in `it` bodies (tables via `it.each`); compare with literal kinds, positions and constraint objects; exceptions with `toThrow(ErrorClass)`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/PlacementValidator.test.ts
pnpm vitest run --coverage tests/model/PlacementValidator.test.ts   # if @vitest/coverage-v8 is installed: 100 % branches
pnpm typecheck && pnpm lint && pnpm test
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "test(model): inc 28 PlacementValidator tests" && git tag inc-28-green
```
- [ ] ≥ 51 tests (counting `it.each` rows), 100 % pass; criterion comment present
- [ ] One test per law, one `assertValid` throw per violation kind, one per out-of-bounds partition
- [ ] All 11 co-occurring precedence pairs P1–P11 present (one test each, earlier law wins) plus the outOfBounds-first test; the comment lists the 4 pairs that cannot occur together with their reasons (11 + 4 = 15)
- [ ] No control flow in test bodies
- [ ] typecheck 0, lint 0/0, golden master 5,5,31,16,2,7,53,37 / 156, `check:classes` ≥ 18

---

**CRITICAL: Each of the six laws, all 11 precedence pairs that can occur together (the other 4 of the 15 documented as impossible), the outOfBounds caller defect and statelessness are tested with fresh fixtures and literal expectations, and every reference validator test is ported; golden master stays 5,5,31,16,2,7,53,37 / 156.**
