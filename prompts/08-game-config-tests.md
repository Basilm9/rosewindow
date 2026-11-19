# Prompt 08: GameConfig Tests

**CRITICAL: Write `tests/model/GameConfig.test.ts` that pins every default, the seed-normalization partitions, deep immutability and the `invalidArgument` rejection. Import only from `src/model/`; port every case of `tests/engine/config.test.ts` and the GameConfig case of `tests/engine/classes.test.ts`.**

---

### INCREMENT 08: GameConfig unit tests
- **Status:** Standard
- **Dependencies:** Prompts 05–07
- **Reference implementation:** `tests/engine/config.test.ts`, `tests/engine/classes.test.ts` ("creates immutable run parameters…")
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 1)
- **Requirements:** FR-1.6, NFR-4.4, FR-8.4

### MANDATORY: Sandwich Requirement
- **Start:** Header comment names the criterion: **input-domain partitioning** of the `seed` argument and of each override field.
- **End:** All tests pass; the legacy engine tests remain untouched and green.

### 1. Capability Specification
Tests only. Location `tests/model/GameConfig.test.ts`; imports `GameConfig`, `createGameConfig`, `PROVISIONAL_TIERS`, `DEFAULT_MULTIPLIER_CAP` from `../../src/model/GameConfig` and `GameError` from `../../src/model/GameError`.

### 2. Implementation Instructions
Header comment:
```typescript
/**
 * Test-design criterion: input-domain partitioning.
 * seed partitions: non-finite (NaN, +Infinity) → 0; negative (-1) → 4294967295;
 *   fractional (3.8) → 3; above 2^32 (4294967299) → 3; in range (7) → 7.
 * override partitions: absent (defaults), valid positive integer, zero, negative,
 *   non-integer, tiers increasing, tiers not increasing.
 */
```

**Cases:**
| # | Input | Expected constant |
| --- | --- | --- |
| 1–5 | `it.each` over the five seed partitions above | `createGameConfig(seed).seed` equals the precomputed value |
| 6 | `createGameConfig(7)` | `toMatchObject({seed:7, rounds:8, gridSize:4, draftSize:5, placementsPerRound:2, copiesPerDie:3, multiplierCap:5})` |
| 7 | defaults | `config.tiers` `toEqual({bronze:40, silver:65, gold:90})`; `DEFAULT_MULTIPLIER_CAP === 5` |
| 8 | 90-die bag | `5 * 6 * createGameConfig(7).copiesPerDie === 90` |
| 9 | overrides `{rounds:4, tiers:{1,2,3}}` | rounds 4, tiers `{1,2,3}`, seed 7, gridSize 4 |
| 10 | `createGameConfig(-1, {tiers})` then `tiers.gold = 999` | `config.tiers.gold === 30`; `instanceof GameConfig` |
| 11 | frozen | `Object.isFrozen(config)` and `Object.isFrozen(config.tiers)` both `true` |
| 12 | provisional ordering | `PROVISIONAL_TIERS.bronze < silver < gold` (two assertions) |
| 13–16 | `it.each([['rounds',0],['draftSize',-1],['gridSize',2.5],['multiplierCap',0]])` | `expect(() => new GameConfig(1, {[field]: value})).toThrow(GameError)` |
| 17 | tiers `{bronze:50, silver:40, gold:90}` | `toThrow(GameError)` and `toThrow(/invalid argument/)` |
| 18 | seed override attempt via cast `{ seed: 9 } as never` | `.seed === 1` (seed cannot be overridden) |

Error kinds raised by `GameConfig`: only `invalidArgument` → cases 13–17 cover it (one test per field family plus tiers).

**Ported from the reference:** every `it` in `config.test.ts` (cases 1–9, 12) and "creates immutable run parameters without retaining mutable tier overrides" from `classes.test.ts` (cases 10–11). None may be dropped.

**JUnit-style rules:**
- A fresh `GameConfig` inside every `it`; no `beforeAll` sharing a mutable fixture.
- No `if`/`for`/`try` inside tests; partitions go through `it.each`.
- Compare to literal constants (8, 4, 5, 2, 3, 40, 65, 90), not to other config fields.
- Exceptions: `expect(() => …).toThrow(GameError)`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/GameConfig.test.ts
pnpm typecheck && pnpm lint && pnpm test
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "test(model): inc 08 GameConfig tests" && git tag inc-08-green
```
- [ ] ≥ 18 tests, 100 % pass; header criterion comment present
- [ ] One test per seed partition and per invalid-override partition
- [ ] No control flow inside test bodies
- [ ] typecheck 0, lint 0/0, golden master 5,5,31,16,2,7,53,37 / 156, `check:classes` ≥ 15

---

**CRITICAL: Every default, every seed partition, deep immutability and the invalidArgument rejection are pinned by constants; all reference config tests are ported; golden master stays 5,5,31,16,2,7,53,37 / 156.**
