# Prompt 42: ScoreReport Tests

**CRITICAL: Write `tests/model/ScoreReport.test.ts` verifying that `total` always equals beam total plus the itemized lines (FR-8.3), that the report is immutable and has exactly four fields, with expected values precomputed from the reference `calculateScore` and golden-report cases.**

---

### INCREMENT 42: ScoreReport unit tests
- **Status:** Standard
- **Dependencies:** Prompt 41
- **Reference implementation:** `tests/engine/scoreCalculator.test.ts` (`calculateScore` case: lines 4,5,0,1, beam 100 → total 110 gold) and `tests/engine/game.test.ts` (golden report 10,4,7,9, beam 156 → 186 gold)
- **Context to attach:** `SRS_rev1.4.txt` §3.8
- **Requirements:** FR-8.2, FR-8.3

### MANDATORY: Sandwich Requirement
- **Start:** Criterion comment at the top; reports are built directly with `new ScoreReport(lines, beamTotal, tier)`.
- **End:** 100 % pass; golden master unchanged; class count **24**.

### 1. Capability Specification
Adds the ScoreReport suite. Tier selection itself is tested in prompt 44 (ScoreCalculator).

### 2. Implementation Instructions
```typescript
/**
 * Test-design criterion: INPUT-DOMAIN PARTITIONING of the constructor —
 *   lines: all zero | mixed | golden;  beamTotal: 0 | positive —
 * plus BRANCH COVERAGE of lineFor (found / not found).
 * Cases (precomputed):
 *  T1 zero lines [0,0,0,0], beam 0          -> total 0,   objectiveTotal 0
 *  T2 reference calculateScore lines [4,5,0,1], beam 100 -> total 110, objectiveTotal 10
 *  T3 golden lines [10,4,7,9], beam 156     -> total 186, objectiveTotal 30
 *  T4 lines [0,0,0,0], beam 156             -> total 156 (beam only)
 *  G1 golden report deep-equals the literal object from game.test.ts (ported shape)
 *  K1 Object.keys(report) equals ['lines','beamTotal','total','tier']
 *  F1 report, lines array and each line are frozen
 *  C1 mutating the source lines array after construction does not change report.lines
 *  L1 lineFor('patron-blue') on golden -> { objectiveId:'patron-blue', name:'Patron of Blue', points:9 }
 *  L2 lineFor('nope') -> null
 *  O1 lines keep given order (three publics then private)
 * Error kinds: none (ScoreReport raises no exception).
 */
```

**Fixtures (outside tests, as factories):**
```typescript
const GOLDEN_LINES = (): ScoreLine[] => [
  { objectiveId: 'column-color-variety', name: 'Column Color Variety', points: 10 },
  { objectiveId: 'row-value-variety', name: 'Row Value Variety', points: 4 },
  { objectiveId: 'even-values', name: 'Even Values', points: 7 },
  { objectiveId: 'patron-blue', name: 'Patron of Blue', points: 9 },
]
const GOLDEN_REPORT = { lines: GOLDEN_LINES(), beamTotal: 156, total: 186, tier: 'gold' } as const
```

**JUnit-style rules (MANDATORY):**
- New `ScoreReport` per test; T1–T4 as one `it.each` table `[lines, beam, expectedTotal]`.
- No control flow inside tests; no recomputation of sums in assertions (literals only).
- F1 uses `expect(Object.isFrozen(report.lines)).toBe(true)` and `expect(() => (report.lines as ScoreLine[]).push(x)).toThrow(TypeError)`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/ScoreReport.test.ts
pnpm typecheck && pnpm lint && pnpm test
git add tests/model && git commit -m "test(model): inc 42 ScoreReport tests" && git tag inc-42-green
```
- [ ] Criterion comment present; ≥ 11 tests, 100 % pass
- [ ] T2 and G1 values match the reference suites (110, 186)
- [ ] Golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 24; lint 0/0

---

**CRITICAL: ScoreReport tests prove total = beam + lines with literal values (110, 186) and exactly four fields; golden master 5,5,31,16,2,7,53,37 / 156.**
