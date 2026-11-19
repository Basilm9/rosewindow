# Prompt 17: WindowPattern

**CRITICAL: Turn `WindowPattern` from an interface into a class in `src/model/WindowPattern.ts` that parses and VALIDATES its hand-authored rows at load time (NFR-1.3), throwing `GameError` kind `malformedPattern` — the reference `patterns.ts` still uses `throw new Error(...)` and that must not survive. The six catalog patterns, their order and their rows are frozen data: changing any of them moves the golden master.**

---

### INCREMENT 17: Validated window patterns
- **Status:** Standard
- **Dependencies:** Prompts 05, 09, 11, 15
- **Reference implementation:** `src/engine/patterns.ts` (`parseConstraints`, `patternFromRows`, `ALL_PATTERNS`, `offerPatterns`), `src/engine/types.ts` (`WindowPattern` interface) and `tests/engine/patterns.test.ts`
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 8); `ctxt/GUI_mockupsRoseWindow.md` (setup screen wording only — no view change here)
- **Requirements:** FR-1.1, FR-1.2, NFR-1.3, NFR-1.1

### MANDATORY: Sandwich Requirement
- **Start:** A malformed pattern can never be constructed: every failure is a `GameError` raised while the module loads, never during play.
- **End:** `pnpm test` 100 % green, golden master unchanged, `check:classes` ≥ **17**.

### 1. Capability Specification
- **Adds:** class `WindowPattern`, constant `ALL_PATTERNS`, statics `offer` and `byId`.
- **Changes:** the three `throw new Error(...)` sites in `patterns.ts` (lines 28, 42, 53) become `throw new GameError({ kind: 'malformedPattern', reason })` with reasons `'constraint grid must be square'`, `` `invalid pattern character: "${ch}"` ``, `` `pattern "${id}" must have ${gridSize} rows` ``.
- **Unchanged:** grid letters (`R Y B G P` colors, `1`–`6` values, `.` open), the six patterns in the order novice-rose, lancet, quatrefoil, tracery, clerestory, rose-majestic, their names/descriptions/rows, and `offer` drawing two via `SeededRandom.sample(ALL_PATTERNS, 2, rng)`.

### 2. Implementation Instructions
```typescript
// src/model/WindowPattern.ts — imports ./CellConstraint, ./Die, ./GameError, ./Position, ./SeededRandom
/** A named square arrangement of printed demands; two are offered per run. */
export class WindowPattern {
  readonly id: string
  readonly name: string
  readonly description: string
  /** Row-major, deeply frozen grid of demands. */
  readonly constraints: readonly (readonly CellConstraint[])[]
  /** @throws GameError malformedPattern if the grid is empty or not square, or id is empty */
  constructor(id: string, name: string, description: string,
              constraints: readonly (readonly CellConstraint[])[])
  /** Parses rows and requires exactly `gridSize` rows. @throws GameError malformedPattern */
  static fromRows(id: string, name: string, description: string,
                  rows: readonly string[], gridSize?: number /* default 4 */): WindowPattern
  /** Any square size (tests use 2×2, 3×3, 5×5). @throws GameError malformedPattern */
  static parseConstraints(rows: readonly string[]): CellConstraint[][]
  /** Side length (rows). */
  get gridSize(): number
  /** Number of non-open cells. */
  get demandCount(): number
  /** @throws GameError outOfBounds when outside the grid */
  constraintAt(position: Position): CellConstraint
  /** Two distinct catalog patterns, deterministic for the rng (FR-1.1). */
  static offer(rng: Rng): [WindowPattern, WindowPattern]
  /** @throws GameError unknownPattern */
  static byId(id: string): WindowPattern
}
/** The six hand-authored patterns (declared after the class). */
export const ALL_PATTERNS: readonly WindowPattern[]
```

**Behaviour rules (from `patterns.ts`):**
1. Character parsing per cell: `.` → `new OpenConstraint()`, `'1'..'6'` → `new ValueConstraint(Number(ch))`, `R/Y/B/G/P` → `new ColorConstraint(color)`, anything else → `malformedPattern`.
2. Square check after parsing every row (`row.length !== rows.length`).
3. `Object.freeze` each row array, the outer array and the instance. Own data stays `{id, name, description, constraints}` so `GlassWindow.fromPattern` and existing views work unchanged.
4. Keep catalog rows verbatim, e.g. novice-rose `['..5.', '....', 'Y...', '.3..']`. Note: its description says "Four demands" but the rows hold 3; do **not** edit rows; flag the text in the commit body for the team.
5. TSDoc on the class, all fields, constructor, every static and method, with `@throws`.
6. **Shims:** `src/engine/patterns.ts` → `export { ALL_PATTERNS } from '../model/WindowPattern'`; `parseConstraints = WindowPattern.parseConstraints`; `offerPatterns = (rng) => WindowPattern.offer(rng)`. `src/engine/types.ts` → `export type { WindowPattern } from '../model/WindowPattern'` (replaces the interface; the class has the same four fields).

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/patterns.test.ts tests/engine/placementValidator.test.ts
pnpm vitest run tests/engine/game.test.ts -t "golden master"
grep -n "new Error" src/model/WindowPattern.ts src/engine/patterns.ts   # must print nothing
git commit -am "feat(model): inc 17 WindowPattern" && git tag inc-17-green
```
- [ ] `ALL_PATTERNS.map(p => p.id)` equals the six ids in catalog order
- [ ] `ALL_PATTERNS.map(p => p.demandCount)` equals `[3, 6, 8, 10, 11, 14]`
- [ ] `WindowPattern.parseConstraints(['R.', 'X.'])` throws `GameError` kind `malformedPattern`
- [ ] typecheck 0; lint 0/0; unit 100 %; golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 17

---

**CRITICAL: WindowPattern is a class that validates its data at load and throws GameError malformedPattern (never `new Error`), with the six catalog patterns byte-identical and in order; golden master stays 5,5,31,16,2,7,53,37 / 156.**
