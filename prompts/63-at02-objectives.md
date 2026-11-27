# Prompt 63: AT-02 Review the Objectives Mid-Run

**CRITICAL: Create `tests/e2e/acceptance/at02-objectives.spec.ts` proving the goal sheet shows three public objectives and one private colour objective, that opening it changes nothing, and that a placement raises the affected objective's points.**

---

### INCREMENT 63: AT-02 acceptance test
- **Status:** Standard
- **Dependencies:** Prompt 62 (harness), 58
- **Reference implementation:** `tests/e2e/mobile.spec.ts` ("tapping goal chips…"), `src/view/Objectives.tsx` (`objectives`, `objective-<id>`, `.goal-row`, `.goal-row__tag`), `src/view/Menus.tsx` (`Sheet`, `close-dialog`)
- **Context to attach:** `acceptance_tests.md` row AT-02, `mockups/06-goal-sheet.png`, `mockups/02-board-round1.png`
- **Requirements:** FR-2.1 to 2.3, 2.6

### MANDATORY: Sandwich Requirement
- **Start:** Use only the harness from prompt 62 (`freshPage`, `startSeeded`, `ShotLog`, `logResult`); precondition is AT-01 done: `/?seed=3`, Novice Rose chosen, round 1.
- **End:** The spec passes, two screenshots are saved and the result row is appended to `docs/acceptance/results.md`.

### 1. Capability Specification
Adds one acceptance spec. No production code changes. Steps and expectations come only from row AT-02.

### 2. Implementation Instructions
```typescript
// tests/e2e/acceptance/at02-objectives.spec.ts
import { test, expect } from '@playwright/test';
import { freshPage, startSeeded, ShotLog, logResult } from './harness';
test('AT-02 review the objectives mid-run', async ({ browser }) => { /* steps below */ });
```
**URL:** `/?seed=3` → `pattern-novice-rose`.

1. **Open the goal sheet:** snapshot the 16 `gridcell` aria-labels, `draft-die-*` labels and `beam-total`. Click `objectives`. In `goals-sheet` assert exactly 4 `.goal-row`; read the names and scoring-rule text of each row; the three public names are pairwise different; exactly one row has `.goal-row--secret` and its tag reads `Only you`; that row names a colour. Record each row's `.goal-row__pts`. Shot `goals-before` → `MOCKUP.goals`.
2. **Close it:** click `close-dialog`; `goals-sheet` count 0. Re-read the snapshot from step 1 and assert it is identical (opening and closing changes nothing).
3. **Place a die that adds to one objective:** compute it with the model, never by guessing. Build `const replica = fastForward(3, 1); replica.choosePattern('novice-rose')`; for each legal pair from `legalPairs(replica)` (`src/util/autoPlayer.ts`) place it on a throw-away replica and recompute the objective lines through the same scoring path the view uses (`ScoreCalculator` from `src/model`); choose the first pair that raises any objective's current points and note which objective. Perform that pair in the UI: `getByRole('button', { name: 'select <color> <value>' }).first()` then `cell-r<r>c<c>`.
4. **Open the goal sheet again:** click `objectives`; the noted objective's `.goal-row__pts` is greater than in step 1; the other rows are unchanged unless the model says otherwise. Shot `goals-after` → `MOCKUP.goals`.
5. `logResult({ at: 'AT-02', result, urls, shots, notes })`: notes list the objective names, which one rose and from what to what. Compare both PNGs with `06-goal-sheet.png` (layout, wording "Goals", lede text, "Only you" tag) and note differences.

**Rules:** no `if`/loops in assertions except the model-side search in step 3; constants (objective names) read once and compared, not re-derived in the UI.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm e2e:acceptance -g "AT-02" && pnpm e2e
```
- [ ] Tracking matrix: 0 type errors, lint green, e2e 100 %, golden master unchanged, class count ≥ 36
- [ ] `docs/acceptance/AT02/01-goals-before.png`, `02-goals-after.png` saved
- [ ] Board snapshot identical after open/close
- [ ] `results.md` row: AT-02, Pass or Fail F-nn, URL `/?seed=3`, mockup `06-goal-sheet.png`
- [ ] Commit `test(e2e): inc 63 AT-02 objectives`, tag `inc-63-green`

---

**CRITICAL: Three public + one "Only you" private objective, no side effects from viewing, points rise after a scoring placement; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
