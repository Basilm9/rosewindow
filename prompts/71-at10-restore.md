# Prompt 71: AT-10 Interrupt and Restore

**CRITICAL: Create `tests/e2e/acceptance/at10-restore.spec.ts` proving that reloading plain `localhost:5173` restores an interrupted run automatically (no prompt) within 1 s exactly as it was, and that a finished run is not restored.**

---

### INCREMENT 71: AT-10 acceptance test
- **Status:** Standard
- **Dependencies:** Prompts 55 (RunRecorder), 62 (harness), 58
- **Reference implementation:** `src/progression/RunRecorder.ts` (was `hooks/runSession.ts`: storage key `rosewindow-active-v1`, restore by replaying validated actions), `src/App.tsx` (boot order: link → saved run → fresh window), `tests/e2e/beam-resume.spec.ts`, `tests/e2e/mobile.spec.ts` ("a placed die survives…")
- **Context to attach:** `acceptance_tests.md` row AT-10, `mockups/02-board-round1.png`, `mockups/01-setup.png`
- **Requirements:** FR-12.2, 12.3, 12.5; NFR-1.7, NFR-3.6

### MANDATORY: Sandwich Requirement
- **Start:** Run started from `/?seed=3` (Novice Rose) in a clean profile; moves mirrored from the max-flex replica, with the one recast used.
- **End:** The restored state equals the noted state field by field; restore time ≤ 1000 ms; a finished run gives a new window; `results.md` row.

### 1. Capability Specification
One acceptance spec; no production change. FR-12.2 is the reworded automatic restore (fault F-02 resolved): there must be **no** restore prompt or dialog.

### 2. Implementation Instructions
```typescript
// tests/e2e/acceptance/at10-restore.spec.ts
interface RunState { cells: string[]; rounds: string[]; total: string; round: string;
  placementsLeft: string; recast: string; draft: string[]; held: string | null }
async function readState(page: Page): Promise<RunState>;   // gridcell labels, round-scores labels,
// beam-total, round-indicator, "N left to place this round" label, refresh-dice aria, draft-die labels, held-die label
test.setTimeout(240_000);
```
1. **Play into round 3, using the recast:** `startSeeded(page, 3, 'novice-rose')`; `playMoves(page, replica, 2)` (round 1); at the start of round 2 click `refresh-dice` and call `replica.refreshDraft()`; `playMoves(page, replica, 3)`; then place one die of round 3 from `bestPair` so the state is mid-round. Assert `round-indicator` `ROUND 3/8` and `Reroll dice, 0 left`.
2. **Note:** `const before = await readState(page)`. Shot `before-reload` → `MOCKUP.board`.
3. **Load plain `/`:** `const t0 = Date.now(); await page.goto('/'); await expect(page.locator('[data-testid="glass-board"][aria-busy="false"]')).toBeVisible(); const ms = Date.now() - t0;` Assert `ms <= 1000`, `getByRole('dialog')` count 0, no `tutorial-card`, no `pattern-*` buttons, and `readState(page)` toEqual `before`. Also assert `page.url()` has no `seed=` parameter. Shot `restored` → `MOCKUP.board`.
4. **Finish and reload:** continue `playMoves(page, replica, 'end')`; `game-over` visible; then `page.goto('/')`. Assert two `pattern-*` buttons (a new window), no `game-over`, and the setup's `Window #N` text present (any N). Shot `new-window` → `MOCKUP.setup`.
5. `logResult` with URLs `/?seed=3`, `/`, `/`; notes record `ms` and the noted round/score/recast count. Compare with `02-board-round1.png` and `01-setup.png`.

**Measure fairly:** run against the dev server already warmed by step 1; report `ms` even on Pass so NFR-1.7 has evidence.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm e2e:acceptance -g "AT-10" && pnpm e2e
```
- [ ] Restored state identical (board, scores, round, placements left, recast count, draft)
- [ ] Restore ≤ 1000 ms with no prompt
- [ ] Finished run is not restored
- [ ] `docs/acceptance/AT10/01-before-reload.png`, `02-restored.png`, `03-new-window.png`
- [ ] Tracking matrix green; commit `test(e2e): inc 71 AT-10 restore`, tag `inc-71-green`

---

**CRITICAL: Restore is automatic, exact and under 1 s, rebuilt by replaying validated actions, and never revives a finished run; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
