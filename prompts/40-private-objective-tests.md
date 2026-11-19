# Prompt 40: PrivateObjective and Deal Tests

**CRITICAL: Write `tests/model/PrivateObjective.test.ts` covering the patron-colour sum by input-domain partitioning and the seeded deal by fixed-seed constants, porting the `ALL_PRIVATE_OBJECTIVES`, `dealObjectives` and "private objective" reference cases.**

---

### INCREMENT 40: PrivateObjective unit tests
- **Status:** Standard
- **Dependencies:** Prompt 39
- **Reference implementation:** `tests/engine/objectives.test.ts` (`ALL_PRIVATE_OBJECTIVES` 1 case, `dealObjectives` 3 cases), `tests/engine/scoreCalculator.test.ts` (`private objective` 1 case)
- **Context to attach:** `SRS_rev1.4.txt` §3.2, `tests/helpers/board.ts`
- **Requirements:** FR-2.1, FR-2.2, FR-2.5, NFR-1.1

### MANDATORY: Sandwich Requirement
- **Start:** Criterion comment first; seeds come from `new SeededRandom(seed).next` (or `mulberry32`), never `Math.random`.
- **End:** 100 % pass; golden master unchanged; class count **23**.

### 1. Capability Specification
Adds the PrivateObjective/deal suite. No production change.

### 2. Implementation Instructions
```typescript
/**
 * Test-design criterion: INPUT-DOMAIN PARTITIONING of PrivateObjective.score —
 *   patron dice on grid: none | one | several; other colours present: yes | no —
 * and fixed-seed constant checks for dealObjectives (determinism, distinctness).
 * Cases:
 *  S1 no dice of the colour -> 0
 *  S2 one die (R5 only, red patron) -> 5
 *  S3 ported: grid R2 R5 / B3 .. -> red 7, blue 3
 *  S4 empty grid -> 0 for every colour (it.each over the five colours)
 *  N1 naming: new PrivateObjective('green') -> id 'patron-green', name 'Patron of Green'
 *  A1 ported: ALL has 5 entries, one per colour, set equals DIE_COLORS
 *  A2 ALL ids in order: patron-red, patron-yellow, patron-blue, patron-green, patron-purple
 *  D1 ported: same seed (42) twice -> same public ids and same private id
 *  D2 ported: seeds 0..49 each deal 3 distinct publics and a 'private' kind (it.each over a seed list)
 *  D3 ported: over seeds 0..299 all eight publics appear (helper collects ids outside the test)
 *  D4 golden deal: seed 3 game stream -> publics [column-color-variety, row-value-variety,
 *     even-values], private patron-blue (read from new Game(createGameConfig(3)).objectives)
 *  I1 PrivateObjective satisfies Objective (kind 'private', score is a function)
 * Error kinds: none raised by PrivateObjective; dealObjectives cannot reach its GameError path
 *   with the fixed catalogues (documented, not tested).
 */
```

**JUnit-style rules (MANDATORY):**
- Fresh RNG per test; never reuse a `SeededRandom` across tests.
- **No control flow inside a test.** D2 becomes `it.each(Array.from({ length: 50 }, (_, s) => s))`; D3 calls a helper defined above the tests:
```typescript
const publicIdsSeenOver = (seeds: number): ReadonlySet<string> =>
  new Set(Array.from({ length: seeds }, (_, s) => dealObjectives(mulberry32(s)).publics.map(o => o.id)).flat())
it('D3 eventually deals every public objective (ported)', () => {
  expect(publicIdsSeenOver(300).size).toBe(8)
})
```
- Compare with literal constants (`GOLDEN_PUBLIC_IDS = ['column-color-variety','row-value-variety','even-values'] as const`).
- Titles of ported tests keep the reference wording plus `(ported)`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/PrivateObjective.test.ts
pnpm typecheck && pnpm lint && pnpm test
git add tests/model && git commit -m "test(model): inc 40 PrivateObjective tests" && git tag inc-40-green
```
- [ ] 5 reference cases ported; ≥ 12 tests (plus `it.each` rows), 100 % pass
- [ ] D4 golden deal matches the literal constant
- [ ] No control flow inside tests; criterion comment present
- [ ] Golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 23; lint 0/0

---

**CRITICAL: PrivateObjective and the seeded deal are tested against literal constants, all reference cases ported; golden master 5,5,31,16,2,7,53,37 / 156.**
