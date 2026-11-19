# Prompt 62: AT-01 Begin a Run at a Chosen Seed (+ shared acceptance harness)

**CRITICAL: Create the shared Playwright acceptance harness and `tests/e2e/acceptance/at01-begin-run.spec.ts`; every acceptance spec from 63 to 78 reuses this harness, and no acceptance test may change game code or the golden master.**

---

### INCREMENT 62: Acceptance harness + AT-01
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompts 58 (views rewired, F-03 fixed), 59 (`src/util/autoPlayer.ts`, `src/util/sfx.ts`), 60
- **Reference implementation:** `tests/e2e/phase7.spec.ts`, `tests/e2e/mobile.spec.ts` (pause-menu text), `src/util/autoPlayer.ts` (`fastForward`, `bestPair`)
- **Context to attach:** `acceptance_tests.md` (row AT-01 and header), `GUI_mockupsRoseWindow.md`, `mockups/01-setup.png`, `mockups/02-board-round1.png`, `mockups/07-pause-menu.png`
- **Requirements:** FR-1.1 to 1.3, 1.5; FR-5.1; FR-7.1, 7.4, 7.5

### MANDATORY: Sandwich Requirement
- **Start:** Tests drive the game only through real `data-testid`/ARIA hooks and URL parameters; each test gets a clean browser context (no stored game data), viewport 1280×900, tutorial never shown for `?seed=` links.
- **End:** `pnpm e2e` is 100 % green, AT-01 is logged in `docs/acceptance/results.md`, and the golden master 5,5,31,16,2,7,53,37 / 156 is untouched.

### 1. Capability Specification
Adds the acceptance-test layer: a Playwright project `acceptance` (`testDir: tests/e2e/acceptance`, `workers: 1`, `fullyParallel: false`, `baseURL: http://localhost:5173`) plus script `"e2e:acceptance": "playwright test --project=acceptance"`. Nothing under `src/` changes.

### 2. Implementation Instructions
**File `tests/e2e/acceptance/harness.ts`:**
```typescript
export const MOCKUP = { setup: '01-setup.png', board: '02-board-round1.png', legal: '03-legal-preview.png',
  rejected: '04-placement-rejected.png', beam: '05-beam.png', goals: '06-goal-sheet.png', pause: '07-pause-menu.png',
  forfeit: '08-round-forfeit.png', report: '09-final-report.png', tutorial: '10-tutorial.png',
  challenge: '11-challenge-share.png', abandon: '12-pause-abandon-confirm.png' } as const;
export type MockupKey = keyof typeof MOCKUP;
/** Fresh context: empty storage, 1280x900 unless overridden; logs every page URL it visits. */
export async function freshPage(browser: Browser, opts?: BrowserContextOptions): Promise<{ page: Page; urls: string[] }>;
/** goto `/?seed=N[&round=R]`, click `pattern-<id>`, wait for `glass-board[aria-busy="false"]`. */
export async function startSeeded(page: Page, seed: number, patternId: string, round?: number): Promise<void>;
/** Saves docs/acceptance/<AT>/<NN>-<step>.png (NN = 01, 02, ... per test); remembers the mockup to compare. */
export class ShotLog { constructor(at: string); take(page: Page, step: string, mockup: MockupKey | null): Promise<string>; }
/** Mirrors a node-side Game replica into the UI: select `select <color> <value>` (first), click `cell-r<r>c<c>`,
 *  wait for the board to settle; forfeits are applied to the replica when bestPair returns null (the UI forfeits itself). */
export async function playMoves(page: Page, replica: Game, untilRound: number | 'end'): Promise<void>;
/** Appends | date | AT | Pass/Fail | fault | URL(s) | screenshots → mockups | notes | to docs/acceptance/results.md
 *  (creates the header row if missing). Fail rows take nextFaultId(): next free F-nn after F-03 and any in the file. */
export function logResult(row: ResultRow): void;
```
Build replicas with `fastForward(seed, 1)` then `choosePattern(id)`; after every settled beam assert `beam-total` equals `replica.totalScore`. Register `test.afterEach` in each spec that calls `logResult` with Fail when `testInfo.status !== 'passed'`.

**File `tests/e2e/acceptance/at01-begin-run.spec.ts` (URL `/?seed=3`):**
1. `patterns-offered` holds exactly two `pattern-*` buttons with different ids; for each: `.pick-card__name` text, the `<name> layout` grid has 16 cells, `.pick-card__desc` visible at 1280 px. `getByText('Window #3')` visible. Shot `setup` → `MOCKUP.setup`.
2. Click `pattern-novice-rose`. Assert `glass-board` aria-label `Glass window pattern: Novice Rose`; the 16 cell `title`s match the replica's Novice Rose constraints; `round-indicator` = `ROUND 1/8`; label `2 left to place this round`; 5 `draft-die-*`; `refresh-dice` label `Reroll dice, 1 left`; `entry-arrow` inside `cell-r<r>c<c>` of `replica.currentEntry` with label `beam enters heading <direction>`. Shot `board` → `MOCKUP.board`.
3. Click `game-menu`; `pause-menu` contains `Free play · Novice Rose · window #3`. Shot `pause` → `MOCKUP.pause`.
4. `logResult` Pass with URL `/?seed=3`, then open each PNG beside its mockup and note layout/wording differences in the row (a difference is a Fail with a new fault ID).

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm e2e && pnpm e2e:acceptance -g "AT-01"
```
- [ ] Tracking matrix green: 0 type errors, 0 lint warnings, 100 % unit and e2e, golden master exact, class count ≥ 36, 0 import violations
- [ ] `docs/acceptance/AT01/01-setup.png`, `02-board.png`, `03-pause.png` exist
- [ ] `results.md` has one AT-01 row with URL and mockup names
- [ ] Commit `test(e2e): inc 62 acceptance harness and AT-01`, tag `inc-62-green`

### 4. CRITICAL Checkpoint
- **Risk:** a flaky or wrong harness poisons all 16 later acceptance prompts. **Failure indicators:** screenshots overwritten between tests, rows interleaved in `results.md`, replica and UI scores diverge, tutorial card appears on a `?seed=` run.
- **Isolation testing protocol:** 1. Run `startSeeded` alone and assert the board. 2. Run `ShotLog` twice in one test and check numbering. 3. Run `playMoves(page, replica, 2)` on seed 3 and compare `round-scores` to `[5]`. 4. Run AT-01 then a trivial second spec to check isolation of storage.
- **Rollback procedure:** `git reset --hard inc-61-green`; re-add the harness one function at a time.

---

**CRITICAL: The harness is shared, read-only toward `src/`, and the golden master stays seed 3, novice-rose, max-flex: 5,5,31,16,2,7,53,37, beam total 156.**
