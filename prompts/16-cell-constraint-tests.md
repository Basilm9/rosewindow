# Prompt 16: CellConstraint Tests

**CRITICAL: Write `tests/model/CellConstraint.test.ts` that pins the acceptance table of all three constraint classes against a fixed set of dice, their own-data shape, immutability, `describe()` texts and one rejection test per invalid constructor argument. Port the constraint case of `tests/engine/classes.test.ts`.**

---

### INCREMENT 16: CellConstraint unit tests
- **Status:** Standard
- **Dependencies:** Prompts 05, 11, 15
- **Reference implementation:** `tests/engine/classes.test.ts` ("loads printed demands as immutable constraint classes with their own acceptance rules")
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (rows 5–7)
- **Requirements:** FR-4.4, FR-4.5, FR-1.2

### MANDATORY: Sandwich Requirement
- **Start:** Header comment names the criterion: **input-domain partitioning** of the die relative to the demand — (same color, same value), (other color, same value), (same color, other value), (other color, other value) — for each of the three classes.
- **End:** All tests pass; legacy constraint tests untouched and green.

### 1. Capability Specification
Tests only: `tests/model/CellConstraint.test.ts`. Imports `OpenConstraint`, `ColorConstraint`, `ValueConstraint`, type `CellConstraint` from `../../src/model/CellConstraint`; `Die` from `../../src/model/Die`; `GameError` from `../../src/model/GameError`. Variables are declared as `CellConstraint` (course SOLID rule), e.g. `const demand: CellConstraint = new ColorConstraint('red')`.

### 2. Implementation Instructions
Header comment:
```typescript
/**
 * Criterion: input-domain partitioning of (die, demand).
 * Dice: RED3 (match both), BLUE3 (other color, same value), RED4 (same color,
 * other value), BLUE4 (neither). Demands: Color(red), Value(3), Open.
 * Invalid constructor partitions: unknown color; value 0, 7, 2.5.
 */
```

Acceptance oracle (literal; mirrors the reference `[true,false,true]` rows):
```typescript
const TABLE = [
  ['color red', true,  false, true,  false],
  ['value 3',   true,  true,  false, false],
  ['open',      true,  true,  true,  true ],
] as const   // columns: RED3, BLUE3, RED4, BLUE4
```

**Cases:**
| # | Case | Expected |
| --- | --- | --- |
| 1–12 | `it.each` over the 3×4 table (fresh demand + die per row) | `demand.accepts(die)` equals the table cell |
| 13 | plain data | `new ColorConstraint('red').accepts({ color: 'red', value: 6 })` is `true` |
| 14–16 | own data | `toEqual({kind:'color', color:'yellow'})`, `toEqual({kind:'value', value:4})`, `Object.keys(new OpenConstraint())` equals `['kind']` |
| 17 | frozen | all three instances `Object.isFrozen` |
| 18–20 | `describe()` | `'must be yellow'`, `'must show 4'`, `'open'` |
| 21 | substitutability | `const demands: CellConstraint[] = [new OpenConstraint(), new ColorConstraint('red'), new ValueConstraint(3)]`; `demands.map(d => d.kind)` equals `['open','color','value']` |
| 22 | unknown color | `expect(() => new ColorConstraint('pink' as never)).toThrow(GameError)` |
| 23–25 | `it.each([0, 7, 2.5])` | `expect(() => new ValueConstraint(v)).toThrow(GameError)` |
| 26 | message | `expect(() => new ValueConstraint(7)).toThrow(/invalid argument/)` |
| 27 | each value 1–6 accepted | `it.each([1,2,3,4,5,6])` construct without throwing, `.value` equals input |

Error kinds raised: only `invalidArgument` — one test per invalid partition (22–26).

**Ported (none dropped):** the reference case parses `['R3.', '...', '...']`; port its three acceptance rows and the frozen check as cases 1–12 and 17. The parse step itself is re-ported with `WindowPattern` in Prompt 18; here construct the instances directly.

**JUnit-style rules:** fresh objects inside each test; no `if`/`for`/`try`; compare against `TABLE` and literal strings; exceptions with `toThrow(GameError)`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/CellConstraint.test.ts
pnpm typecheck && pnpm lint && pnpm test
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "test(model): inc 16 CellConstraint tests" && git tag inc-16-green
```
- [ ] ≥ 27 tests, 100 % pass; criterion comment present
- [ ] All 12 cells of the acceptance table asserted
- [ ] No control flow in test bodies
- [ ] typecheck 0, lint 0/0, golden master 5,5,31,16,2,7,53,37 / 156, `check:classes` ≥ 16

---

**CRITICAL: The full 3×4 acceptance table, own-data shape, immutability and every invalid-argument partition are pinned with literal constants; golden master stays 5,5,31,16,2,7,53,37 / 156.**
