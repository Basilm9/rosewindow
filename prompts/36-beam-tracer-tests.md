# Prompt 36: BeamTracer Tests

**CRITICAL: Write `tests/model/BeamTracer.test.ts` asserting every path CELL BY CELL (row, col, direction, points), porting all 13 reference beam cases and covering every AGENTS.md mandatory case — value-6 lockout, multiplier cap, cycle guard, immediate exit — plus one test for the `invalidArgument` error (bad entry).**

---

### INCREMENT 36: BeamTracer unit tests
- **Status:** Standard
- **Dependencies:** Prompt 35
- **Reference implementation:** `tests/engine/beamTracer.test.ts` (13 cases), `tests/engine/classes.test.ts` ("keeps beam settings per tracer…"), fixture `tests/helpers/board.ts` (`parseGrid`)
- **Context to attach:** `AGENTS.md` (Testing conventions), `ctxt/RoseWindowReqPrompt.txt` (beam section), `SRS_rev1.4.txt` §3.5
- **Requirements:** FR-5.2–FR-5.9, NFR-1.4, NFR-6.2

### MANDATORY: Sandwich Requirement
- **Start:** Criterion comment first; every expected path is a literal table copied from the reference test (never regenerated from the code under test).
- **End:** 100 % pass for old and new beam suites; golden master unchanged; class count **21**.

### 1. Capability Specification
Ports the beam suite to the model API: `new BeamTracer(cap).trace(parseGrid([...]), EntryPoint.fromData({ position, direction: 'east' }))`. Project each path to plain rows with a helper defined outside the tests:
```typescript
const rows = (p: BeamPath) => p.segments.map(s => [s.position.row, s.position.col, s.direction.name, s.points])
```

### 2. Implementation Instructions
```typescript
/**
 * Test-design criterion: BRANCH (EDGE) COVERAGE of BeamTracer.trace:
 *  bend branch (die && lockout===0 && not straight) T/F; lockout-decrement branch T/F;
 *  exit branch; cycle branch; guard branch (invalid entry).
 * Each SRS "one case per …" is honoured (FR-5.4 per colour, FR-5.7 at V=1, V=6, between).
 * Cases (expected tables copied from tests/engine/beamTracer.test.ts):
 *  X1 empty 4x4 from (0,0,E): 4 straight cells, total 0, exitedGrid          [exit, no-die]
 *  X2 IMMEDIATE EXIT: B2 at (0,1) bends E->N out of the grid: 2 segments, B2 scores 2
 *  C1 red  R2 bends clockwise (E->S); points [0,2,0,0,0], total 2            [FR-5.4 red]
 *  C2 yellow Y1 bends clockwise (new: single Y1 at (0,1), E->S)               [FR-5.4 yellow]
 *  C3 green G2 bends counter-clockwise (new: G2 at (0,1), E->N exit)          [FR-5.4 green]
 *  C4 blue  = X2                                                              [FR-5.4 blue]
 *  C5 purple P4 scores 4, never bends nor bumps multiplier                    [FR-5.4 purple]
 *  O1 SCORE-BEFORE-BEND: R3..B2 case, B2 scores 4 (2 x m2) then bends to m3   [FR-5.5]
 *  K1 VALUE-6 LOCKOUT: R6/Y3 -> Y3 scores 6, not bent, directions E,E,S,S,S, total 12
 *  K2 lockout measured in cells (R3, two empty cells, B2 bends again)         [V between]
 *  K3 value-1 S-curve R1/Y1: [0,1,2,0], total 3                               [V=1]
 *  M1 MULTIPLIER CAP: orbit R1 R1 / B1 R1 from (1,0,E): points 1,2,3,4,5 = 15
 *  M2 custom cap 3 on the same orbit: points 1,2,3,3,3 = 12
 *  M3 five-bend snake: total 15, last bend capped at 5
 *  Y1 CYCLE GUARD golden walk (9 segments, total 59, 'cycle'; repeated (0,0,N) not recorded)
 *  Y2 re-entry with a different direction is allowed (3x3, total 6, exitedGrid)
 *  S1 segment shape: empty grid -> every die null, every points 0 (ported)
 *  P1 tracer keeps its cap and resets state: cap 3 -> 12, default -> 15, cap 3 again -> 12
 *  E1 ERROR invalidArgument: entry (1,1,E) on 4x4 throws GameError (kind 'invalidArgument')
 *  B1 NFR-1.4 bound: segments.length <= 4 * gridSize^2 on the golden walk
 */
```

**JUnit-style rules (MANDATORY):**
- Fresh `BeamTracer` and grid per test; no shared mutable state.
- **No control flow inside a test.** S1 uses `expect(path.segments.every(s => s.die === null && s.points === 0)).toBe(true)`; per-colour cases use `it.each`.
- Expected tables are literals, e.g. golden walk:
```typescript
const GOLDEN_WALK = [
  [1,0,'east',1],[0,0,'north',2],[0,1,'east',9],[1,1,'south',4],[2,1,'south',4],
  [3,1,'south',4],[3,0,'west',30],[2,0,'north',0],[1,0,'north',5],
] as const
expect(rows(path)).toEqual(GOLDEN_WALK); expect(path.totalScore).toBe(59); expect(path.termination).toBe('cycle')
```
- E1: `expect(() => tracer.trace(grid, bad)).toThrow(GameError)` and `expect(() => tracer.trace(grid, bad)).toThrow(/invalid argument: .*not inward/)`; no try/catch.
- For C2/C3 compute the expected table by hand in a comment before freezing it (C2 Y1 at (0,1): `[0,0,E,0],[0,1,E,1],[1,1,S,0],[2,1,S,0],[3,1,S,0]`, total 1; C3 G2: `[0,0,E,0],[0,1,E,2]`, total 2, exitedGrid).
- Keep `tests/engine/beamTracer.test.ts` untouched until prompt 59.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/BeamTracer.test.ts tests/engine/beamTracer.test.ts
pnpm typecheck && pnpm lint && pnpm test
git add tests/model && git commit -m "test(model): inc 36 BeamTracer tests" && git tag inc-36-green
```
- [ ] All 13 reference cases ported (names suffixed `(ported)`); ≥ 20 tests
- [ ] The four AGENTS.md mandatory cases are named `K1`, `M1`, `Y1`, `X2` in their titles
- [ ] One test per error kind (`invalidArgument`)
- [ ] Golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 21; lint 0/0

---

**CRITICAL: Every beam path is asserted cell by cell against literal tables, including value-6 lockout, cap 5, cycle guard and immediate exit; golden master 5,5,31,16,2,7,53,37 / 156.**
