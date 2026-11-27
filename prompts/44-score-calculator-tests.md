# Prompt 44: ScoreCalculator Tests

**CRITICAL: Write `tests/model/ScoreCalculator.test.ts` testing tier boundaries by INPUT-DOMAIN PARTITIONING (each side of 40, 65 and 90 — FR-8.4 "one case per tier boundary"), the itemized calculation, and tier isolation, porting the `tierFor`, `calculateScore` and class-isolation reference cases.**

---

### INCREMENT 44: ScoreCalculator unit tests
- **Status:** Standard
- **Dependencies:** Prompt 43
- **Reference implementation:** `tests/engine/scoreCalculator.test.ts` (`tierFor`, `calculateScore`), `tests/engine/classes.test.ts` ("calculates reports with isolated tier settings and no retained run state")
- **Context to attach:** the SRS Rev 1.4 (attach the file; it is not in the repo) §3.8, `tests/helpers/board.ts`
- **Requirements:** FR-8.1, FR-8.3, FR-8.4

### MANDATORY: Sandwich Requirement
- **Start:** Criterion comment first; partitions and boundary values listed explicitly.
- **End:** 100 % pass; golden master unchanged; class count **24**.

### 1. Capability Specification
Adds the ScoreCalculator suite. No production change.

### 2. Implementation Instructions
```typescript
/**
 * Test-design criterion: INPUT-DOMAIN PARTITIONING of tierFor(total) with PROVISIONAL_TIERS
 * (40/65/90). Partitions: none [0,39], bronze [40,64], silver [65,89], gold [90,∞).
 * Boundary values (one case per side of each boundary, FR-8.4):
 *   0 none | 39 none | 40 bronze | 64 bronze | 65 silver | 89 silver | 90 gold | 500 gold
 * Calculation cases:
 *  C1 ported calculateScore: grid R1 B2 Y3 G4 (row 0), publics odd(2/die), rowColor(5), quorum(3),
 *     private patron-red, beam 100 -> lines [odd 4, rowColor 5, quorum 0, patron-red 1], total 110, gold
 *  C2 four lines, private last (lines.length 4, lines[3].objectiveId 'patron-red')
 *  C3 FR-8.3: report.total === report.beamTotal + 10 (literal objective sum for C1)
 *  C4 empty grid, beam 0, seed-3 objectives -> total 0, tier none
 * Isolation cases (ported from classes.test.ts):
 *  I1 custom tiers {1,2,3}: beam 3 -> total 3, gold; beam 0 -> none
 *  I2 default calculator with the same input (beam 3) -> none
 *  I3 mutating the tiers object after construction does not change results (gold stays at 3)
 *  I4 calling calculate twice with the same input returns equal reports (no retained state)
 * Polymorphism:
 *  P1 a stub Objective { kind:'public', id:'stub', name:'Stub', description:'', score: () => 7 }
 *     placed in the publics tuple contributes a line with 7 points (calculator uses the interface)
 * Error kinds: none (ScoreCalculator raises no exception).
 */
```

**JUnit-style rules (MANDATORY):**
- Fresh `ScoreCalculator` per test.
- Boundary table as `it.each`:
```typescript
it.each([
  [0, 'none'], [39, 'none'], [40, 'bronze'], [64, 'bronze'],
  [65, 'silver'], [89, 'silver'], [90, 'gold'], [500, 'gold'],
] as const)('tierFor(%i) is %s', (total, tier) => {
  expect(new ScoreCalculator(PROVISIONAL_TIERS).tierFor(total)).toBe(tier)
})
```
- No `if`/`for`/`while` inside tests; literal expected values only.
- Build `PublicObjective`/`PrivateObjective` instances via factory functions so each test gets new objects; P1's stub is typed as `Objective` (declare by interface).
- Ported titles keep reference wording plus `(ported)`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/ScoreCalculator.test.ts
pnpm typecheck && pnpm lint && pnpm test
git add tests/model && git commit -m "test(model): inc 44 ScoreCalculator tests" && git tag inc-44-green
```
- [ ] 8 boundary rows + ≥ 9 other tests, 100 % pass
- [ ] Every tier boundary has a case on both sides
- [ ] Criterion comment present; no control flow in tests
- [ ] Golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 24; lint 0/0

---

**CRITICAL: Tier boundaries 40/65/90 are tested on both sides by input-domain partitioning, all reference cases are ported; golden master 5,5,31,16,2,7,53,37 / 156.**
