# Prompt 33: BeamPath

**CRITICAL: Create the immutable `BeamPath` class in `src/model/` — the ordered `BeamSegment`s of one trace, their total and the termination reason (`'exitedGrid' | 'cycle'`) — with `totalScore` derived from the segments so the round score can never disagree with the path (golden master 5,5,31,16,2,7,53,37 / 156).**

---

### INCREMENT 33: BeamPath result class
- **Status:** Standard
- **Dependencies:** Prompts 29, 31
- **Reference implementation:** `src/engine/beamTracer.ts` (`BeamPath` interface) and `tests/engine/beamTracer.test.ts` (assertions on `segments`, `totalScore`, `termination`)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §3 (`BeamTracedEvent` payload) and §4 (row 16)
- **Requirements:** FR-5.3, FR-5.8, FR-5.9, FR-5.11, NFR-6.2

### MANDATORY: Sandwich Requirement
- **Start:** `BeamPath` holds a frozen copy of the segments; `totalScore` is the sum of `segment.points`, never a constructor argument.
- **End:** All tests green; golden master unchanged; `pnpm check:classes` reports **21**.

### 1. Capability Specification
- **Adds:** `src/model/BeamPath.ts` with class `BeamPath` and `export type BeamTermination = 'exitedGrid' | 'cycle'`.
- **Changes:** none to existing behaviour; the legacy interface in `src/engine/beamTracer.ts` stays until prompt 35 turns that module into a shim.
- **Unchanged:** field names `segments`, `totalScore`, `termination` (the view's `BeamLayer`, `GlassBoard` and `beamMachine` read them).

### 2. Implementation Instructions
```typescript
// src/model/BeamPath.ts
/** Why a trace stopped: it would leave the window (FR-5.8) or repeat a (cell, direction) pair (FR-5.9). */
export type BeamTermination = 'exitedGrid' | 'cycle'

/** The complete, ordered result of one beam trace; carried by BeamTracedEvent. */
export class BeamPath {
  /** Segments in the order the cells were struck (FR-5.10). Frozen copy. */
  readonly segments: readonly BeamSegment[]
  /** Sum of segment points — the round's beam score (FR-5.11). */
  readonly totalScore: number
  /** Termination reason. */
  readonly termination: BeamTermination

  /** Copies and freezes `segments`; derives `totalScore`. */
  constructor(segments: readonly BeamSegment[], termination: BeamTermination)

  /** Number of cells entered. */
  get length(): number

  /** Number of bends seen on the path: segments whose successor has a different direction (a bend on the last segment, which exits or meets the cycle guard, is not counted). */
  get bendCount(): number

  /** Highest multiplier reached on the path (1 for an empty or straight path). */
  get peakMultiplier(): number

  /** Legacy plain `{ segments: data[], totalScore, termination }` for engine shims. */
  toData(): LegacyBeamPathData
}
```

**Rules:**
1. `totalScore = segments.reduce((s, x) => s + x.points, 0)`.
2. An empty `segments` array is allowed (`length 0`, `totalScore 0`); the tracer never produces one (the entry cell is always recorded) but the class does not depend on that.
3. `bendCount` compares `segments[i].direction` with `segments[i+1].direction` by identity (`Direction` instances are static, prompt 13). It is a read-only query for the view and tests — it must not be used to score.
4. No exception kinds; immutability via `Object.freeze` on the instance and the array.
5. TSDoc on all members (including the type alias).

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "feat(model): inc 33 BeamPath" && git tag inc-33-green
```
| Metric | Green |
| --- | --- |
| typecheck / lint | 0 / 0 errors, 0 warnings |
| unit pass rate | 100 % |
| golden master | 5,5,31,16,2,7,53,37 / 156 |
| `check:classes` | ≥ 21 |

- [ ] A path of segments with points [1,2,3,4,5] has `totalScore 15`, `length 5`
- [ ] `segments` cannot be pushed to (frozen) and is a copy of the argument
- [ ] `src/model/BeamPath.ts` imports only `./BeamSegment` (and type-only model names)

---

**CRITICAL: BeamPath derives its total from its segments and is immutable; termination is `'exitedGrid' | 'cycle'`; golden master 5,5,31,16,2,7,53,37 / 156.**
