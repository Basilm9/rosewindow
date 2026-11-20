# Prompt 18: WindowPattern Tests

**CRITICAL: Write `tests/model/WindowPattern.test.ts` that freezes the six-pattern catalog (ids, order, 4×4 shape, demand counts, the corrected novice-rose description), the deterministic offer for fixed seeds, and gives one test per `malformedPattern` reason plus `outOfBounds` and `unknownPattern`. Port every test of `tests/engine/patterns.test.ts` and the parse part of the constraint case in `classes.test.ts`.**

---

### INCREMENT 18: WindowPattern unit tests
- **Status:** Standard
- **Dependencies:** Prompts 05, 09, 15, 17
- **Reference implementation:** `tests/engine/patterns.test.ts`; `tests/engine/classes.test.ts` (`parseConstraints(['R3.', '...', '...'])`)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 8)
- **Requirements:** FR-1.1, FR-1.2, NFR-1.3

### MANDATORY: Sandwich Requirement
- **Start:** Header comment names the criterion: **branch coverage** of `parseConstraints`/`fromRows` (each character branch and each validation branch) plus **input-domain partitioning** of `constraintAt` positions.
- **End:** All tests pass; legacy `patterns.test.ts` untouched and green.

### 1. Capability Specification
Tests only: `tests/model/WindowPattern.test.ts`; imports `WindowPattern`, `ALL_PATTERNS` from `../../src/model/WindowPattern`, constraint classes from `../../src/model/CellConstraint`, `mulberry32` from `../../src/model/SeededRandom`, `GameError` from `../../src/model/GameError`.

### 2. Implementation Instructions
Header comment:
```typescript
/**
 * Criterion: branch coverage of parsing/validation + partitioning of positions.
 * Branches: '.', digit 1–6, color letter, invalid char ('X', '7', '0');
 *   square ok / not square; row count == gridSize / != gridSize; empty grid.
 * Positions: inside, row < 0, col ≥ size, non-integer.
 */
```

Precomputed constants (from the reference data and mulberry32):
```typescript
const IDS = ['novice-rose','lancet','quatrefoil','tracery','clerestory','rose-majestic']
const DEMANDS = [3, 6, 8, 10, 11, 14]
const OFFER_SEED42 = ['lancet', 'novice-rose']
const OFFER_SEED3 = ['quatrefoil', 'tracery']
```

**Cases:**
| # | Case | Expected |
| --- | --- | --- |
| 1 | catalog ids/order | `ALL_PATTERNS.map(p => p.id)` equals `IDS` |
| 2 | unique names | `new Set(ALL_PATTERNS.map(p => p.name)).size === 6` |
| 3 | 4×4 | `ALL_PATTERNS.map(p => p.constraints.map(r => r.length))` equals six copies of `[4,4,4,4]`; every `gridSize === 4` |
| 4 | density | `ALL_PATTERNS.map(p => p.demandCount)` equals `DEMANDS` (covers "sparsest ≤ 6, densest ≥ 12") |
| 5 | parse branches | `parseConstraints(['R3.', '...', '...'])[0]` instances are `ColorConstraint`, `ValueConstraint`, `OpenConstraint` |
| 6 | frozen | `Object.isFrozen(ALL_PATTERNS[0])`, its `constraints` and `constraints[0]` |
| 7 | 5×5 allowed | `parseConstraints` of five 5-char rows has length 5 |
| 8 | offer seed 42 | `WindowPattern.offer(mulberry32(42)).map(p => p.id)` equals `OFFER_SEED42` |
| 9 | offer seed 3 | equals `OFFER_SEED3` |
| 10 | distinct over seeds 0–49 | `Array.from({length:50}, (_, s) => WindowPattern.offer(mulberry32(s))).filter(([a, b]) => a.id === b.id)` has length 0 |
| 11 | coverage over 200 seeds | set of offered ids over seeds 0–199 has size 6 |
| 12 | `constraintAt({row:0,col:2})` on novice-rose | `toEqual({ kind: 'value', value: 5 })` |
| 13 | `byId('tracery').name` | `'Tracery'` |
| 14–16 | `it.each(['X', '7', '0'])` bad char in `['R.', `${c}.`]` | `toThrow(GameError)` and `toThrow(/malformed window pattern: invalid pattern character/)` |
| 17 | not square `['R..', '...']` | `toThrow(/must be square/)` |
| 18 | wrong row count `fromRows('x','X','', ['....','....','....'])` | `toThrow(/must have 4 rows/)` |
| 19 | empty grid `new WindowPattern('e','E','',[])` | `toThrow(GameError)` |
| 20–22 | `it.each([{row:-1,col:0},{row:0,col:4},{row:0.5,col:0}])` on novice-rose `constraintAt` | `toThrow(GameError)` (kind `outOfBounds`, `/outside the grid/`) |
| 23 | `byId('nope')` | `toThrow(GameError)` and `toThrow(/unknown pattern id: "nope"/)` |
| 24 | corrected novice-rose description | `WindowPattern.byId('novice-rose').description` `toBe('A sparse first commission. Three demands, mostly free panes.')` (matches its `demandCount` of 3) |

Error kinds raised: `malformedPattern` (14–19, one per reason), `outOfBounds` (20–22), `unknownPattern` (23).

**Ported (none dropped):** "contains exactly six patterns" + "unique ids and names" → 1–2; "each pattern is a 4x4 grid" → 3 (loop replaced by `map`); "spans the density range" → 4; `offerPatterns` determinism / distinct / all six → 8–11; `classes.test.ts` parse → 5.

**JUnit-style rules:** fresh objects per test; no `if`/`for`/`try` (use `map`, `filter`, `Array.from`, `it.each`); compare with the constants above; exceptions via `toThrow(GameError)`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/WindowPattern.test.ts
pnpm typecheck && pnpm lint && pnpm test
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "test(model): inc 18 WindowPattern tests" && git tag inc-18-green
```
- [ ] ≥ 24 tests, 100 % pass; criterion comment present; the novice-rose description test (case 24) present
- [ ] One test per malformed reason, plus outOfBounds and unknownPattern
- [ ] No control flow in test bodies
- [ ] typecheck 0, lint 0/0, golden master 5,5,31,16,2,7,53,37 / 156, `check:classes` ≥ 17

---

**CRITICAL: The catalog, the seeded offer and every validation branch are pinned with literal constants and all reference pattern tests are ported; golden master stays 5,5,31,16,2,7,53,37 / 156.**
