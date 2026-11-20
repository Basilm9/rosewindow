# Prompt 06: GameError and PlacementError Tests

**CRITICAL: Write `tests/model/GameError.test.ts` (Vitest) covering the error hierarchy, the structured `violation` payload and a non-empty, kind-specific message for EVERY violation kind — fourteen kinds, one test each. Import only from `src/model/`.**

---

### INCREMENT 06: GameError unit tests
- **Status:** Standard
- **Dependencies:** Prompt 05
- **Reference implementation:** `tests/engine/errors.test.ts` (port all four tests)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (rows 23–24)
- **Requirements:** NFR-2.2, NFR-2.4, NFR-1.3, FR-4.11

### MANDATORY: Sandwich Requirement
- **Start:** The file opens with a comment naming the test-design criterion: **input-domain partitioning over `violation.kind`** (one partition per kind, plus the class-hierarchy partition).
- **End:** All tests pass; `tests/engine/errors.test.ts` is left untouched and still passes against the shim.

### 1. Capability Specification
Unit tests only; no production code changes. The test file lives in `tests/model/` and imports `GameError`, `PlacementError` from `../../src/model/GameError` and constraint fixtures from `../../src/model/CellConstraint` (until Prompt 15, use a literal `{ kind: 'open', accepts: () => true }`).

### 2. Implementation Instructions
Header comment (required, verbatim structure):
```typescript
/**
 * Test-design criterion: input-domain partitioning on GameViolation.kind.
 * Partitions: hierarchy (PlacementError ⊂ GameError ⊂ Error);
 *   placement kinds: cellOccupied, dieNotInPool, constraintMismatch,
 *     adjacencyViolation, illegalFirstPlacement, disconnectedPlacement;
 *   game kinds: emptyBag, invalidPhase, refreshSpent, legalMovesRemain,
 *     outOfBounds, malformedPattern, unknownPattern, invalidArgument.
 */
```

**Cases (one `it` each; use `it.each` with a precomputed table for the kind→message cases):**

| # | Case | Expected constant |
| --- | --- | --- |
| 1 | `new PlacementError({kind:'cellOccupied'})` | `instanceof PlacementError`, `GameError`, `Error`; `name === 'PlacementError'` |
| 2 | `new GameError({kind:'emptyBag'})` | `name === 'GameError'`; **not** `instanceof PlacementError` |
| 3 | adjacency payload `[{row:0,col:1}]` | `violation` `toEqual({kind:'adjacencyViolation', offendingNeighbors:[{row:0,col:1}]})` |
| 4 | constraintMismatch payload | `violation.expected` is the same object passed in (`toBe`) |
| 5–18 | each of the 14 kinds | `message` equals the precomputed string from Prompt 05 (e.g. `'die is not in the current draft pool'`, `'target {"row":4,"col":0} is outside the grid'`, `'malformed window pattern: bad row'`, `'unknown pattern id: "nope"'`, `'invalid argument: count'`) |
| 19 | thrown from a function | `expect(() => { throw new PlacementError({kind:'dieNotInPool'}) }).toThrow(PlacementError)` and `.toThrow(/draft pool/)` |
| 20 | `outOfBounds` is a caller defect | `expect(() => { throw new GameError({kind:'outOfBounds', target:{row:4,col:0}}) }).toThrow(GameError)`; instance is not a `PlacementError` |

**Ported from `tests/engine/errors.test.ts`:** "PlacementError is a GameError is an Error" → case 1; "carries the structured violation payload" → case 3 (drop the `if` narrowing; compare with `toEqual`); "GameError covers the non-placement family" → `it.each` rows for `emptyBag`, `invalidPhase`; "every violation kind has a human-readable message" → cases 5–18.

**JUnit-style rules (course):**
- Fresh fixture per test (construct errors inside each `it`; no shared mutable state).
- No `if`, `for`, `try/catch` inside a test body; tables go through `it.each`.
- Compare against precomputed constants, never against a recomputed `GameError.describe(...)` call.
- Assert exceptions with `expect(() => …).toThrow(ErrorClass)`, never with `try/catch` + `expect.unreachable`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/GameError.test.ts
pnpm typecheck && pnpm lint && pnpm test
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "test(model): inc 06 GameError tests" && git tag inc-06-green
```
- [ ] ≥ 20 tests, 100 % pass; one test per each of the 14 violation kinds
- [ ] No control flow inside any `it` body (`grep -nE "^\s+(if|for|while|try)\b" tests/model/GameError.test.ts` empty)
- [ ] Criterion comment present at the top
- [ ] typecheck 0, lint 0/0, golden master 5,5,31,16,2,7,53,37 / 156, `check:classes` ≥ 15

---

**CRITICAL: One test per violation kind (14), hierarchy asserted with `toThrow(ErrorClass)`, all reference error tests ported; golden master stays 5,5,31,16,2,7,53,37 / 156.**
