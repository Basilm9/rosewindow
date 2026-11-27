# Prompt 69: AT-08 Complete a Run and Review the Score

**CRITICAL: Create `tests/e2e/acceptance/at08-final-report.spec.ts` proving the final report lists one line per objective plus a beam line, the grand total is their sum, the tier matches the thresholds, and the first completed run shows new-best, XP, level progress and any achievement earned.**

---

### INCREMENT 69: AT-08 acceptance test
- **Status:** Standard
- **Dependencies:** Prompts 43 (ScoreCalculator), 56 (PlayerProfile), 62 (harness), 58
- **Reference implementation:** `src/view/GameOverScreen.tsx` (`game-over`, `game-over-summary`, `score-lines`, `final-total`, `final-tier`, `earned-rewards`, `play-again`, "Your finished window", "New personal best", "Unlocked:"), `src/progression/profile.ts` (`PROFILE_STORAGE_KEY = 'rose-window.profile.v1'`, `ACHIEVEMENTS`), `GameConfig.tiers`
- **Context to attach:** `acceptance_tests.md` row AT-08, `mockups/09-final-report.png`, `mockups/01-setup.png`
- **Requirements:** FR-1.7; FR-8.1 to 8.5; FR-13.1 to 13.3, 13.6

### MANDATORY: Sandwich Requirement
- **Start:** A clean browser profile (this is the first completed run), `/?seed=3`, Novice Rose, moves mirrored from the max-flex replica.
- **End:** Every report figure checked against the replica's `ScoreReport` and `config.tiers`; three screenshots; `results.md` row.

### 1. Capability Specification
One acceptance spec; no production change. The run is played with `playMoves(page, replica, 'end')` from the harness so the expected report is known exactly.

### 2. Implementation Instructions
```typescript
// tests/e2e/acceptance/at08-final-report.spec.ts
const replica = fastForward(3, 1); replica.choosePattern('novice-rose');
// after playMoves: const report = replica.report!; const tiers = replica.config.tiers;
test.setTimeout(240_000);
```
1. **Finish a run:** `startSeeded(page, 3, 'novice-rose')`; `playMoves(page, replica, 'end')`; `game-over` visible. Click `game-over` once if needed to skip the tally count-up, then wait for `final-total` to equal `String(report.total)`.
2. **Read the report:**
   - `score-lines` has `report.lines.length + 1` rows: each objective name with `<name> scored <points>` from `report.lines`, plus `Beam scored 156`.
   - `final-total` = Σ line points = `report.total`.
   - `final-tier` = the tier implied by `tiers` (`gold ≥ tiers.gold`, `silver ≥ tiers.silver`, `bronze ≥ tiers.bronze`, else `none`) and equals `report.tier`.
   - `getByLabel('Your finished window')` shows 16 panes with 16 dice.
   - `New personal best` visible; `earned-rewards` contains `+<n> XP` with n > 0 and a level label (`Level N` or `Level up! N`); the `.xp__bar` span has a non-zero width.
   - Parse `localStorage['rose-window.profile.v1']`: `history` has 1 run, `bestScore` = `report.total`; the profile started empty, so every id in `achievements` was earned by this run and its `ACHIEVEMENTS` title must appear in the `Unlocked:` line (if the list is empty, assert the line is absent).
   Shots `report` → `MOCKUP.report` and `notices` (after the reveal) → `MOCKUP.report`.
3. **New run at a different seed:** click `play-again`; the setup shows two `pattern-*` cards and `Window #N` with N ≠ 3; choose the first card; `round-indicator` `ROUND 1/8`, 16 empty cells, `beam-total` `0`. Shot `new-run` → `MOCKUP.setup`.
4. `logResult` with URLs `/?seed=3` and the new run's seed; notes list total, tier, XP and achievements. Compare with `09-final-report.png` and `01-setup.png`.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm e2e:acceptance -g "AT-08" && pnpm e2e
```
- [ ] Lines = objectives + beam; total = sum; tier from `config.tiers`
- [ ] New-best, XP, level progress and achievements shown on the first completed run
- [ ] `docs/acceptance/AT08/01-report.png`, `02-notices.png`, `03-new-run.png`
- [ ] Tracking matrix green; commit `test(e2e): inc 69 AT-08 final report`, tag `inc-69-green`

---

**CRITICAL: The report adds up exactly, the tier follows the configured thresholds, and progression notices appear without affecting the score; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
