# Prompt 67: AT-06 Golden Game (Reproducibility)

**CRITICAL: Create `tests/e2e/acceptance/at06-golden-game.spec.ts` that plays seed 3, Novice Rose, with the max-flex automatic player through the real UI twice in two separate browsers and gets round scores 5,5,31,16,2,7,53,37, beam total 156 and 16 dice over 8 rounds both times.**

---

### INCREMENT 67: AT-06 golden game in the browser
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompts 48 (model golden master), 62 (harness `playMoves`), 58, 59
- **Reference implementation:** `src/util/autoPlayer.ts` (`fastForward`, `bestPair`, `autoPlay`), `tests/e2e/beam-resume.spec.ts` (mirroring replica moves into the UI), `src/view/GameOverScreen.tsx` (`game-over`, `score-lines`, `final-total`, `final-tier`)
- **Context to attach:** `acceptance_tests.md` row AT-06, `mockups/09-final-report.png`
- **Requirements:** FR-1.4, 4.14, 5.11, 8.1; NFR-1.1

### MANDATORY: Sandwich Requirement
- **Start:** The moves come only from `bestPair` on a node-side replica built with `fastForward(3, 1)` + `choosePattern('novice-rose')`; the UI is driven through `select <color> <value>` buttons and `cell-r<r>c<c>` only.
- **End:** Both browsers show exactly `5,5,31,16,2,7,53,37` and `156`; the row is in `docs/acceptance/results.md`.

### 1. Capability Specification
The in-browser counterpart of the model golden master: proves the view, controller and statechart add nothing random. No production code changes.

### 2. Implementation Instructions
```typescript
// tests/e2e/acceptance/at06-golden-game.spec.ts
const GOLDEN_ROUNDS = [5, 5, 31, 16, 2, 7, 53, 37] as const;
const GOLDEN_BEAM_TOTAL = 156;
async function goldenRun(browser: Browser, label: 'run1' | 'run2', shots: ShotLog): Promise<RunResult>;
interface RunResult { rounds: number[]; beamTotal: number; dice: number; finalTotal: string; tier: string; url: string }
test.setTimeout(240_000);
```
`goldenRun`: `freshPage(browser)` → `startSeeded(page, 3, 'novice-rose')` → new replica → `playMoves(page, replica, 'end')`, which after every settled beam asserts `beam-total` = `replica.totalScore`. Wait for `game-over` (15 s timeout per beam). Read `rounds` from the eight `round-scores` aria-labels `round N scored X`, `beamTotal` from the `score-lines` beam line (aria `Beam scored X`) and from `beam-total`, `dice` = count of `[data-testid^="die-r"]` on the board. Shot `<label>-report` → `MOCKUP.report`.

**Run 1:** the test's `browser`. **Run 2:** a separately launched browser: `const second = await browser.browserType().launch(); try { … } finally { await second.close(); }` (new process, new profile).

Assertions (constants, no loops): `run1.rounds` and `run2.rounds` toEqual `GOLDEN_ROUNDS`; both `beamTotal` = 156; both `dice` = 16; `run1.finalTotal === run2.finalTotal`; `run1.tier === run2.tier`. Also assert `replica.roundScores` equals `GOLDEN_ROUNDS` before touching the browser, so a model regression is reported as such.

`logResult({ at: 'AT-06', urls: ['/?seed=3', '/?seed=3 (second browser)'], notes: 'rounds …, final total …, tier …' })`. Compare both report PNGs with `09-final-report.png` (finished window, tally lines, total, medal).

### 3. Verification Protocol
```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm e2e:acceptance -g "AT-06" && pnpm e2e
```
- [ ] Golden master exact in Vitest **and** in both browsers
- [ ] `docs/acceptance/AT06/01-run1-report.png`, `02-run2-report.png`
- [ ] Tracking matrix all green (e2e 100 %, class count ≥ 36, 0 import violations)
- [ ] Commit `test(e2e): inc 67 AT-06 golden game`, tag `inc-67-green`

### 4. CRITICAL Checkpoint
- **Risk:** UI and model diverge (a view picks a different die of the same colour/value, a forfeit is applied twice, animation timing races a click). **Failure indicators:** a round score differs from the replica, `beam-total` lags, a click lands while `aria-busy="true"`, run 2 differs from run 1.
- **Isolation testing protocol:**
  1. Simplified config: play only round 1 (`playMoves(…, 2)`) and expect `[5]`.
  2. Components separately: `pnpm test` golden master (model); then `/?seed=3&round=8` + one replica move (UI end-game only).
  3. Interaction effects: full run with `reducedMotion: 'reduce'`, then without; both must match; then the two-browser run.
- **Rollback procedure:** `git reset --hard inc-66-green`; if the model golden master fails, roll back to the last tag where `pnpm test` was green and stop all view work until it is restored.

---

**CRITICAL: Seed 3, novice-rose, max-flex in two browsers: 5,5,31,16,2,7,53,37, beam total 156, 16 dice. Never edit these constants to make a test pass.**
