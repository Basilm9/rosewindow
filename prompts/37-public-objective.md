# Prompt 37: Objective Interface and PublicObjective

**CRITICAL: Introduce the `Objective` interface (`score(grid)`) and the `PublicObjective` class holding one of the eight public rules as strategy data, moving the four scoring families out of `scorePublicObjective` into `PublicObjective.score` with identical arithmetic, so the golden-master report lines (10, 4, 7) and beam total 156 do not change.**

---

### INCREMENT 37: Objective + PublicObjective
- **Status:** Standard
- **Dependencies:** Prompts 05, 11, 21 (DieGrid), 27
- **Reference implementation:** `src/engine/objectives.ts` (`PublicObjectiveStrategy`, `ALL_PUBLIC_OBJECTIVES`), `src/engine/scoreCalculator.ts` (`scorePublicObjective`, `colorCount`); tests `tests/engine/objectives.test.ts`, `tests/engine/scoreCalculator.test.ts` (four family blocks)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 18), `ctxt/RoseWindowReqPrompt.txt` (objectives)
- **Requirements:** FR-2.1, FR-2.4, FR-2.6

### MANDATORY: Sandwich Requirement
- **Start:** Adding an objective is **data, not code**: the eight objectives are `PublicObjective` instances built from the reference table; `score` switches on `strategy.kind` only.
- **End:** Old objective and score tests pass via shims; golden master unchanged; `check:classes` reports **22**.

### 1. Capability Specification
- **Adds:** `src/model/Objective.ts` (interface), `src/model/PublicObjective.ts` (class, strategy union, `PublicObjective.ALL`).
- **Changes:** `src/engine/objectives.ts` re-exports `ALL_PUBLIC_OBJECTIVES = PublicObjective.ALL` and the strategy type, and **keeps its plain-data interfaces** `PublicObjective` and `PrivateObjective` (the old tests build literals of those types; a class instance is assignable to them, a literal is not assignable to the class, so re-exporting the class type fails `pnpm typecheck`); `scorePublicObjective(grid, o)` in `src/engine/scoreCalculator.ts` delegates to `PublicObjective.from(o).score(grid)` (old tests pass plain objects).
- **Unchanged:** ids, names, descriptions, point values and the order of the eight entries (the seeded deal samples by index).

### 2. Implementation Instructions
```typescript
// src/model/Objective.ts
/** A scoring rule evaluated over the finished window (FR-2.4, FR-2.5). */
export interface Objective {
  readonly kind: 'public' | 'private'
  readonly id: string
  readonly name: string
  readonly description: string
  /** Points this objective awards for the grid as it stands (also used for live preview, FR-2.6). */
  score(grid: DieGrid): number
}

// src/model/PublicObjective.ts
export type PublicObjectiveStrategy =
  | { readonly kind: 'valueParity'; readonly parity: 'odd' | 'even'; readonly pointsPerDie: number }
  | { readonly kind: 'lineDiversity'; readonly axis: 'row' | 'col'; readonly trait: 'color' | 'value'; readonly pointsPerLine: number }
  | { readonly kind: 'diagonalDiversity'; readonly trait: 'color'; readonly pointsPerDie: number }
  | { readonly kind: 'colorQuorum'; readonly minPerColor: number; readonly pointsPerColor: number }

/** One of the eight public objectives (FR-2.1); three are dealt per run. */
export class PublicObjective implements Objective {
  readonly kind = 'public' as const
  constructor(readonly id: string, readonly name: string,
              readonly description: string, readonly strategy: PublicObjectiveStrategy)
  /** The eight objectives, in reference order (odd-values … balanced-palette). */
  static readonly ALL: readonly PublicObjective[]
  /** Wraps plain legacy data `{ id, name, description, strategy }`. */
  static from(data: Omit<PublicObjective, 'kind' | 'score'>): PublicObjective
  /** Scores the grid; empty cells never count. */
  score(grid: DieGrid): number
  /** Dice of one colour anywhere on the grid (used by colorQuorum and the view). */
  static colorCount(grid: DieGrid, color: DieColor): number
}
```

**Scoring rules (copy the reference bodies exactly):**
| Family | Rule |
| --- | --- |
| `valueParity` | count dice with `value % 2 === (odd ? 1 : 0)` × `pointsPerDie` |
| `lineDiversity` | for each row/col: skip if any cell empty; award `pointsPerLine` if the trait set size equals line length |
| `diagonalDiversity` | each die whose four diagonal neighbours (`DIAGONAL_DELTAS`) share no colour with it scores `pointsPerDie` (a lone die counts) |
| `colorQuorum` | colours with ≥ `minPerColor` dice × `pointsPerColor` |

The table of eight: odd-values (1/die), even-values (1/die), row-color-variety (5/line), column-color-variety (5), row-value-variety (4), column-value-variety (4), diagonal-color-variety (1/die), balanced-palette (3 per colour with ≥ 2). Instances are frozen. No exceptions (document "none" in the class TSDoc). TSDoc on every member.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/objectives.test.ts tests/engine/scoreCalculator.test.ts
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "feat(model): inc 37 PublicObjective" && git tag inc-37-green
```
- [ ] `PublicObjective.ALL.map(o => o.id)` deep-equals the old `ALL_PUBLIC_OBJECTIVES` id list
- [ ] Golden report lines unchanged: column-color-variety 10, row-value-variety 4, even-values 7
- [ ] Golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 22; lint 0/0
- [ ] `src/model/PublicObjective.ts` imports only model modules

---

**CRITICAL: Objective is the scoring interface and PublicObjective carries the eight rules as data with unchanged arithmetic; golden master 5,5,31,16,2,7,53,37 / 156.**
