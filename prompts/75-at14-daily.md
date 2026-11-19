# Prompt 75: AT-14 Daily Challenge

**CRITICAL: Create `tests/e2e/acceptance/at14-daily.spec.ts` proving today's daily window, started from the pause menu, has the same seed and pattern in two browsers on the same UTC date, and that the finished run is recorded as a daily run.**

---

### INCREMENT 75: AT-14 acceptance test
- **Status:** Standard
- **Dependencies:** Prompts 56 (PlayerProfile), 57 (ChallengeCodec / daily), 62 (harness), 58
- **Reference implementation:** `src/progression/` (`dailyChallenge(date)`, `dailyKey`, profile `history[].mode`, `daily[<date>]`), `src/view/Menus.tsx` (`menu-daily`, seed line `Daily window · <pattern> · window #N`), `src/view/SetupScreen.tsx` (locked single card, "Your window", chip "Daily window"), `tests/e2e/mobile.spec.ts` (daily run)
- **Context to attach:** `acceptance_tests.md` row AT-14, `mockups/07-pause-menu.png`, `mockups/01-setup.png`, `mockups/02-board-round1.png`
- **Requirements:** FR-15.1 to 15.5

### MANDATORY: Sandwich Requirement
- **Start:** Both browsers use the same fixed clock (`page.clock.setFixedTime(DAY)`), each starts with a free run in progress (`/?seed=3`, Novice Rose) and reaches the daily window only through `game-menu` → `menu-daily`.
- **End:** Same seed and pattern in both browsers, a completed daily run in the profile, screenshots from each browser, `results.md` row.

### 1. Capability Specification
One acceptance spec; no production change. There is no URL parameter for the daily window; the menu is the only entry.

### 2. Implementation Instructions
```typescript
// tests/e2e/acceptance/at14-daily.spec.ts
const DAY = new Date('2026-11-19T12:00:00.000Z');   // any fixed UTC instant; record it
interface DailySeen { seed: number; patternId: string; patternName: string; menuLine: string }
async function openDaily(page: Page, shots: ShotLog, tag: string): Promise<DailySeen>;
test.setTimeout(240_000);
```
`openDaily`: `startSeeded(page, 3, 'novice-rose')`; click `game-menu`; shot `<tag>-pause` → `MOCKUP.pause` (shows "Today's daily window"); click `menu-daily`. Assert exactly one `pattern-*` button, heading `Your window`, chip `Daily window`; read `patternId` from its test id and `seed` from `Window #N`. Shot `<tag>-daily-setup` → `MOCKUP.setup`. Click the card; open `game-menu` again and read the seed line, which must read `Daily window · <patternName> · window #<seed>` and must not offer `menu-daily`; close with `menu-resume`. Shot `<tag>-daily-board` → `MOCKUP.board`.

1. **Browser 1:** `freshPage(browser)`, `page.clock.setFixedTime(DAY)`, `openDaily(page, shots, 'b1')`.
2. **Note** `b1` seed and pattern; assert they equal `dailyChallenge(DAY)` from the model (`seed`, `patternId`).
3. **Browser 2:** `const second = await browser.browserType().launch()`; fresh context, same clock, `openDaily(..., 'b2')`; assert `b2.seed === b1.seed` and `b2.patternId === b1.patternId`.
4. **Finish the daily run in browser 1:** `replica = fastForward(b1.seed, 1); replica.choosePattern(b1.patternId)`; `playMoves(page, replica, 'end')`; `game-over` visible; `earned-rewards` visible. Parse `localStorage['rose-window.profile.v1']`: the newest `history` entry has `mode: 'daily'`, `seed: b1.seed`, `patternId: b1.patternId`, and `daily['<YYYY-MM-DD of DAY>'].runs >= 1`. Shot `b1-daily-report` → `MOCKUP.report`.
5. `logResult` with URLs `/?seed=3` (both browsers) and notes: DAY, daily seed, pattern. Compare with `07-pause-menu.png`, `01-setup.png`, `02-board-round1.png`, `09-final-report.png`.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm e2e:acceptance -g "AT-14" && pnpm e2e
```
- [ ] Same seed and pattern in both browsers for the same UTC date
- [ ] Completed run recorded with `mode: 'daily'`
- [ ] `docs/acceptance/AT14/` holds pause, daily setup and daily board for b1 and b2, plus the b1 report
- [ ] Tracking matrix green; commit `test(e2e): inc 75 AT-14 daily`, tag `inc-75-green`

---

**CRITICAL: The daily window depends only on the UTC date and is recorded as a daily run; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
