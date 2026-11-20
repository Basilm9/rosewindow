# Prompt 35: BeamTracer

**CRITICAL: Move the beam traversal into `src/model/BeamTracer.ts` returning `BeamPath`/`BeamSegment`/`EntryPoint` instances, preserving the reference rule law exactly — score on entry BEFORE the bend, lockout V−1 cells (empty cells count), multiplier +1 per bend capped at `GameConfig.multiplierCap` (5), stop on exit, stop BEFORE a repeated (cell, direction) pair — so every reference beam test and the golden master (5,5,31,16,2,7,53,37 / 156) stay green.**

---

### INCREMENT 35: BeamTracer (model)
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompts 05, 07, 11, 13, 21, 29, 31, 33
- **Reference implementation:** `src/engine/beamTracer.ts` (`BeamTracer.trace`, `traceBeam`) and `tests/engine/beamTracer.test.ts`, `tests/engine/classes.test.ts` ("keeps beam settings per tracer")
- **Context to attach:** `ctxt/RoseWindowReqPrompt.txt` (beam section), `ctxt/MVC_RoseWindow.md` §4–5, `AGENTS.md` (Testing conventions)
- **Requirements:** FR-5.2–FR-5.9, NFR-1.4, NFR-3.1, NFR-6.2

### MANDATORY: Sandwich Requirement
- **Start:** Port the loop **statement by statement**; do not "improve" ordering. Pure: no fields mutated during `trace`, all traversal state is local.
- **End:** `tests/engine/beamTracer.test.ts` (13 cases) passes through the legacy shim, golden master unchanged, `check:classes` **21**.

### 1. Capability Specification
- **Adds:** `src/model/BeamTracer.ts`. Its guard reuses the `invalidArgument` kind from prompt 05 (`src/model/GameError.ts`) — no new violation kind.
- **Changes:** `src/engine/beamTracer.ts` becomes a shim: legacy interfaces + `traceBeam(grid, legacyEntry, cap)` = `new model.BeamTracer(cap).trace(grid, EntryPoint.fromData(legacyEntry)).toData()`, and a legacy `BeamTracer` wrapper class with the same `trace(grid, plainEntry)` signature (used by `classes.test.ts`). `DEFAULT_MULTIPLIER_CAP` re-exported from the config module.
- **Unchanged:** every path, segment order, point value and termination.

### 2. Implementation Instructions
```typescript
// src/model/BeamTracer.ts
/** Pure, iterative beam traversal (FR-5.2–5.9). Bounded by gridSize² × 4 entries (NFR-1.4). */
export class BeamTracer {
  /** Multiplier ceiling; Game passes GameConfig.multiplierCap (default 5, FR-5.6). */
  readonly multiplierCap: number
  constructor(multiplierCap: number = DEFAULT_MULTIPLIER_CAP)

  /**
   * Traces one beam over a square die grid.
   * @throws {GameError} kind `invalidArgument` (detail `beam entry … is not inward`) — grid empty or not
   *   square, or `!entry.isInwardFor(grid.length)`.
   */
  trace(grid: DieGrid, entry: EntryPoint): BeamPath
}
```
Add `static fromData(d: { position; direction: DirectionName }): EntryPoint` to `EntryPoint` (prompt 29) for the shim; it uses `Direction.fromName` (prompt 13, throws `invalidArgument` for an unknown name).

**Loop, in this exact order (from the reference):**
1. `multiplier = 1`, `lockout = 0`, `visited = { key(entry.position, entry.direction) }`.
2. Record `new BeamSegment(position, direction, die, multiplier)` — **score first** (FR-5.3, FR-5.5).
3. If `die !== null && lockout === 0 && refraction(die.color) !== 'straight'`: turn (`direction.clockwise()` for red/yellow, `.counterClockwise()` for blue/green), `multiplier = min(multiplier + 1, cap)`, `lockout = die.value − 1`. **Else if** `lockout > 0`: `lockout -= 1` (an empty cell or a purple/locked die spends lockout — measured in cells, FR-5.7).
4. Step by `direction.delta`; out of bounds → `termination = 'exitedGrid'` (FR-5.8).
5. If `(next, direction)` is in `visited` → `termination = 'cycle'`, the repeated entry is **not** recorded or scored (FR-5.9). Otherwise add it and continue at 2.

The refraction table (red/yellow clockwise, blue/green counterClockwise, purple straight) comes from the model module that prompt 11/13 created; if it is still in `src/engine/types.ts`, move `REFRACTION_BY_COLOR` into `src/model/` now and re-export it from the old file. TSDoc must document the two ambiguity resolutions (score-before-bend, cycle guard semantics) at `trace`.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/beamTracer.test.ts tests/engine/classes.test.ts
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "feat(model): inc 35 BeamTracer" && git tag inc-35-green
```
- [ ] Golden walk `R1 R3 B5 B5 / B1 B1 B6 P6 / .. P1 Y4 G6 / R6 Y1 G2 Y1` from (1,0,east): 9 segments, total **59**, `cycle`
- [ ] Orbit `R1 R1 / B1 R1` from (1,0,east): **15** at cap 5, **12** at cap 3
- [ ] `trace` throws `GameError` with `violation.kind === 'invalidArgument'` for entry (1,1,east) on 4×4
- [ ] No `Math.random`, React, DOM or XState import in `src/model/`
- [ ] Golden master 5,5,31,16,2,7,53,37 / 156; class count ≥ 21

### 4. CRITICAL Checkpoint
- **Risk:** a reordering of score/bend/lockout or of the cycle check silently changes round scores; the visible symptom is only the golden master.
- **Failure indicators:** golden walk ≠ 59 or ≠ 9 segments; orbit ≠ 15; round 7 ≠ 53 or round 8 ≠ 37; S-curve `R1/Y1` total ≠ 3; any lockout test showing a bend inside the lockout.
- **Isolation testing protocol:**
  1. Simplified config: run only the four 2×2/3×3 cases (`-t "orbit|re-entering|custom multiplier"`).
  2. Component separately: trace the golden walk and diff segment by segment against the literal table in `beamTracer.test.ts`.
  3. Lockout alone: `R6/Y3` (12) and `R3 … B2` (empty cells consume lockout).
  4. Interaction effects: run the full `game.test.ts`; then compare `roundScores` of seed 3 with 5,5,31,16,2,7,53,37.
- **Rollback procedure:** `git reset --hard inc-34-green`, re-apply the port with the shim only (model class delegating to the old loop), confirm green, then move the loop.

---

**CRITICAL: Score before bend, lockout V−1 cells, cap from GameConfig, exit or stop before a repeated (cell, direction) — unchanged; golden master 5,5,31,16,2,7,53,37 / 156.**
