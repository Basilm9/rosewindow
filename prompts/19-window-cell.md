# Prompt 19: WindowCell

**CRITICAL: Create the immutable `WindowCell` class in `src/model/WindowCell.ts` (a printed `CellConstraint` plus zero-or-one `Die`) that replaces the reference `WindowCell` interface. Its own enumerable data must be exactly `{ constraint, die }` so the existing `GlassWindow` test `cellAt(...)` `toEqual({ constraint, die })` keeps passing; occupying an occupied cell throws `PlacementError` kind `cellOccupied`.**

---

### INCREMENT 19: Window cell value object
- **Status:** Standard
- **Dependencies:** Prompts 05, 11, 15
- **Reference implementation:** `src/engine/glassWindow.ts` (`WindowCell` interface, `cellAt`) and `tests/engine/glassWindow.test.ts`
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 9)
- **Requirements:** FR-4.1, FR-4.2, FR-4.10, NFR-6.1

### MANDATORY: Sandwich Requirement
- **Start:** `WindowCell` is immutable: placing returns a NEW cell; nothing mutates an existing one (this is what makes "a rejected placement never changes the window", NFR-6.1, easy to guarantee).
- **End:** `pnpm test` 100 % green, golden master unchanged, `check:classes` ≥ **18**.

### 1. Capability Specification
- **Adds:** class `WindowCell`. `GlassWindow` is not changed yet (Prompt 21 rebuilds it on top of `WindowCell`); in this increment only `GlassWindow.cellAt` switches to returning `new WindowCell(constraint, die)`.
- **Unchanged:** the meaning of a cell (printed demand + optional die); `cellAt` result still deep-equals `{ constraint, die }`.

### 2. Implementation Instructions
```typescript
// src/model/WindowCell.ts — imports ./CellConstraint, ./Die, ./GameError only
/** One pane of the window: its printed demand plus zero-or-one placed die. */
export class WindowCell {
  /** The printed demand (never null; open panes use OpenConstraint). */
  readonly constraint: CellConstraint
  /** The placed die, or null while the pane is empty. */
  readonly die: Die | null
  constructor(constraint: CellConstraint, die?: Die | null /* default null */)
  /** True while no die is placed. */
  get isEmpty(): boolean
  /** Whether `die` satisfies ONLY this pane's printed demand (no neighbour laws). */
  satisfiedBy(die: DieData): boolean
  /** A new cell holding `die`. @throws PlacementError cellOccupied if this cell is occupied */
  withDie(die: Die): WindowCell
  /** A new empty cell with the same demand (tooling/tests only; game rules never remove dice). */
  cleared(): WindowCell
}
```

**Behaviour rules:**
1. Constructor assigns both fields then `Object.freeze(this)`. `isEmpty` is a prototype getter, so `Object.keys(cell)` is `['constraint', 'die']`.
2. `satisfiedBy(die)` returns `this.constraint.accepts(die)` — it is the single place a pane checks its own demand; `PlacementValidator` keeps its own check on the raw constraint grid (Prompt 27), so do not route the validator through this yet.
3. `withDie` on an occupied cell throws `new PlacementError({ kind: 'cellOccupied' })`; it never returns `this`.
4. `cleared()` on an empty cell returns a new equal cell (idempotent, no throw).
5. Type the `constraint` parameter and field as the `CellConstraint` **interface**, never a concrete class (course SOLID rule).
6. TSDoc on the class, both fields, constructor, getter and every method (`@throws` on `withDie`).
7. **Shim:** in `src/engine/glassWindow.ts` delete the `WindowCell` interface, `export { WindowCell } from '../model/WindowCell'`, and make `cellAt` return `new WindowCell(this.pattern.constraints[r][c], this.dieAt(position))`.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/glassWindow.test.ts
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "feat(model): inc 19 WindowCell" && git tag inc-19-green
```
- [ ] `new WindowCell(new OpenConstraint())` → `isEmpty === true`, `die === null`
- [ ] `cell.withDie(d)` returns a different object; the original is still empty
- [ ] `cell.withDie(d).withDie(d)` throws `PlacementError` with `violation.kind === 'cellOccupied'`
- [ ] `Object.keys(cell)` equals `['constraint', 'die']`; `Object.isFrozen(cell)`
- [ ] `tests/engine/glassWindow.test.ts` passes unchanged
- [ ] typecheck 0; lint 0/0; unit 100 %; golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 18

---

**CRITICAL: WindowCell is a frozen `{constraint, die}` value object whose withDie returns a new cell or throws PlacementError cellOccupied, and existing GlassWindow tests still deep-equal it; golden master stays 5,5,31,16,2,7,53,37 / 156.**
