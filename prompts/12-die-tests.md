# Prompt 12: Die Tests

**CRITICAL: Write `tests/model/Die.test.ts` covering immutability, color+value equality (including plain JSON data), the fixed `DIE_COLORS` order and one rejection test per invalid-argument partition. Import only from `src/model/`; port the Die case of `tests/engine/classes.test.ts`.**

---

### INCREMENT 12: Die unit tests
- **Status:** Standard
- **Dependencies:** Prompts 05, 09, 11
- **Reference implementation:** `tests/engine/classes.test.ts` ("draws immutable Die instances that still match serialized color/value data")
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 3)
- **Requirements:** FR-3.2, FR-4.3, NFR-2.6

### MANDATORY: Sandwich Requirement
- **Start:** Header comment names the criterion: **input-domain partitioning** of `color` (each of 5 valid, one invalid) and `value` (below 1, 1, 2–5, 6, above 6, non-integer, NaN).
- **End:** All tests pass; legacy suites still green.

### 1. Capability Specification
Tests only: `tests/model/Die.test.ts`, importing `Die`, `DIE_COLORS` from `../../src/model/Die`, and `GameError` from `../../src/model/GameError`. No `DiceBag` is used here (the bag-draw part of the reference case is ported in Prompt 24).

### 2. Implementation Instructions
Header comment:
```typescript
/**
 * Criterion: input-domain partitioning.
 * color: red | yellow | blue | green | purple (valid), 'pink' (invalid).
 * value: 0 (below), 1 (min), 3 (interior), 6 (max), 7 (above), 2.5 (non-integer), NaN.
 * equality: same color+value; differs in color; differs in value; plain data vs instance.
 */
```

**Cases:**
| # | Case | Expected constant |
| --- | --- | --- |
| 1 | `DIE_COLORS` | `toEqual(['red','yellow','blue','green','purple'])` |
| 2–6 | `it.each(DIE_COLORS)` construct `new Die(color, 3)` | `.color === color`, `.value === 3` |
| 7–9 | `it.each([1, 3, 6])` valid values | `.value` equals input |
| 10 | frozen | `Object.isFrozen(new Die('red', 3)) === true` |
| 11 | JSON shape | `JSON.stringify(new Die('blue', 5)) === '{"color":"blue","value":5}'` |
| 12 | JSON round trip | `Die.equals(die, JSON.parse(JSON.stringify(die)))` is `true` |
| 13 | different value | `Die.equals(new Die('red',3), { color:'red', value:7 })` is `false` |
| 14 | different color | `Die.equals(new Die('red',3), new Die('blue',3))` is `false` |
| 15 | plain data assignable | a plain `{color:'red', value:3}` object type-checks where a `Die` is expected (no instance `equals` exists) and `Die.equals(new Die('red',3), {color:'red',value:3})` is `true` |
| 16 | `Die.from({color:'green', value:2})` | `instanceof Die`, equals input |
| 17 | `toString()` | `'red 3'` |
| 18 | `Die.MIN_VALUE`, `Die.MAX_VALUE` | `1`, `6` |
| 19 | bad color | `expect(() => new Die('pink' as never, 3)).toThrow(GameError)` |
| 20–23 | `it.each([0, 7, 2.5, Number.NaN])` bad value | `expect(() => new Die('red', v)).toThrow(GameError)` |
| 24 | message | `expect(() => new Die('red', 7)).toThrow(/invalid argument: die value 7/)` |
| 25 | `Die.from({color:'red', value:9})` | `toThrow(GameError)` (untrusted data path, NFR-2.6) |

Error kinds raised by `Die`: only `invalidArgument` — one test per invalid partition (19–25).

**Ported (none dropped):** from `classes.test.ts`: instance check (16), frozen (10), JSON round-trip equality (12), value-7 inequality (13). Replace the bag draw in the original with a directly constructed `new Die('blue', 5)`; the bag-specific part is ported in Prompt 24.

**JUnit-style rules:** construct a fresh `Die` in each test; no `if`/`for`/`try` in test bodies (use `it.each`); compare to literal constants; exceptions with `toThrow(GameError)`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/Die.test.ts
pnpm typecheck && pnpm lint && pnpm test
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "test(model): inc 12 Die tests" && git tag inc-12-green
```
- [ ] ≥ 25 tests, 100 % pass; criterion comment present
- [ ] One test per invalid color/value partition
- [ ] No control flow in test bodies
- [ ] typecheck 0, lint 0/0, golden master 5,5,31,16,2,7,53,37 / 156, `check:classes` ≥ 15

---

**CRITICAL: Die immutability, color+value equality with plain data, the DIE_COLORS order and every invalid-argument partition are pinned by constants; golden master stays 5,5,31,16,2,7,53,37 / 156.**
