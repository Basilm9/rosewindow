# Prompt 27: PlacementValidator

**CRITICAL: Move `PlacementValidator` into `src/model/PlacementValidator.ts` checking the six placement laws in the FIXED order cellOccupied → dieNotInPool → constraintMismatch → adjacencyViolation → illegalFirstPlacement → disconnectedPlacement and reporting only the first violation (FR-4.9). The reference still does `throw new Error(...)` for an out-of-grid target (line 73); the new class must throw `GameError` kind `outOfBounds` instead, keeping the text "outside the grid". The validator is pure: it never mutates its inputs.**

---

### INCREMENT 27: Placement laws in fixed order
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompts 05, 11, 13, 15, 21, 25 (`DraftPool.contains`)
- **Reference implementation:** `src/engine/placementValidator.ts` and `tests/engine/placementValidator.test.ts`, `tests/engine/classes.test.ts` ("reuses a validator…")
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 13), §5; `ctxt/RoseWindowReqPrompt.txt` (placement laws)
- **Requirements:** FR-4.2–FR-4.9, FR-4.12, FR-4.15, NFR-2.1, NFR-2.2, NFR-2.4

### MANDATORY: Sandwich Requirement
- **Start:** Six laws, one private method each, evaluated in the order above; first violation wins; the out-of-grid check runs before all of them and is a caller defect (`GameError`, not `PlacementError`).
- **End:** `pnpm test` 100 % green, golden master unchanged, `check:classes` ≥ 18.

### 1. Capability Specification
- **Adds:** `src/model/PlacementValidator.ts` with `PlacementCheck` and statics `isInsideGrid`, `isOnBorderRing`, `countPlaced`.
- **Changes:** out-of-grid → `GameError({ kind: 'outOfBounds', target })`; the law sequence is an explicit ordered list of private checks; the dieNotInPool law delegates to `DraftPool.contains` (Prompt 25) instead of scanning the list itself.
- **Unchanged:** the laws, their order, `adjacencyViolation.offendingNeighbors` listing every offending orthogonal neighbour in `ORTHOGONAL_DELTAS` order (N, S, W, E), diagonal contact counting for connectivity only, statelessness between calls.

### 2. Implementation Instructions
```typescript
// src/model/PlacementValidator.ts — imports ./GlassWindow (DieGrid type), ./CellConstraint, ./Die, ./DraftPool, ./Position, ./GameError
export interface PlacementCheck {
  readonly grid: DieGrid
  readonly constraints: readonly (readonly CellConstraint[])[]
  readonly pool: readonly DieData[]   // membership by color+value via DraftPool.contains
  readonly die: DieData
  readonly target: Position
}

/** Checks the six placement laws in fixed order; pure and stateless. */
export class PlacementValidator {
  /** First violation or null. @throws GameError outOfBounds if target is outside the grid */
  findViolation(check: PlacementCheck): PlacementViolation | null
  /** @throws PlacementError with the first violation  @throws GameError outOfBounds */
  assertValid(check: PlacementCheck): void
  static isInsideGrid(position: Position, size: number): boolean
  static isOnBorderRing(position: Position, size: number): boolean
  static countPlaced(grid: DieGrid): number
  // one private method per law, each returning PlacementViolation | null:
  #cellOccupied(c: PlacementCheck): PlacementViolation | null
  #dieNotInPool(c: PlacementCheck): PlacementViolation | null
  #constraintMismatch(c: PlacementCheck): PlacementViolation | null
  #adjacency(c: PlacementCheck): PlacementViolation | null
  #illegalFirstPlacement(c: PlacementCheck): PlacementViolation | null   // only when grid empty
  #disconnected(c: PlacementCheck): PlacementViolation | null            // only when grid non-empty
}
```

**Behaviour rules (copy from the reference):**
1. `size = grid.length`; if `!isInsideGrid(target, size)` throw `outOfBounds` (integer check on both coordinates; `0.5`, `NaN`, `Infinity` are outside).
2. cellOccupied: `grid[r][c] !== null`. dieNotInPool: `!DraftPool.contains(pool, die)` — the pool-membership rule Prompt 25 defines; do not re-implement it with `pool.some(...)`. (Same color+value result as the reference `sameDie` scan, so precedence and the golden master are unchanged.) constraintMismatch: `demand !== undefined && !demand.accepts(die)` → `{ kind, expected: demand }` (the constraint instance itself).
3. adjacency: for each of `ORTHOGONAL_DELTAS`, neighbour non-null and (same color **or** same value) → collect `{row, col}`; non-empty list → violation.
4. illegalFirstPlacement: `countPlaced(grid) === 0 && !isOnBorderRing(target, size)`. disconnected: `countPlaced(grid) > 0` and no die at any of the 8 orthogonal+diagonal neighbours.
5. Neighbour reads use `grid[r]?.[c] ?? null` (outside = empty).
6. Iterate the laws from a `readonly` array of the six private methods; do not reorder. Document the order and why (structural → printed demand → neighbours → first/connectivity) in the class TSDoc (NFR-4.6).
7. TSDoc on the interface, its fields, the class, every public, static and private method, with `@throws`.
8. **Shim:** `src/engine/placementValidator.ts` re-exports `PlacementValidator`, `type PlacementCheck`, `type DieGrid`, and keeps `findPlacementViolation`, `assertPlacementValid`, `isInsideGrid`, `isOnBorderRing`, `countPlaced` as one-line delegates (used by `gameMachine.ts`).

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/placementValidator.test.ts tests/engine/classes.test.ts tests/engine/game.test.ts tests/machine
pnpm vitest run tests/engine/game.test.ts -t "golden master"
grep -n "new Error" src/model/PlacementValidator.ts src/engine/placementValidator.ts   # nothing
git commit -am "feat(model): inc 27 PlacementValidator" && git tag inc-27-green
```
- [ ] Every reference test in `placementValidator.test.ts` passes unchanged (the out-of-bounds tests match `/outside the grid/`)
- [ ] `assertValid` on an out-of-grid target throws `GameError` that is **not** a `PlacementError`
- [ ] The dieNotInPool law calls `DraftPool.contains`: `grep -n "DraftPool.contains" src/model/PlacementValidator.ts` prints one line and `grep -n "pool.some" src/model/PlacementValidator.ts` prints nothing
- [ ] typecheck 0; lint 0/0; unit 100 %; golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 18

### 4. CRITICAL Checkpoint
- **Risk:** rule-logic transition — every placement, legality preview (FR-4.13), legal-move search and forfeit decision runs through this class; a reordered law or a changed neighbour order changes which violation the player sees and which moves the auto-player finds.
- **Failure indicators:** precedence tests fail (e.g. `dieNotInPool` reported instead of `cellOccupied`); `offendingNeighbors` order differs; `game.test.ts` forfeit or `legalPlacementsFor` tests fail; golden master differs; `gameMachine` tests fail on out-of-grid guards.
- **Isolation testing protocol:**
  1. Simplified config: 2×2 grids from `classes.test.ts` (`['R.', '..']` constraints, blue 3) — one law at a time.
  2. Components separately: run each of the six law tests alone (`-t cellOccupied`, `-t dieNotInPool`, …), then the precedence block alone.
  3. Interaction effects: run `game.test.ts` (legal-move search over 16 cells × pool), `tests/machine`, then the golden master.
- **Rollback procedure:** `git reset --hard inc-26-green`; re-apply by moving the reference `findViolation` body verbatim (only `throw new Error` → `GameError`), confirm green, then split into private law methods.

---

**CRITICAL: PlacementValidator checks the six laws in the fixed order, returns/throws only the first violation, throws GameError outOfBounds (never `new Error`) for an out-of-grid target and never mutates its inputs; golden master stays 5,5,31,16,2,7,53,37 / 156.**
