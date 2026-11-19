# Prompt 31: BeamSegment

**CRITICAL: Create the immutable `BeamSegment` class in `src/model/` — one cell the beam entered: position, the direction it entered with (pre-refraction), the die there or null, the multiplier in effect and the points awarded — without changing any traced path or score (golden master 5,5,31,16,2,7,53,37 / 156).**

---

### INCREMENT 31: BeamSegment value class
- **Status:** Standard
- **Dependencies:** Prompts 11 (Die), 13 (Direction), 29 (EntryPoint)
- **Reference implementation:** `src/engine/beamTracer.ts` (`BeamSegment` interface) and `tests/engine/beamTracer.test.ts` (`segment shape` block)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 15), `ctxt/RoseWindowReqPrompt.txt` (beam section)
- **Requirements:** FR-5.3, FR-5.5, FR-5.10

### MANDATORY: Sandwich Requirement
- **Start:** `BeamSegment` is data only: it never computes refraction or scoring; `points === (die?.value ?? 0) * multiplier` is a constructor invariant.
- **End:** All tests green, golden master unchanged, `pnpm check:classes` reports **20**.

### 1. Capability Specification
- **Adds:** class `BeamSegment` in `src/model/BeamSegment.ts`.
- **Changes vs reference:** adds the field `multiplier` (required by MVC §4: "position, direction, die, multiplier, points"); the reference interface had only four fields. `points` is derived, not passed in, so it can never disagree with `die` and `multiplier`.
- **Unchanged:** `src/engine/beamTracer.ts` keeps exporting its legacy `BeamSegment` **interface** for the old view/machine until prompt 58; it gains nothing in this prompt.

### 2. Implementation Instructions
Imported names (`Die`, `Direction`, `Position`) are used as prompts 11–21 defined them.

```typescript
// src/model/BeamSegment.ts
/** One cell of a beam traversal (FR-5.3, FR-5.10): recorded in the order the cells are struck. */
export class BeamSegment {
  /** The cell entered. */
  readonly position: Position
  /** Direction of travel on entry — before this cell's die refracts the beam (FR-5.5). */
  readonly direction: Direction
  /** The die in the cell, or null for an empty pane (which awards 0). */
  readonly die: Die | null
  /** Multiplier in effect when the cell was scored: 1..multiplierCap. */
  readonly multiplier: number
  /** Points awarded: die.value × multiplier, or 0 for an empty pane. */
  readonly points: number

  /** Freezes the segment and derives `points`. */
  constructor(position: Position, direction: Direction, die: Die | null, multiplier: number)

  /** True when the cell held a die. */
  get struck(): boolean

  /** Legacy plain shape `{ position, direction: DirectionName, die, points }` for engine shims. */
  toData(): LegacyBeamSegmentData
}
```

**Rules:**
1. `points = die === null ? 0 : die.value * multiplier` — the exact expression of the reference loop.
2. Copy `position` (`{ row, col }`) and `Object.freeze(this)`.
3. Field names `position`, `direction`, `die`, `points` must stay identical so `toMatchObject` assertions in old tests and the view's `segment.position`/`segment.points` reads keep compiling. Besides `multiplier`, add no other own enumerable field (event streams are compared with `toEqual` in the replay test).
4. No exceptions are raised; `multiplier` is supplied only by `BeamTracer`.
5. TSDoc on class, every field, constructor, getter and method.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/beamTracer.test.ts tests/engine/game.test.ts
git commit -am "feat(model): inc 31 BeamSegment" && git tag inc-31-green
```
| Metric | Green |
| --- | --- |
| typecheck / lint | 0 / 0 errors, 0 warnings |
| unit pass rate | 100 % |
| golden master | 5,5,31,16,2,7,53,37 / 156 |
| `check:classes` | ≥ 20 |

- [ ] `new BeamSegment({row:0,col:1}, east, die(B,2), 1).points === 2`
- [ ] Empty pane at multiplier 4 → `points === 0`, `struck === false`
- [ ] Instance is frozen; model file imports nothing outside `src/model` / `src/mvc`
- [ ] Old `beamTracer.test.ts` (13 cases) still passes untouched

---

**CRITICAL: BeamSegment is an immutable record whose points are derived from die and multiplier; no path or score changes — golden master 5,5,31,16,2,7,53,37 / 156.**
