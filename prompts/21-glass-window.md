# Prompt 21: GlassWindow

**CRITICAL: Rebuild `GlassWindow` in `src/model/GlassWindow.ts` as a grid of immutable `WindowCell`s with bounds and occupancy queries, and make it the class the running `Game` uses (via the engine shim). The `dice` snapshot it hands to the validator, the beam tracer and the objectives must stay a fresh row-major `(Die | null)[][]`; any change in shape or aliasing moves the golden master. Out-of-bounds access throws `GameError` kind `outOfBounds` (NFR-2.4).**

---

### INCREMENT 21: GlassWindow built from WindowCells
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompts 05, 11, 15, 17, 19
- **Reference implementation:** `src/engine/glassWindow.ts`, `src/engine/placementValidator.ts` (`DieGrid`, `countPlaced`) and `tests/engine/glassWindow.test.ts`
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (rows 9–10), §5
- **Requirements:** FR-4.1, FR-4.10, NFR-2.4, NFR-6.1, FR-1.2

### MANDATORY: Sandwich Requirement
- **Start:** `GlassWindow` owns the grid; it answers bounds and occupancy queries and commits a die, but it does NOT validate placement laws — `PlacementValidator` (Prompt 27) does, and `Game` calls it first.
- **End:** `pnpm test` 100 % green, golden master 5,5,31,16,2,7,53,37 / 156, `check:classes` ≥ **18**.

### 1. Capability Specification
- **Adds:** `src/model/GlassWindow.ts` with the `DieGrid` type (moved from `placementValidator.ts`; BeamTracer and objectives import it from here).
- **Changes:** the private `(Die | null)[][]` becomes `WindowCell[][]`; `place` swaps in `cell.withDie(die)`; out-of-bounds `place`/`remove`/`cellAt` throw `GameError({kind:'outOfBounds', target})` instead of a `TypeError`.
- **Unchanged:** `fromPattern`, `pattern`, `gridSize`, `constraints`, `dice`, `dieAt` (returns `null` outside the grid — the beam and neighbour scans rely on that), `placedCount`, `place`, `remove`.

### 2. Implementation Instructions
```typescript
// src/model/GlassWindow.ts — imports ./WindowCell, ./WindowPattern, ./CellConstraint, ./Die, ./Position, ./GameError
/** Row-major window contents, zero-or-one die per cell. */
export type DieGrid = readonly (readonly (Die | null)[])[]

/** The player's window: a square grid of WindowCells built from a pattern. */
export class GlassWindow {
  /** Pattern the cells were built from. */
  readonly pattern: WindowPattern
  /** Side length, = pattern.constraints.length. */
  readonly gridSize: number
  /** Current cells; each replaced (never mutated) on place/remove. */
  readonly #cells: WindowCell[][]
  private constructor(pattern: WindowPattern)
  static fromPattern(pattern: WindowPattern): GlassWindow
  get constraints(): readonly (readonly CellConstraint[])[]
  /** Fresh copy every call; mutating it never changes the window. */
  get dice(): DieGrid
  get placedCount(): number
  get isEmpty(): boolean
  /** Integer row/col within 0..gridSize-1. */
  isInside(position: Position): boolean
  /** Lenient read: null when empty OR outside the grid. */
  dieAt(position: Position): Die | null
  /** @throws GameError outOfBounds */
  cellAt(position: Position): WindowCell
  /** Commits a die; caller has validated the laws.
   *  @throws GameError outOfBounds  @throws PlacementError cellOccupied */
  place(die: Die, position: Position): void
  /** Clears a cell (tooling/tests only). @throws GameError outOfBounds */
  remove(position: Position): void
  /** Positions of every placed die, row-major. */
  occupiedPositions(): Position[]
}
```

**Behaviour rules (from `engine/glassWindow.ts`):**
1. `fromPattern` builds `gridSize × gridSize` cells: `new WindowCell(pattern.constraints[r][c])`.
2. `dice` = `this.#cells.map(row => row.map(cell => cell.die))` — a new outer and inner array each call.
3. `isInside` uses `Number.isInteger` on both coordinates (same rule as the reference `isInsideGrid`).
4. `place` checks bounds first, then `withDie` (which throws `cellOccupied`), then assigns the new cell. On any throw the grid is unchanged (NFR-6.1).
5. `placedCount` counts non-null dice; `isEmpty` is `placedCount === 0`.
6. TSDoc on class, every field (including `#cells`), private constructor, every getter and method, with `@throws`.
7. **Shim:** `src/engine/glassWindow.ts` → `export { GlassWindow } from '../model/GlassWindow'`, `export { WindowCell } from '../model/WindowCell'`; `src/engine/placementValidator.ts` → `export type { DieGrid } from '../model/GlassWindow'`. `Game` keeps `GlassWindow.fromPattern(chosen)` unchanged.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/glassWindow.test.ts tests/engine/game.test.ts tests/engine/beamTracer.test.ts
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "feat(model): inc 21 GlassWindow" && git tag inc-21-green
```
- [ ] `GlassWindow.fromPattern(ALL_PATTERNS[0]).placedCount === 0`; 16 cells; `constraints` equals the pattern's
- [ ] `window.dice[0][0] = x` (on the copy) leaves `window.dieAt({row:0,col:0}) === null`
- [ ] `place(d, {row:4,col:0})` throws `GameError` kind `outOfBounds`; `place` twice on one cell throws `PlacementError`
- [ ] `dieAt({row:-1,col:0}) === null` (no throw)
- [ ] typecheck 0; lint 0/0; unit 100 %; golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 18

### 4. CRITICAL Checkpoint
- **Risk:** state-ownership transition — the first model class the live `Game` mutates every turn. A snapshot that aliases internal arrays, a changed row/col order, or a `dieAt` that now throws outside the grid corrupts beam scoring or legal-move search.
- **Failure indicators:** golden master differs (e.g. round 3 ≠ 31); `game.test.ts` forfeit/legal-move tests fail; beam tests throw `outOfBounds`; `hasLegalMove` behaves differently; UI board renders transposed.
- **Isolation testing protocol:**
  1. Simplified config: a 2×2 pattern via `WindowPattern.fromRows('t','T','',['..','..'],2)`; place, read `dice`, remove — compare with the reference class on the same steps.
  2. Components separately: run `glassWindow.test.ts`, then `beamTracer.test.ts`, then `objectives.test.ts`, each alone.
  3. Interaction effects: run the full `game.test.ts`, then `pnpm e2e` smoke (board renders 4×4 with the pattern's printed demands, per `mockups/` setup/game screens).
- **Rollback procedure:** `git reset --hard inc-20-green`; re-apply by first wrapping the old `(Die|null)[][]` storage behind the new public API (no `WindowCell`), confirm green, then switch storage to `WindowCell[][]`.

---

**CRITICAL: GlassWindow is a WindowCell grid whose `dice` snapshot is a fresh row-major copy, whose `dieAt` stays lenient and whose mutators throw GameError outOfBounds / PlacementError cellOccupied without changing the grid; golden master stays 5,5,31,16,2,7,53,37 / 156.**
