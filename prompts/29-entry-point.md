# Prompt 29: EntryPoint

**CRITICAL: Create the `EntryPoint` class in `src/model/` (an edge cell plus the inward `Direction` the beam travels) and its deterministic enumeration `EntryPoint.allFor(gridSize)`, which must yield the 16 entries of a 4×4 grid in exactly the reference order so the seeded entry sequence and the golden master (5,5,31,16,2,7,53,37 / 156) do not move.**

---

### INCREMENT 29: EntryPoint value class
- **Status:** Standard
- **Dependencies:** Prompts 03, 05, 11 (Die), 13 (Direction), 19–21 (Position, GlassWindow)
- **Reference implementation:** `src/engine/types.ts` (`EntryPoint` interface, `allEntryPoints`) and `tests/engine/types.test.ts` (`allEntryPoints` block)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 14) and §5, `ctxt/RoseWindowReqPrompt.txt` (beam section)
- **Requirements:** FR-5.1, FR-5.2, NFR-1.1

### MANDATORY: Sandwich Requirement
- **Start:** `EntryPoint` is an immutable model class with `position` and `direction: Direction`; `allFor` preserves the reference enumeration order **byte for byte**.
- **End:** `pnpm test` is 100 % green, the golden master is unchanged and `pnpm check:classes` reports **19** classes.

### 1. Capability Specification
- **Adds:** concrete class `EntryPoint` (was an interface) in `src/model/EntryPoint.ts`.
- **Changes:** `src/engine/types.ts` keeps its legacy `EntryPoint` interface and `allEntryPoints()` but `allEntryPoints` now delegates to `EntryPoint.allFor(n).map(e => e.toData())`.
- **Unchanged:** the order of entries (the `Game` constructor samples them with the seeded RNG — any reordering changes every entry and the golden master).

### 2. Implementation Instructions
Names imported from earlier prompts (`Direction`, `Position`, `GameError`) are used exactly as prompts 05–21 defined them; never create a duplicate.

```typescript
// src/model/EntryPoint.ts — imports only ./Direction, ./Position (model) — no React/DOM/XState
/** Where the beam enters: an edge cell plus the inward direction it travels (FR-5.1). */
export class EntryPoint {
  /** Edge cell where the beam is admitted. */
  readonly position: Position
  /** Inward direction of travel on admission (FR-5.2). */
  readonly direction: Direction

  /** Creates a frozen entry point; performs no grid validation (see isInwardFor). */
  constructor(position: Position, direction: Direction)

  /**
   * Every legal entry for an n×n grid: cells scanned row-major; for each cell push, in this
   * order, south if row===0, west if col===last, north if row===last, east if col===0.
   * Corners admit two entries. 4×4 → 16 entries.
   */
  static allFor(gridSize: number): readonly EntryPoint[]

  /** True iff this entry is one of allFor(gridSize): an edge cell travelling inward across that edge. */
  isInwardFor(gridSize: number): boolean

  /** Value equality: same row, col and direction. */
  equals(other: EntryPoint): boolean

  /** Legacy plain shape `{ position, direction: 'north'|'east'|'south'|'west' }` for engine shims. */
  toData(): { readonly position: Position; readonly direction: DirectionName }
}
```

**Behaviour rules (from `allEntryPoints`):**
1. The push order inside each cell is **S, W, N, E** (the reference TSDoc says "N/E/S/W" and "20 entries" — both comments are wrong; the code and `types.test.ts` (16) are the oracle).
2. `Object.freeze(this)` in the constructor; store a copy of `position`.
3. `EntryPoint` raises **no** exception: invalid entries are reported by `isInwardFor`, and `BeamTracer` (prompt 35) rejects them.
4. TSDoc on the class, both fields and every method (all visibilities).
5. If a legacy view/hook needs the direction as a string, change that call site to `.direction.name` (one-token edit) and list it in the commit body.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "feat(model): inc 29 EntryPoint" && git tag inc-29-green
```
| Metric | Required |
| --- | --- |
| typecheck errors | 0 |
| lint | 0 errors, ≤ 0 warnings for green |
| unit pass rate | 100 % (incl. `tests/engine/types.test.ts`) |
| golden master | 5,5,31,16,2,7,53,37 / 156 |
| `check:classes` | ≥ 19 |

- [ ] `EntryPoint.allFor(4).length === 16`; corner (0,0) yields `[south, east]` in that order
- [ ] `allEntryPoints(4)` deep-equals the pre-change output (compare against a saved JSON of the old function)
- [ ] No import of React, DOM, `window`, `localStorage` or XState in `src/model/EntryPoint.ts`
- [ ] TSDoc on every member

---

**CRITICAL: EntryPoint is an immutable model class whose `allFor` order (row-major, S/W/N/E) is untouched; the golden master stays 5,5,31,16,2,7,53,37 / 156.**
