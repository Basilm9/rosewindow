# Prompt 14: Direction Tests

**CRITICAL: Write `tests/model/Direction.test.ts` that pins the four instances, their deltas, both rotations for every direction, identity semantics and the `invalidArgument` rejection of `fromName`. Port the `clockwise`, `counterClockwise` and `DELTA_BY_DIRECTION` tests of `tests/engine/types.test.ts`.**

---

### INCREMENT 14: Direction unit tests
- **Status:** Standard
- **Dependencies:** Prompts 05, 13
- **Reference implementation:** `tests/engine/types.test.ts` (blocks `clockwise`, `counterClockwise`, `DELTA_BY_DIRECTION`)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 4)
- **Requirements:** FR-5.2, FR-5.4

### MANDATORY: Sandwich Requirement
- **Start:** Header comment names the criterion: **input-domain partitioning** over the four instances (every method is exercised for each of N, E, S, W) plus the invalid-name partition of `fromName`.
- **End:** All tests pass; the legacy `types.test.ts` remains untouched and green.

### 1. Capability Specification
Tests only: `tests/model/Direction.test.ts`, importing `Direction`, `DIRECTION_NAMES` from `../../src/model/Direction`, `GameError` from `../../src/model/GameError`.

### 2. Implementation Instructions
Header comment:
```typescript
/**
 * Criterion: input-domain partitioning — one partition per instance (N, E, S, W)
 * for delta, clockwise, counterClockwise, step, fromName; plus invalid name.
 */
```

Precomputed tables (literal constants):
```typescript
const CW = [['north','east'], ['east','south'], ['south','west'], ['west','north']] as const
const CCW = [['north','west'], ['west','south'], ['south','east'], ['east','north']] as const
const DELTAS = [['north',-1,0], ['east',0,1], ['south',1,0], ['west',0,-1]] as const
```

**Cases:**
| # | Case | Expected |
| --- | --- | --- |
| 1 | `Direction.ALL.map(d => d.name)` | `['north','east','south','west']` (equals `DIRECTION_NAMES`) |
| 2–5 | `it.each(CW)` `Direction.fromName(a).clockwise()` | `toBe(Direction.fromName(b))` (identity) |
| 6–9 | `it.each(CCW)` counter-clockwise | identity with expected |
| 10–13 | `it.each(DELTAS)` | `.rowDelta`, `.colDelta`, and `.delta` `toEqual({row, col})` |
| 14 | full turn | `Direction.EAST.clockwise().clockwise().clockwise().clockwise()` `toBe(Direction.EAST)` |
| 15 | inverse | `Direction.SOUTH.clockwise().counterClockwise()` `toBe(Direction.SOUTH)` |
| 16 | `Direction.EAST.step({row: 2, col: 1})` | `{ row: 2, col: 2 }` |
| 17 | `Direction.NORTH.step({row: 0, col: 3})` | `{ row: -1, col: 3 }` (leaving the grid is the caller's check) |
| 18 | statics are the `ALL` members | `Direction.ALL` `toEqual([Direction.NORTH, Direction.EAST, Direction.SOUTH, Direction.WEST])` |
| 19 | frozen | `Object.isFrozen(Direction.WEST)` |
| 20 | `String(Direction.SOUTH)` | `'south'` |
| 21 | invalid name | `expect(() => Direction.fromName('up')).toThrow(GameError)` |
| 22 | invalid name message | `toThrow(/unknown direction "up"/)` |

Error kinds raised by `Direction`: only `invalidArgument` (cases 21–22).

**Ported (none dropped):** "rotates north → east → south → west → north" → cases 2–5; "rotates north → west → south → east → north" → 6–9; "maps each direction to a single-cell unit step" → 10–13.

**JUnit-style rules:** no shared mutable fixture (instances are immutable singletons, which is allowed); no `if`/`for`/`try` in test bodies, tables through `it.each`; compare against the literal tables above; exceptions with `toThrow(GameError)`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/Direction.test.ts
pnpm typecheck && pnpm lint && pnpm test
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "test(model): inc 14 Direction tests" && git tag inc-14-green
```
- [ ] ≥ 22 tests, 100 % pass; criterion comment present
- [ ] Each of the four instances appears in every method's table
- [ ] No control flow in test bodies
- [ ] typecheck 0, lint 0/0, golden master 5,5,31,16,2,7,53,37 / 156, `check:classes` ≥ 16

---

**CRITICAL: Every instance's delta and both rotations are pinned by literal tables with identity checks, fromName's rejection is tested, and the reference rotation tests are ported; golden master stays 5,5,31,16,2,7,53,37 / 156.**
