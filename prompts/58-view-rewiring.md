# Prompt 58: View Rewiring (state only through GameController and useModelEvents)

**CRITICAL: Rewire every React view so it receives state only through `GameController` (snapshot + read model + queries) and model events only through `useModelEvents`, and sends every gesture to a controller — no view imports `src/engine`, `src/machine`, `src/hooks/useGame` or calls a model mutator. The screenshots in `mockups/` are authoritative: every screen keeps the same layout, wording and visual style. Fix F-03 (grid rows, 1-based labels). Golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**

---

### INCREMENT 58: View rewiring
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompts 03, 50, 53, 55, 56, 57
- **Reference implementation:** `src/hooks/useGame.ts` (all presentation state: `rejection`, `lastPlaced`, `lastLit`, `shakeKey`, `forfeitNotice`, `beam`, `litCells`, `beamRun`, `roundBurst`, sfx calls), `src/view/*.tsx`, `src/App.tsx`; tests `tests/e2e/*.spec.ts` (23 tests)
- **Context to attach (MANDATORY — attach the images, not just names):** `ctxt/GUI_mockupsRoseWindow.md` and
  `mockups/01-setup.png` (SetupScreen) · `02-board-round1.png`, `03-legal-preview.png`, `04-placement-rejected.png` (GameScreen, ScorePanel, Objectives, GlassBoard, DraftPool) · `05-beam.png` (BeamLayer) · `06-goal-sheet.png` (GoalDetails sheet) · `07-pause-menu.png`, `12-pause-abandon-confirm.png` (Menus/PauseMenu) · `08-round-forfeit.png` (Fx forfeit banner) · `09-final-report.png`, `11-challenge-share.png` (GameOverScreen) · `10-tutorial.png` (TutorialOverlay); `ctxt/MVC_RoseWindow.md` sections 1, 2, 5; `ctxt/acceptance_tests.md` (F-03, AT-11, AT-17)
- **Requirements:** NFR-4.2, NFR-5.1–NFR-5.4, NFR-5.6, FR-17.1, FR-17.2, FR-5.10, FR-7.1–FR-7.5

### MANDATORY: Sandwich Requirement
- **Start:** Change how views get data, never what they show. Where an ASCII sketch and its screenshot disagree, the screenshot wins.
- **End:** ESLint forbids legacy imports in `src/view`, all 23 existing e2e tests plus the new F-03 spec pass, and side-by-side screenshots match all 12 mockups.

---

### 1. Capability Specification
- **Adds:** `src/view/GameControllerContext.tsx`; `src/view/useControllerView.ts`; `tests/e2e/grid-rows.spec.ts`.
- **Changes:** `GameScreen` replaces `useGame(session)` with controller hooks; `App.tsx` (composition root) builds `Game` (via `RunRecorder.restore` or the dev fast-forward), `GameController`, `BeamAnimationController`, `PlayerProfile`, `ChallengeCodec`; the pause overlay now calls `controller.pause()` / `resume()` (AT-11: a click outside only closes the menu and resumes, nothing is placed).
- **Unchanged:** CSS, markup classes, `data-testid`s (`cell-r{r}c{c}` stays 0-based), wording, animations, sounds.

### 2. Implementation Instructions
```ts
// src/view/GameControllerContext.tsx
export function GameControllerProvider(props: { controller: GameController; beam: BeamAnimationController; children: ReactNode }): JSX.Element
export function useGameController(): GameController          // throws Error outside the provider
export function useGameSnapshot(): GameSnapshot              // useSyncExternalStore over controller.subscribe/getSnapshot
export function useBeamController(): BeamAnimationController
// src/view/useControllerView.ts — the React form of View
export function useControllerView(controller: AbstractController<AbstractModel<ModelEvent>>, onFeedback: (f: Feedback) => void): void
```
- Model state: `controller.game` (`GameReadModel`, import **type-only** from `@model`); events: `useModelEvents(controller.getModel(), handler)` in `GameScreen` reproduces the old `game.subscribe` switch (`diePlaced`, `beamTraced`, `roundForfeited`, `roundScored`) and its sfx calls.
- Rejections: `useControllerView(controller, f => …)` drives the shake/red pulse/toast (mockup 04) — replaces `machineRejection`; `kind` and `position` come from `Feedback`.
- Previews and goal points: `controller.legalPreview()`, `controller.objectiveLines()`; `Die.tsx` gets the turn symbol for a colour from a controller/read-model query instead of importing `REFRACTION_BY_COLOR`.
- `GameOverScreen` gets achievements, level and rewards as props from `App` (no `@progression` value import in views).
- Beam: `BeamLayer` registers a `BeamPlaybackListener` on `useBeamController()`; reduced motion is read once with `matchMedia('(prefers-reduced-motion: reduce)')` in `App` and passed to the controller (NFR-5.6).
- **F-03 fix (`GlassBoard.tsx`):** wrap each row's four gridcells in `<div role="row" aria-rowindex={row + 1} className="glass-board__row">` with CSS `display: contents` (layout and look unchanged); cell `aria-label` becomes `row ${row + 1}, column ${col + 1}, …` (count from 1); keep `aria-rowindex`/`aria-colindex`; give the `BeamLayer` wrapper `aria-hidden="true"` so the grid contains only rows.
- Tighten ESLint `src/view/**`: add `**/engine/*`, `**/machine/*`, `**/hooks/useGame`, `**/hooks/runSession` and value imports of `@progression` to the restricted patterns.
- TSDoc on each new export.

`tests/e2e/grid-rows.spec.ts` (`?seed=3`, choose Novice Rose): `getByRole('row')` count 4; each row has 4 `gridcell`s; first cell label starts `row 1, column 1`; last starts `row 4, column 4`.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm e2e                                   # 23 existing + 1 new = 24, 100 %
pnpm vitest run -t "golden"                # 156
grep -rnE "from '\.\./(engine|machine)/|hooks/useGame|hooks/runSession" src/view | wc -l     # 0
grep -rnE "game\.(choosePattern|selectDie|placeDie|cancelSelection|refreshDraft|forfeitRound)\(" src/view | wc -l   # 0
git commit -am "refactor(view): inc 58 views through GameController" && git tag inc-58-green
```
- [ ] Playwright MCP at 360×640 (`?seed=3`): capture each of the 12 screens to `docs/mockup-compare/NN-*.png` and compare with the same-numbered mockup; layout, wording ("Pick a window", "Window #3", "ROUND 1/8", "Pick your glass", "Paused", "Challenge link copied. Send it to a friend.") and colours identical
- [ ] Pause menu covers draft and recast; clicking the board while paused places nothing (AT-11)
- [ ] Tracking: typecheck 0, lint 0/0, unit 100 %, golden exact, **E2E ≥ 90 % yellow / 100 % green**, classes ≥ 36

### 4. CRITICAL Checkpoint
- **Risk:** largest integration step; React lifecycle, two controllers and the event connector meet the whole UI. **Failure indicators:** stale UI after a placement (snapshot subscription missing); duplicated sounds or beams (double listener under StrictMode); toast missing on rejection; any screenshot diverging from its mockup; `mobile.spec.ts` overflow.
- **Isolation testing protocol:**
  1. Simplified config: only `SetupScreen` + `GlassBoard` on controller hooks, rest still via `useGame`; run `smoke.spec.ts`, `phase7.spec.ts`.
  2. Components separately: switch `DraftPool`/`ScorePanel`, then `BeamLayer` (`beam-resume.spec.ts`), then menus/pause (`phase8`), then `GameOverScreen` (`phase9`), then tutorial (`tutorial.spec.ts`); screenshot after each.
  3. Interaction effects: full e2e at 360 px and 1280 px, reduced-motion run, F-03 spec.
- **Rollback procedure:** `git reset --hard inc-57-green`; migrate one component per commit, tagging `inc-58a-green` … so a partial rollback keeps finished components.

---

**CRITICAL: Views now get state only via `GameController` and `useModelEvents`, send gestures only to controllers, look exactly like the 12 mockups, and expose the grid with row elements and 1-based labels (F-03 fixed). Golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
