# Prompt 41: ScoreReport

**CRITICAL: Create the immutable `ScoreReport` class in `src/model/` — itemized objective lines, beam total, grand total and tier — whose `total` is DERIVED as beamTotal + sum of line points (FR-8.3), with exactly the four own fields `lines`, `beamTotal`, `total`, `tier` so the golden-master report (`total 186`, `gold`) still deep-equals.**

---

### INCREMENT 41: ScoreReport value class
- **Status:** Standard
- **Dependencies:** Prompts 07 (TierThresholds), 37, 39
- **Reference implementation:** `src/engine/scoreCalculator.ts` (`ScoreLine`, `Tier`, `ScoreReport` interface) and `tests/engine/scoreCalculator.test.ts` (`calculateScore` block), `tests/engine/game.test.ts` ("exact recorded final score report")
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §3 (`GameOverEvent`) and §4 (row 20), `ctxt/mockups/09-final-report.png` (read-only reference for the line order the view shows)
- **Requirements:** FR-8.1, FR-8.2, FR-8.3, FR-8.4

### MANDATORY: Sandwich Requirement
- **Start:** `ScoreReport` never computes objectives or tiers; it stores lines, beam total and tier and derives `total`.
- **End:** Golden report deep-equals `{ lines:[…10, 4, 7, 9], beamTotal:156, total:186, tier:'gold' }`; `check:classes` reports **24**.

### 1. Capability Specification
- **Adds:** `src/model/ScoreReport.ts` with class `ScoreReport`, interface `ScoreLine`, type `Tier`.
- **Changes:** `src/engine/scoreCalculator.ts` re-exports `ScoreLine`, `Tier` and `ScoreReport` (as type) from the model; `ScoreCalculator.calculate` (still in engine until prompt 43) returns `new ScoreReport(...)`.
- **Unchanged:** line order — the three publics in deal order, then the private line.

### 2. Implementation Instructions
```typescript
// src/model/ScoreReport.ts
/** One itemized line of the final score (FR-8.2). */
export interface ScoreLine {
  readonly objectiveId: string
  readonly name: string
  readonly points: number
}

/** Award band against GameConfig.tiers (FR-8.4); 'none' below bronze. */
export type Tier = 'none' | 'bronze' | 'silver' | 'gold'

/** The itemized final score carried by GameOverEvent. */
export class ScoreReport {
  /** Three public lines then the private line, in deal order (frozen copies). */
  readonly lines: readonly ScoreLine[]
  /** Sum of all round beam scores (equals Game.totalScore at game over). */
  readonly beamTotal: number
  /** beamTotal + Σ lines.points (FR-8.3). */
  readonly total: number
  /** Tier awarded by ScoreCalculator. */
  readonly tier: Tier

  /** Copies and freezes lines; derives total. */
  constructor(lines: readonly ScoreLine[], beamTotal: number, tier: Tier)

  /** Σ lines.points (objectives only). */
  get objectiveTotal(): number

  /** The line for an objective id, or null. */
  lineFor(objectiveId: string): ScoreLine | null
}
```

**Rules:**
1. Own enumerable fields are exactly `lines`, `beamTotal`, `total`, `tier` (getters/methods on the prototype); `toEqual` against the literal golden report must pass.
2. Each line is copied into a fresh frozen `{ objectiveId, name, points }` object; the array is frozen; the instance is frozen.
3. No exceptions; TSDoc on every member.
4. The model file imports nothing from React/DOM/XState; it may be imported as a type by `src/view/GameOverScreen.tsx` through the engine shim until prompt 58.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/scoreCalculator.test.ts tests/engine/game.test.ts
git commit -am "feat(model): inc 41 ScoreReport" && git tag inc-41-green
```
| Metric | Green |
| --- | --- |
| typecheck / lint | 0 / 0 errors, 0 warnings |
| unit pass rate | 100 % |
| golden master | 5,5,31,16,2,7,53,37 / 156; report total 186 gold |
| `check:classes` | ≥ 24 |

- [ ] `new ScoreReport([{…4},{…5},{…0},{…1}], 100, 'gold').total === 110`
- [ ] `Object.keys(report)` is `['lines','beamTotal','total','tier']`
- [ ] Golden report deep-equality test passes unchanged

---

**CRITICAL: ScoreReport derives total = beamTotal + objective lines and exposes exactly four fields; golden master 5,5,31,16,2,7,53,37 / 156 and report 186 gold.**
