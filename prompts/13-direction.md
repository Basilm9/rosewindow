# Prompt 13: Direction

**CRITICAL: Create the `Direction` class in `src/model/Direction.ts` with exactly four static instances (NORTH, EAST, SOUTH, WEST), a private constructor, `clockwise()`, `counterClockwise()` and the row/col `delta`, replacing the string-union helpers of `engine/types.ts`. North DECREASES the row; east INCREASES the column — swapping either breaks every beam test and the golden master.**

---

### INCREMENT 13: Direction as a class with four instances
- **Status:** Standard
- **Dependencies:** Prompts 05, 11
- **Reference implementation:** `src/engine/types.ts` (`DIRECTIONS`, `Direction` type, `DELTA_BY_DIRECTION`, `clockwise`, `counterClockwise`) and `tests/engine/types.test.ts` (`clockwise`, `counterClockwise`, `DELTA_BY_DIRECTION` blocks)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 4)
- **Requirements:** FR-5.2, FR-5.4, NFR-1.4

### MANDATORY: Sandwich Requirement
- **Start:** Exactly four `Direction` objects ever exist; identity comparison (`===`) is valid equality.
- **End:** `pnpm test` 100 % green, golden master unchanged, `pnpm check:classes` ≥ **16** (new class name).

### 1. Capability Specification
- **Adds:** `src/model/Direction.ts`; `ORTHOGONAL_DELTAS` and `DIAGONAL_DELTAS` move to `src/model/Position.ts` (same order as the reference: N, S, W, E then NW, NE, SW, SE — the adjacency report order depends on it).
- **Changes:** callers that need the old string use `direction.name`.
- **Unchanged:** `engine/types.ts` still exports the string type `Direction` and `DIRECTIONS` for the beam/engine code until Prompt 35; its functions now delegate to the class.

### 2. Implementation Instructions
```typescript
// src/model/Direction.ts — imports ./Position and ./GameError only
/** The four compass names, in clockwise order starting north. */
export const DIRECTION_NAMES = ['north', 'east', 'south', 'west'] as const
export type DirectionName = (typeof DIRECTION_NAMES)[number]

/** A compass direction of beam travel; exactly four instances exist. */
export class Direction {
  static readonly NORTH: Direction   // name 'north', rowDelta -1, colDelta  0
  static readonly EAST: Direction    // name 'east',  rowDelta  0, colDelta +1
  static readonly SOUTH: Direction   // name 'south', rowDelta +1, colDelta  0
  static readonly WEST: Direction    // name 'west',  rowDelta  0, colDelta -1
  /** All four, clockwise from NORTH; declared AFTER the four instances. */
  static readonly ALL: readonly Direction[]

  private constructor(
    readonly name: DirectionName,
    readonly rowDelta: number,
    readonly colDelta: number,
  )
  /** Unit step as a Position `{ row: rowDelta, col: colDelta }`. */
  get delta(): Position
  /** 90° clockwise: N→E→S→W→N (warm glass, FR-5.4). */
  clockwise(): Direction
  /** 90° counter-clockwise: N→W→S→E→N (cool glass, FR-5.4). */
  counterClockwise(): Direction
  /** The neighbouring position one step from `from` in this direction. */
  step(from: Position): Position
  /** Looks up an instance by name. @throws GameError invalidArgument for an unknown name */
  static fromName(name: string): Direction
  /** The name, e.g. `"east"`. */
  toString(): string
}
```

**Behaviour rules (from `engine/types.ts`):**
1. `clockwise` = `ALL[(index + 1) % 4]`; `counterClockwise` = `ALL[(index + 3) % 4]`, where `index` is this instance's position in `ALL`.
2. `Object.freeze(this)` in the constructor; no public way to create a fifth instance (private constructor).
3. `fromName('up')` throws `GameError({ kind: 'invalidArgument', detail: 'unknown direction "up"' })`.
4. TSDoc on the class, the three fields, the five statics, the private constructor and every method.
5. **Shim in `src/engine/types.ts`:** `DIRECTIONS` stays `['north','east','south','west'] as const` (or re-exports `DIRECTION_NAMES`); `DELTA_BY_DIRECTION` is built from `Direction.ALL` (`Object.fromEntries(Direction.ALL.map(d => [d.name, d.delta]))`); `clockwise(d)` → `Direction.fromName(d).clockwise().name`; `counterClockwise` likewise; `ORTHOGONAL_DELTAS`/`DIAGONAL_DELTAS` re-exported from `src/model/Position`.
6. Do **not** touch `REFRACTION_BY_COLOR` or the beam tracer here (Prompt 35 owns them).

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/types.test.ts tests/engine/beamTracer.test.ts
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "feat(model): inc 13 Direction" && git tag inc-13-green
```
- [ ] `Direction.NORTH.clockwise() === Direction.EAST` (identity) and `Direction.NORTH.counterClockwise() === Direction.WEST`
- [ ] Four `clockwise()` calls return to the start
- [ ] `Direction.ALL.length === 4`; `Direction.NORTH.delta` equals `{ row: -1, col: 0 }`
- [ ] `tests/engine/types.test.ts` and `beamTracer.test.ts` pass unchanged
- [ ] typecheck 0; lint 0/0; unit 100 %; golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 16

---

**CRITICAL: Direction has exactly four frozen static instances with correct deltas (north = row −1, east = col +1) and clockwise/counterClockwise rotation; engine helpers delegate to it; golden master stays 5,5,31,16,2,7,53,37 / 156.**
