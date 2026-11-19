# Prompt 73: AT-12 First-Time Tutorial

**CRITICAL: Create `tests/e2e/acceptance/at12-tutorial.spec.ts` proving the first-launch tutorial appears, advances when the taught action is performed, covers drafting, placement, beam, lockout and objectives, stays away after being skipped and reloaded, can be asked for again from the menu, and never shows on a `?seed=3` run.**

---

### INCREMENT 73: AT-12 acceptance test
- **Status:** Standard
- **Dependencies:** Prompts 62 (harness), 58
- **Reference implementation:** `tests/e2e/tutorial.spec.ts`, `src/view/TutorialOverlay.tsx` (`tutorial-card`, `tutorial-next`, `tutorial-skip`), tutorial steps (`TUTORIAL_STEPS`: Welcome, glazier / Draft a die / Place it / The beam / Lockout & multiplier / Objectives & the end, "n/6"), storage key `rosewindow-tutorial`, `src/view/Menus.tsx` (`tutorial-replay` → `rules-sheet`)
- **Context to attach:** `acceptance_tests.md` row AT-12, `mockups/10-tutorial.png`, `mockups/02-board-round1.png`
- **Requirements:** FR-9.1 to 9.5; NFR-5.8

### MANDATORY: Sandwich Requirement
- **Start:** A browser with no stored game data, opened at plain `/` (no seed). Two fresh contexts: A walks the whole tutorial, B skips partway.
- **End:** A screenshot of every tutorial step, the board after reload, the menu-requested tutorial and the seeded run; `results.md` row.

### 1. Capability Specification
One acceptance spec with two tests sharing one `ShotLog('AT12')`; no production change.

### 2. Implementation Instructions
```typescript
// tests/e2e/acceptance/at12-tutorial.spec.ts
const TOPICS = ['Draft a die', 'Place it', 'The beam', 'Lockout', 'Objectives'] as const;
```
**Context A, URL `/`:**
1. **Open and start:** `tutorial-card` contains `Welcome, glazier` and `1/6`; `tutorial-next` count 0. Shot `step1` → `MOCKUP.tutorial`. Click the first `pattern-*`.
2. **Do what each step asks:** `Draft a die` (2/6) with no `tutorial-next` → click `draft-die-0`; `Place it` with no `tutorial-next` → click the first `[role="gridcell"][data-legal="true"]`; then `The beam` (4/6), `Lockout & multiplier`, `Objectives & the end`. Shot every card (`step2` … `step6`) → `MOCKUP.tutorial`. Assert the five `TOPICS` were shown. The three action steps must advance only by the action: if any of them shows `tutorial-next` or needs a click on it, record **Fail** with the next fault ID. The three information steps have no action to perform and advance with `tutorial-next`; note that in the results row for the reviewer.
3. After the last card, `tutorial-card` count 0.

**Context B (fresh), URL `/`:**
4. **Skip partway and reload:** choose the first pattern, click `draft-die-0` (card now `Place it`), click `tutorial-skip`; `tutorial-card` count 0; `page.reload()`; `glass-board` visible, `tutorial-card` count 0. Shot `after-reload` → `MOCKUP.board`.
5. **Ask for it again from the menu:** click `game-menu` then `tutorial-replay`. Assert the tutorial content is back: `tutorial-card` or `rules-sheet` is visible, and together its text covers drafting/placement (`Build the window`), beam (`Bend the light`), lockout and objectives/scoring. Record which element appeared. Shot `replay` → `MOCKUP.tutorial`. Close with `close-dialog`.
6. **Seeded run:** `page.goto('/?seed=3')`; choose `pattern-novice-rose`; `tutorial-card` count 0. Shot `seeded` → `MOCKUP.board`.
7. `logResult` with URLs `/`, `/` (reload), `/?seed=3`; compare step shots with `10-tutorial.png` (coach card wording, step counter, Skip control) and board shots with `02-board-round1.png`.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm e2e:acceptance -g "AT-12" && pnpm e2e
```
- [ ] Action steps advance on the action, no OK button
- [ ] Skipped tutorial does not return after reload; returns from the menu; absent on `?seed=3`
- [ ] `docs/acceptance/AT12/01-step1.png` … `06-step6.png`, `07-after-reload.png`, `08-replay.png`, `09-seeded.png`
- [ ] Tracking matrix green; commit `test(e2e): inc 73 AT-12 tutorial`, tag `inc-73-green`

---

**CRITICAL: The tutorial teaches by doing, respects skip across reloads, can be replayed, and never interrupts seeded runs; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
