# Prompt 34: BeamPath Tests

**CRITICAL: Write `tests/model/BeamPath.test.ts` with branch coverage of `totalScore`, `bendCount` and `peakMultiplier` (empty, single, straight, bent paths) against precomputed constants, using hand-built segments — not the tracer.**

---

### INCREMENT 34: BeamPath unit tests
- **Status:** Standard
- **Dependencies:** Prompt 33
- **Reference implementation:** `tests/engine/beamTracer.test.ts` (the `totalScore`/`termination` expectations of the "R1 R1 / B1 R1" orbit: points 1,2,3,4,5 → 15, `exitedGrid`)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4
- **Requirements:** FR-5.11, NFR-6.3

### MANDATORY: Sandwich Requirement
- **Start:** Criterion comment at the top; segments are built directly with `new BeamSegment(...)` so `BeamPath` is tested in isolation.
- **End:** 100 % pass; golden master unchanged; class count **21**.

### 1. Capability Specification
Adds the BeamPath suite. Tracer-produced paths are tested in prompt 36.

### 2. Implementation Instructions
```typescript
/**
 * Test-design criterion: BRANCH (EDGE) COVERAGE of the derived getters —
 * reduce over 0 / 1 / n segments; bendCount's "direction changes" branch taken and not taken;
 * peakMultiplier over empty and non-empty paths.
 * Fixtures (helper `seg(row, col, dir, die, m)` defined OUTSIDE the tests):
 *  EMPTY   = []                                              -> total 0, length 0, bends 0, peak 1
 *  SINGLE  = [ (0,0,E, null, 1) ]                            -> total 0, length 1, bends 0, peak 1
 *  STRAIGHT= [ (0,0,E,null,1), (0,1,E,P4,1), (0,2,E,null,1) ]-> total 4, bends 0, peak 1
 *  ORBIT   = the 2x2 "R1 R1 / B1 R1" path from beamTracer.test.ts:
 *            (1,0,E,B1,1) (0,0,N,R1,2) (0,1,E,R1,3) (1,1,S,R1,4) (1,0,W,B1,5)
 *                                                            -> total 15, length 5, bends 4, peak 5
 * Cases:
 *  T1..T4  totalScore for EMPTY, SINGLE, STRAIGHT, ORBIT (0, 0, 4, 15)
 *  L1      length of ORBIT is 5
 *  B1..B3  bendCount for SINGLE (0), STRAIGHT (0), ORBIT (4)
 *  M1..M2  peakMultiplier for EMPTY (1), ORBIT (5)
 *  N1      termination is stored as given ('cycle' and 'exitedGrid')
 *  I1      segments array is a frozen copy: pushing throws TypeError; the source array is not aliased
 *  D1      toData() of STRAIGHT equals the precomputed plain object (directions as 'east')
 * Error kinds: none (BeamPath raises no exception).
 */
```

**JUnit-style rules (MANDATORY):**
- Build each fixture inside the test or in `beforeEach` — never share a mutated array between tests.
- `it.each` for T1–T4 and B1–B3; no `if`/`for`/`while` inside `it`.
- I1: `expect(() => (path.segments as BeamSegment[]).push(x)).toThrow(TypeError)` — let the exception propagate into `toThrow`.
- Expected values are literals in the file (precomputed above), never recomputed with `reduce` inside the test.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/BeamPath.test.ts
pnpm typecheck && pnpm lint && pnpm test
git add tests/model && git commit -m "test(model): inc 34 BeamPath tests" && git tag inc-34-green
```
- [ ] Criterion comment and fixtures documented
- [ ] ≥ 14 test executions, 100 % pass
- [ ] No control flow inside tests
- [ ] Golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 21; lint 0/0

---

**CRITICAL: BeamPath tests cover empty, single, straight and orbit paths with literal expected totals (0, 0, 4, 15); the golden master stays 5,5,31,16,2,7,53,37 / 156.**
