# Prompt 43: ScoreCalculator

**CRITICAL: Move final scoring into `src/model/ScoreCalculator.ts`: it scores the finished window against the four dealt objectives polymorphically through the `Objective` interface, adds the beam total and awards the tier from a frozen snapshot of `GameConfig.tiers` (bronze 40 / silver 65 / gold 90) — producing the identical golden report (lines 10, 4, 7, 9; beam 156; total 186; gold).**

---

### INCREMENT 43: ScoreCalculator (model)
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompts 07, 37, 39, 41
- **Reference implementation:** `src/engine/scoreCalculator.ts` (`ScoreCalculator`, `tierFor`, `calculateScore`) and `tests/engine/scoreCalculator.test.ts`, `tests/engine/classes.test.ts` ("calculates reports with isolated tier settings")
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 21) and §5, `ctxt/RoseWindowReqPrompt.txt` (End of run)
- **Requirements:** FR-8.1, FR-8.3, FR-8.4, NFR-4.4

### MANDATORY: Sandwich Requirement
- **Start:** No `switch` on objective kind in the calculator — it calls `objective.score(grid)` on each `Objective` (polymorphism); tier thresholds come only from the constructor snapshot.
- **End:** Old score tests and the golden report pass; golden master unchanged; `check:classes` stays **24**.

### 1. Capability Specification
- **Adds:** `src/model/ScoreCalculator.ts`.
- **Changes:** `src/engine/scoreCalculator.ts` becomes a shim: re-exports types; `scorePublicObjective`, `scorePrivateObjective`, `colorCount` delegate to the objective classes (prompts 37/39); `tierFor(total, tiers)` = `new ScoreCalculator(tiers).tierFor(total)`; `calculateScore(input)` first wraps the plain objectives (`publics.map(PublicObjective.from)`, `PrivateObjective.from(privateObjective)`) and then calls `new ScoreCalculator(input.tiers).calculate(…)`, because `tests/engine/scoreCalculator.test.ts` passes plain literals that have no `score` method; its parameter type keeps the plain-data interfaces of `src/engine/objectives.ts`; `export { ScoreCalculator }` from the model.
- **Unchanged:** line order (publics in deal order, then private), totals, tier boundaries (inclusive lower bounds).

### 2. Implementation Instructions
```typescript
// src/model/ScoreCalculator.ts
/** Inputs for final scoring; the grid is the finished window (GlassWindow.dice). */
export interface ScoreInput {
  readonly grid: DieGrid
  readonly objectives: DealtObjectives
  readonly beamTotal: number
}

/** Scores a finished window (FR-8.1); holds no run state between calls. */
export class ScoreCalculator {
  /** Frozen copy of the thresholds (later mutation of the source object has no effect). */
  readonly tiers: TierThresholds
  constructor(tiers: TierThresholds = PROVISIONAL_TIERS)

  /** Itemizes 3 public + 1 private lines, adds beamTotal, awards the tier (FR-8.2–8.4). */
  calculate(input: ScoreInput): ScoreReport

  /** gold if total ≥ gold; else silver if ≥ silver; else bronze if ≥ bronze; else 'none'. */
  tierFor(total: number): Tier
}
```

**Algorithm (from the reference):**
1. `const ordered: readonly Objective[] = [...objectives.publics, objectives.privateObjective]` — declared by the **interface** type.
2. `lines = ordered.map(o => ({ objectiveId: o.id, name: o.name, points: o.score(grid) }))`.
3. `const total = beamTotal + Σ points`; `return new ScoreReport(lines, beamTotal, this.tierFor(total))` (ScoreReport derives the same total).
4. `tierFor` compares with `>=` from gold downwards — boundaries 40/65/90 are inclusive.
5. No exceptions; no `Math.random`; no imports outside `src/model`/`src/mvc`. TSDoc on every member, documenting the inclusive boundaries at `tierFor`.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/scoreCalculator.test.ts tests/engine/classes.test.ts
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "feat(model): inc 43 ScoreCalculator" && git tag inc-43-green
```
- [ ] `tierFor`: 39 → none, 40 → bronze, 64 → bronze, 65 → silver, 89 → silver, 90 → gold
- [ ] Golden report `{ lines: 10, 4, 7, 9; beamTotal 156; total 186; tier 'gold' }`
- [ ] `grep -n "case 'public'\|kind === 'public'" src/model/ScoreCalculator.ts` prints nothing
- [ ] Golden master 5,5,31,16,2,7,53,37 / 156; class count ≥ 24; lint 0/0

### 4. CRITICAL Checkpoint
- **Risk:** reordering the lines, an off-by-one at a tier boundary (`>` instead of `>=`), or tiers read from a shared mutable object would change the final report shown on the results screen (AT-08) while beam scores stay green.
- **Failure indicators:** golden report `toEqual` fails; `tierFor(40)` returns `none`; `classes.test.ts` tier-isolation case fails; private line not last; `o.score is not a function` (the shim passed plain data through unwrapped).
- **Isolation testing protocol:**
  1. Simplified config: `new ScoreCalculator({ bronze: 1, silver: 2, gold: 3 })` on an empty 2×2 grid with beamTotal 3 → total 3, gold; beamTotal 0 → none.
  2. Components separately: score each of the four dealt seed-3 objectives on the finished golden window and compare 10 / 4 / 7 / 9.
  3. Tier table alone: the six boundary values above.
  4. Interaction effects: full `game.test.ts` golden report and replay test.
- **Rollback procedure:** `git reset --hard inc-42-green`; reintroduce the model class as a pure delegate to the old function, go green, then move the body.

---

**CRITICAL: ScoreCalculator scores through the Objective interface, keeps inclusive tier bounds 40/65/90 from a frozen snapshot, and reproduces the golden report 186 gold; golden master 5,5,31,16,2,7,53,37 / 156.**
