# Prompt 38: PublicObjective Tests

**CRITICAL: Write `tests/model/PublicObjective.test.ts` with one partitioned block per strategy family (FR-2.4 "one case per objective family"), porting every family case from `scoreCalculator.test.ts` and the catalogue cases from `objectives.test.ts`, all compared to precomputed constants.**

---

### INCREMENT 38: PublicObjective unit tests
- **Status:** Standard
- **Dependencies:** Prompt 37
- **Reference implementation:** `tests/engine/scoreCalculator.test.ts` (valueParity 2, lineDiversity 5, diagonalDiversity 3, colorQuorum 2 cases) and `tests/engine/objectives.test.ts` (`ALL_PUBLIC_OBJECTIVES` 2 cases)
- **Context to attach:** the SRS Rev 1.4 (attach the file; it is not in the repo) §3.2, `tests/helpers/board.ts`
- **Requirements:** FR-2.1, FR-2.4

### MANDATORY: Sandwich Requirement
- **Start:** Criterion comment at the top; grids are built with `parseGrid` from `tests/helpers/board.ts`.
- **End:** 100 % pass; old suites untouched and green; golden master unchanged; class count **22**.

### 1. Capability Specification
Adds the PublicObjective suite. No production change.

### 2. Implementation Instructions
```typescript
/**
 * Test-design criterion: INPUT-DOMAIN PARTITIONING per strategy family (FR-2.4), plus
 * BRANCH COVERAGE of the lineDiversity "incomplete line" skip and the diagonal
 * "same-colour neighbour" test.
 * Partitions and cases (expected values precomputed from the reference suite):
 *  valueParity   V1 mixed row R1 B2 Y3 G4: odd 2, even 2   V2 empty grid: 0
 *  lineDiversity L1 row of 4 distinct colours: 5            L2 row repeating a colour: 0
 *                L3 column axis on 2x2 R1 B1 / Y1 B2: 5     L4 incomplete row: 0
 *                L5 value trait vs colour trait: rowValue 4, rowColor 10
 *  diagonal      D1 2x2 all different: 4    D2 same-colour checkerboard: 0   D3 lone die: 1
 *  colorQuorum   Q1 red 2 + blue 1: 3       Q2 red 2 + blue 2 across grid: 6, colorCount(red) 2
 *  catalogue     A1 ALL has 8 unique ids    A2 covers the 4 families
 *                A3 ids in reference order (literal array of the 8 ids)
 *                A4 points table: [1,1,5,5,4,4,1,3] read from each strategy
 *  interface     I1 every ALL element satisfies Objective (kind 'public', score is a function)
 *                I2 PublicObjective.from(plain).score(grid) equals the class instance score
 * Error kinds: none (PublicObjective raises no exception).
 */
```

**JUnit-style rules (MANDATORY):**
- Build the objective and grid inside each test (`const odd = new PublicObjective('odd','odd','',{ kind:'valueParity', parity:'odd', pointsPerDie:1 })`).
- No `if`/`for`/`while` in any `it`; use `it.each` for A4 and for family tables.
- Expected numbers are literals copied from the reference suite (above), never computed in the test.
- Each ported test keeps the reference title plus `(ported)`.
- Example:
```typescript
it('L5 value trait follows values, not colours (ported)', () => {
  const grid = parseGrid(['R1 B2 Y3 G4', 'R1 B1 Y1 G1', '.. .. .. ..', '.. .. .. ..'])
  expect(ROW_VALUE().score(grid)).toBe(4)
  expect(ROW_COLOR().score(grid)).toBe(10)
})
```
(`ROW_VALUE`/`ROW_COLOR` are factory functions so every test gets a fresh instance.)

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/PublicObjective.test.ts
pnpm typecheck && pnpm lint && pnpm test
git add tests/model && git commit -m "test(model): inc 38 PublicObjective tests" && git tag inc-38-green
```
- [ ] 12 family cases + 2 catalogue cases ported; ≥ 18 tests, 100 % pass
- [ ] Criterion comment present; no control flow in tests
- [ ] Golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 22; lint 0/0

---

**CRITICAL: Each public family is tested by partitions with literal expected points and every reference case is ported; golden master 5,5,31,16,2,7,53,37 / 156.**
