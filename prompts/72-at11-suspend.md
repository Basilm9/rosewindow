# Prompt 72: AT-11 Suspend a Run

**CRITICAL: Create `tests/e2e/acceptance/at11-suspend.spec.ts` proving that while paused no game action can happen: a click outside the pause menu only closes it, and after Resume the board, held die, draft and counters are exactly as before.**

---

### INCREMENT 72: AT-11 acceptance test
- **Status:** Standard
- **Dependencies:** Prompts 49–51 (statechart `paused` rejects actions, NFR-6.5), 62 (harness), 58
- **Reference implementation:** `src/view/Menus.tsx` (`Sheet` scrim closes on click, `pause-menu`, `menu-resume`, `close-dialog`), `src/view/ScorePanel.tsx` (`game-menu`, aria `Pause menu`), `tests/e2e/mobile.spec.ts` ("the pause menu explains the rules and resumes play")
- **Context to attach:** `acceptance_tests.md` row AT-11, `mockups/07-pause-menu.png`, `mockups/03-legal-preview.png`
- **Requirements:** FR-17.1, 17.2; NFR-6.5

### MANDATORY: Sandwich Requirement
- **Start:** `/?seed=3`, Novice Rose, round 1, one die held (`draft-die-0` clicked); state read only through test ids and ARIA labels.
- **End:** Step-3 click places and picks up nothing; state after Resume equals state at step 1; two screenshots; `results.md` row.

### 1. Capability Specification
One acceptance spec; no production change.

### 2. Implementation Instructions
```typescript
// tests/e2e/acceptance/at11-suspend.spec.ts
interface Snapshot { cells: string[]; held: string | null; draft: string[];
  round: string; placementsLeft: string; recast: string; total: string }
async function snap(page: Page): Promise<Snapshot>;
const covered = (page: Page, testId: string) => page.evaluate((id) => {
  const r = document.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect();
  const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return top !== null && top.closest('[data-testid="pause-menu"], .scrim') !== null;
}, testId);
```
1. **Note:** `startSeeded(page, 3, 'novice-rose')`; click `draft-die-0`; `held-die` visible; `const s1 = await snap(page)`.
2. **Pause:** click `game-menu`; `pause-menu` visible (role `dialog`, name `Paused`). Assert `covered(page, 'draft-pool')` and `covered(page, 'refresh-dice')` are true (the menu covers the draft and recast). Shot `pause` → `MOCKUP.pause`.
3. **Click outside the menu:** pick a target that is visible outside the sheet: the first `gridcell` whose bounding box does not intersect the `pause-menu` box (a legal empty cell for the held die if one is visible; otherwise any draft die above the sheet). Click it with `page.mouse.click(x, y)` at its centre so the event goes to whatever is on top. Assert `pause-menu` count 0 and `snap(page)` toEqual `s1` (nothing placed, nothing picked up, held die unchanged). If no cell or die is visible outside the sheet at 1280×900, note it and click the scrim at the board's centre instead.
4. **Pause again and Resume:** click `game-menu`, then `menu-resume`; `pause-menu` count 0; `snap(page)` toEqual `s1`; `draft-die-0` enabled. Shot `resumed` → `MOCKUP.legal` (die still held, legal panes glowing).
5. `logResult` with URL `/?seed=3`; notes list the target clicked in step 3 and the coverage results. Compare with `07-pause-menu.png` (sheet over the tray, Resume / How to play / Today's daily window / New window, seed line) and `03-legal-preview.png`.

**Rules:** assertions compare whole snapshots against `s1`; no retries or conditional assertions after the target is chosen.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm e2e:acceptance -g "AT-11" && pnpm e2e
```
- [ ] Menu covers draft and recast while paused
- [ ] Outside click closes the menu only; state unchanged
- [ ] After Resume the state equals step 1
- [ ] `docs/acceptance/AT11/01-pause.png`, `02-resumed.png`
- [ ] Tracking matrix green; commit `test(e2e): inc 72 AT-11 suspend`, tag `inc-72-green`

---

**CRITICAL: Paused means no game action (NFR-6.5): the outside click only closes the menu and Resume restores the exact state; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
