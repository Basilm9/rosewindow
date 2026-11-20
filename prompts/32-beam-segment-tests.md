# Prompt 32: BeamSegment Tests

**CRITICAL: Write `tests/model/BeamSegment.test.ts` using input-domain partitioning over (die present/absent × multiplier 1 / middle / cap) and port the reference "segment shape" case; all assertions compare against precomputed constants.**

---

### INCREMENT 32: BeamSegment unit tests
- **Status:** Standard
- **Dependencies:** Prompt 31
- **Reference implementation:** `tests/engine/beamTracer.test.ts` → `describe('traceBeam — segment shape')`
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4, `SRS_rev1.4.txt` §3.5
- **Requirements:** FR-5.3, FR-5.5

### MANDATORY: Sandwich Requirement
- **Start:** The file begins with the test-design criterion comment and the case list.
- **End:** All tests pass; golden master unchanged; class count **20**.

### 1. Capability Specification
Vitest suite for `BeamSegment`. No production change. The reference segment-shape case ("records die and zero points for empty cells on every segment") is ported at the class level here and stays in place at the tracer level (prompt 36 ports it again over a real trace).

### 2. Implementation Instructions
```typescript
/**
 * Test-design criterion: INPUT-DOMAIN PARTITIONING of the constructor inputs.
 *   die:        {null} | {value 1} | {value 6}
 *   multiplier: {1} | {3 (interior)} | {5 (default cap)}
 * Cases (expected points precomputed):
 *  P1 null die, m=1 -> 0          P2 null die, m=5 -> 0
 *  P3 R1, m=1 -> 1                P4 B2, m=3 -> 6
 *  P5 P6, m=5 -> 30               P6 Y6, m=1 -> 6
 *  S1 struck is false for null die, true otherwise
 *  K1 direction stored is the entry direction passed in (pre-refraction)
 *  K2 position is copied: mutating the source object does not change the segment
 *  F1 instance is frozen (Object.isFrozen)
 *  D1 toData() equals { position:{row:0,col:1}, direction:'east', die:{color:'blue',value:2}, points:2 }
 *  R1 ported: "records die and zero points for empty cells" (null die at every multiplier 1..5)
 * Error kinds: none (BeamSegment raises no exception).
 */
```

**Rules (course JUnit style, MANDATORY):**
- New fixture per test: build dice with `new Die('blue', 2)` from the model (prompt 11).
- **No control flow** in a test body: use `it.each` tables, e.g.

```typescript
it.each([
  [null, 1, 0], [null, 5, 0],
  [new Die('red', 1), 1, 1], [new Die('blue', 2), 3, 6],
  [new Die('purple', 6), 5, 30], [new Die('yellow', 6), 1, 6],
])('points for die %o at multiplier %i is %i', (die, multiplier, expected) => {
  const segment = new BeamSegment({ row: 0, col: 1 }, Direction.EAST, die, multiplier)
  expect(segment.points).toBe(expected)
})
```
- R1 becomes `it.each([1, 2, 3, 4, 5])` with `expect(seg.die).toBeNull(); expect(seg.points).toBe(0)`.
- One logical assertion per test where practical; name each test after its case ID.
- `Direction.EAST` stands for whatever static instance name prompt 13 created.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/BeamSegment.test.ts
pnpm typecheck && pnpm lint && pnpm test
git add tests/model && git commit -m "test(model): inc 32 BeamSegment tests" && git tag inc-32-green
```
- [ ] Criterion comment lists P1–R1
- [ ] ≥ 14 test executions (table rows count), 100 % pass
- [ ] No `if`/`for`/`while` in any `it`
- [ ] Golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 20; lint 0/0

---

**CRITICAL: BeamSegment tests partition die × multiplier, compare to precomputed points, port the reference shape case, and keep the golden master at 5,5,31,16,2,7,53,37 / 156.**
