# Prompt 10: SeededRandom Tests

**CRITICAL: Write `tests/model/SeededRandom.test.ts` that freezes the mulberry32 stream and the Fisher–Yates order against PRECOMPUTED constants, so any change to the randomness source fails a unit test before it can move the golden master. Port every test in `tests/engine/rng.test.ts` and the SeededRandom case of `tests/engine/classes.test.ts`.**

---

### INCREMENT 10: SeededRandom unit tests
- **Status:** Standard
- **Dependencies:** Prompts 05, 07, 09
- **Reference implementation:** `tests/engine/rng.test.ts`, `tests/engine/classes.test.ts` ("keeps the original mulberry32 stream…")
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 2)
- **Requirements:** FR-1.4, FR-1.6, NFR-1.1, NFR-1.2

### MANDATORY: Sandwich Requirement
- **Start:** Header comment names the criterion: **input-domain partitioning** of `seed` and of `sample`'s `count`, plus **branch coverage** of `sample`'s validation.
- **End:** All tests pass and the engine `rng.test.ts` is untouched and green.

### 1. Capability Specification
Tests only, in `tests/model/SeededRandom.test.ts`, importing `SeededRandom`, `mulberry32`, `normalizeSeed` from `../../src/model/SeededRandom` and `GameError` from `../../src/model/GameError`.

### 2. Implementation Instructions
Header comment:
```typescript
/**
 * Criterion: input-domain partitioning + branch coverage of sample().
 * seed: in range (3, 42), above 2^32 (4294967299 ≡ 3), non-finite (NaN ≡ 0).
 * count: 0, 1..n (valid), n+1 (too many), -1 (negative), 1.5 (non-integer).
 */
```

**Precomputed constants (generated once from the reference; paste literally):**
```typescript
const SEED3_FIRST3 = [0.7202267837710679, 0.03866216051392257, 0.4561921926215291]
const SEED42_FIRST3 = [0.6011037519201636, 0.44829055899754167, 0.8524657934904099]
const SEED0_FIRST = 0.26642920868471265
const SHUFFLE_1_8_SEED42 = [3, 8, 2, 1, 7, 6, 4, 5]
const SAMPLE_AF_3_SEED42 = ['b', 'a', 'e']
```

**Cases:**
| # | Case | Expected |
| --- | --- | --- |
| 1 | `new SeededRandom(3)`, three `next()` | `toEqual(SEED3_FIRST3)` |
| 2 | `new SeededRandom(4294967299)` | `seed === 3`; detached `const n = r.next`, `[n(),n(),n()]` equals `SEED3_FIRST3` |
| 3 | `mulberry32(42)` three calls | `SEED42_FIRST3` |
| 4 | `new SeededRandom(Number.NaN).next()` | `SEED0_FIRST` |
| 5 | independent instances: advance `a` twice, then `new SeededRandom(3).next()` | `SEED3_FIRST3[0]` |
| 6 | range: `Array.from({length: 1000}, r.next)` on seed 7 | `Math.min(...v) >= 0` and `Math.max(...v) < 1` |
| 7 | different seeds 1 vs 2, two draws each | `not.toEqual` |
| 8 | `SeededRandom.shuffled([1..8], mulberry32(42))` | `SHUFFLE_1_8_SEED42` |
| 9 | instance `new SeededRandom(42).shuffled([1..8])` | same constant (instance ≡ static) |
| 10 | shuffle leaves input untouched; permutation | input still `[1,2,3,4,5]`; sorted output equals input |
| 11 | every element reaches the front in seeds 0..199 | `new Set(Array.from({length:200}, (_, s) => SeededRandom.shuffled([0,1,2,3,4], mulberry32(s))[0])).size === 5` |
| 12 | `SeededRandom.sample(['a'..'f'], 3, mulberry32(42))` | `SAMPLE_AF_3_SEED42` |
| 13 | `sample(items, 0, …)` | `[]` |
| 14–16 | `it.each([3, -1, 1.5])` count on `[1, 2]` | `expect(() => SeededRandom.sample([1,2], c, mulberry32(1))).toThrow(GameError)` |
| 17 | message | `toThrow(/invalid argument/)` |
| 18 | `normalizeSeed` partitions via `it.each` | `(-1 → 4294967295), (3.8 → 3), (Infinity → 0)` |

Error kinds raised: only `invalidArgument` (cases 14–17), one test per invalid partition.

**Ported tests (none dropped):** `rng.test.ts` "is deterministic for the same seed" (3), "produces values in [0, 1)" (6, loop replaced by `Array.from`), "different sequences" (7), `shuffled` determinism / permutation / front coverage (8, 10, 11), `sample` distinct+deterministic (12) and "throws when sampling more than available" (14); `classes.test.ts` stream + independence (1, 2, 5).

**JUnit-style rules:** fresh `SeededRandom` per test; no `for`/`if`/`try` in test bodies (build data with `Array.from` or `it.each`); assert against the constants above, never by re-running a second generator as the oracle (except case 7, a stated inequality); exceptions via `toThrow(GameError)`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/SeededRandom.test.ts
pnpm typecheck && pnpm lint && pnpm test
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "test(model): inc 10 SeededRandom tests" && git tag inc-10-green
```
- [ ] ≥ 18 tests, 100 % pass; criterion comment present
- [ ] Every constant above appears literally in the file
- [ ] No control flow in test bodies
- [ ] typecheck 0, lint 0/0, golden master 5,5,31,16,2,7,53,37 / 156, `check:classes` ≥ 15

---

**CRITICAL: The mulberry32 stream and the shuffle order are frozen by literal constants and every reference RNG test is ported; golden master stays 5,5,31,16,2,7,53,37 / 156.**
