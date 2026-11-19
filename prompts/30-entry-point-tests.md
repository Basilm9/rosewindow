# Prompt 30: EntryPoint Tests

**CRITICAL: Write `tests/model/EntryPoint.test.ts`, porting every `allEntryPoints` case from `tests/engine/types.test.ts` and adding branch-coverage cases for `allFor`, `isInwardFor`, `equals` and `toData`; the old test file must keep passing unchanged.**

---

### INCREMENT 30: EntryPoint unit tests
- **Status:** Standard
- **Dependencies:** Prompt 29
- **Reference implementation:** `tests/engine/types.test.ts` (`describe('allEntryPoints')`, 4 cases)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4, `SRS_rev1.4.txt` §3.5
- **Requirements:** FR-5.1, FR-5.2, NFR-1.1

### MANDATORY: Sandwich Requirement
- **Start:** The test file opens with a comment naming the **test-design criterion** and listing every case.
- **End:** All new and old tests pass; golden master unchanged; class count still **19**.

### 1. Capability Specification
Adds a Vitest suite for `EntryPoint`. No production code changes. `tests/engine/types.test.ts` stays as is until prompt 59.

### 2. Implementation Instructions
File `tests/model/EntryPoint.test.ts`. Header comment (mandatory):

```typescript
/**
 * Test-design criterion: BRANCH (EDGE) COVERAGE of EntryPoint.allFor — each of the four
 * edge conditions (row===0, col===last, row===last, col===0) taken true and false —
 * plus INPUT-DOMAIN PARTITIONING of isInwardFor (inward / outward / parallel-to-edge / interior).
 * Cases:
 *  A1 allFor(4) has 16 entries                       (all four branches)
 *  A2 corner (0,0) -> [south, east] in that order     (row===0 and col===0 true)
 *  A3 corner (0,3) -> [south, west]; (3,0) -> [north, east]; (3,3) -> [west, north]
 *  A4 interior cell (1,1) yields no entry             (all four branches false)
 *  A5 first five entries of allFor(4) equal a precomputed constant (order lock)
 *  A6 every entry of allFor(3), allFor(4), allFor(5) isInwardFor its size
 *  A7 every Direction is used at least once on 4x4
 *  I1 isInwardFor(4) table: (0,0,south) true; (0,0,north) false (outward);
 *     (0,1,east) false (parallel to its edge); (1,1,east) false (interior)
 *  E1 equals: same data true; different direction false
 *  D1 toData() returns { position:{row,col}, direction:'south' } plain object
 *  F1 instances are frozen
 * Error kinds: EntryPoint raises none (documented in prompt 29) — no throw test required.
 */
```

**JUnit-style rules (MANDATORY):**
- Fresh fixture per test (`const points = EntryPoint.allFor(4)` inside each `it`, or `beforeEach`).
- **No control flow inside a test** (`if`, `for`, `while`). Replace the reference loop "only admits directions that step inside the grid" with `it.each([3, 4, 5])` and `expect(EntryPoint.allFor(n).every(e => e.isInwardFor(n))).toBe(true)`.
- Compare against **precomputed constants**, e.g.

```typescript
const FIRST_FIVE_4X4 = [
  { position: { row: 0, col: 0 }, direction: 'south' },
  { position: { row: 0, col: 0 }, direction: 'east' },
  { position: { row: 0, col: 1 }, direction: 'south' },
  { position: { row: 0, col: 2 }, direction: 'south' },
  { position: { row: 0, col: 3 }, direction: 'south' },
] as const
expect(EntryPoint.allFor(4).slice(0, 5).map(e => e.toData())).toEqual(FIRST_FIVE_4X4)
```
(Verify the constant once by running the old `allEntryPoints(4)`; then freeze it in the file.)
- Let exceptions propagate; none are expected here.
- Ported cases keep their original names, suffixed `(ported from types.test.ts)`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/EntryPoint.test.ts tests/engine/types.test.ts
pnpm typecheck && pnpm lint && pnpm test
git add tests/model && git commit -m "test(model): inc 30 EntryPoint tests" && git tag inc-30-green
```
- [ ] Criterion comment present and lists A1–F1
- [ ] 4 reference cases ported; ≥ 11 tests total, 100 % pass
- [ ] No `if`/`for`/`while` inside any `it` body (`grep -nE "^\s+(if|for|while) \(" tests/model/EntryPoint.test.ts` prints only helper lines)
- [ ] Golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 19; lint 0/0

---

**CRITICAL: EntryPoint tests lock the S/W/N/E row-major order with a precomputed constant, port all reference cases, and leave the golden master at 5,5,31,16,2,7,53,37 / 156.**
