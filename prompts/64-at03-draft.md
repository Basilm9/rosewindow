# Prompt 64: AT-03 Draft, Swap and Return a Die

**CRITICAL: Create `tests/e2e/acceptance/at03-draft.spec.ts` proving that selecting, swapping and returning a die moves exactly one die between draft and hand and never spends a placement.**

---

### INCREMENT 64: AT-03 acceptance test
- **Status:** Standard
- **Dependencies:** Prompt 62 (harness), 58
- **Reference implementation:** `src/view/DraftPool.tsx` (`draft-pool`, `draft-die-<i>`, `held-die`, aria `select <color> <value>` / `<color> <value> selected, tap to put back`), `tests/e2e/phase8.spec.ts` (`draft-hint` texts)
- **Context to attach:** `acceptance_tests.md` row AT-03, `mockups/02-board-round1.png`, `mockups/03-legal-preview.png`
- **Requirements:** FR-3.1 to 3.3, 3.6

### MANDATORY: Sandwich Requirement
- **Start:** Fresh context from the harness, `/?seed=3`, Novice Rose, start of round 1; drive the UI only via test ids and ARIA names.
- **End:** Four screenshots (one after each step), all counts asserted against constants, result appended to `docs/acceptance/results.md`.

### 1. Capability Specification
One acceptance spec; no production code changes. Expectations are exactly those of row AT-03.

### 2. Implementation Instructions
```typescript
// tests/e2e/acceptance/at03-draft.spec.ts
import { test, expect } from '@playwright/test';
import { freshPage, startSeeded, ShotLog, logResult } from './harness';
const draft = (page: Page) => page.locator('button[data-testid^="draft-die-"]');
const PLACEMENTS = (n: number) => `${n} left to place this round`;
```
**URL:** `/?seed=3`, then `pattern-novice-rose`.

| Step | Action | Assertions | Shot → mockup |
| --- | --- | --- | --- |
| 1 Count | read `draft` labels into `opening` | count 5; `held-die` count 0; label `PLACEMENTS(2)` | `count` → `MOCKUP.board` |
| 2 Select | click `draft-die-0` (die A = `opening[0]`) | `held-die` visible with label `<A> selected, tap to put back`; `draft` count 4; `draft-hint` contains `in hand` | `select` → `MOCKUP.legal` |
| 3 Swap | click a draft die B with a different label from A | `held-die` label is B's; `draft` count still 4; A's `select <A>` button is back in the tray | `swap` → `MOCKUP.legal` |
| 4 Return | click `held-die` | `held-die` count 0; `draft` count 5; the multiset of `draft` labels equals `opening`; label `PLACEMENTS(2)`; `draft-hint` contains `Draft a die` | `return` → `MOCKUP.board` |

Also assert at every step that no `gridcell` aria-label contains ` die` (nothing placed) and `round-indicator` stays `ROUND 1/8`.

**Swap behaviour note:** if the build requires returning A before B can be picked (B disabled while holding), the row's step 3 cannot be performed: record **Fail** with the next fault ID and note "swap not supported" rather than changing the steps.

Finish with `logResult({ at: 'AT-03', result, urls: ['/?seed=3'], shots, notes })`; compare the step-2/3 PNGs with `03-legal-preview.png` (held die raised in the tray, legal panes glowing in its colour) and the step-1/4 PNGs with `02-board-round1.png`.

**Rules:** fresh fixture per test, no control flow in assertions, labels compared as sorted arrays.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm e2e:acceptance -g "AT-03" && pnpm e2e
```
- [ ] Tracking matrix green; golden master unchanged; class count ≥ 36
- [ ] `docs/acceptance/AT03/01-count.png` … `04-return.png` saved
- [ ] Draft count sequence 5 → 4 → 4 → 5; placements remaining 2 at the end
- [ ] `results.md` row with URL and mockups `02-board-round1.png`, `03-legal-preview.png`
- [ ] Commit `test(e2e): inc 64 AT-03 draft`, tag `inc-64-green`

---

**CRITICAL: Drafting, swapping and returning never consume a placement or change the window; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
