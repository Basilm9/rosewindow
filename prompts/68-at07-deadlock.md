# Prompt 68: AT-07 Deadlocked Round

**CRITICAL: Create `tests/e2e/acceptance/at07-deadlock.spec.ts` proving that when no die fits anywhere the round is forfeited with a message saying why, the beam still fires and scores, and the run continues to the final report after round 8.**

---

### INCREMENT 68: AT-07 acceptance test
- **Status:** Standard
- **Dependencies:** Prompts 47 (`Game.hasLegalMove`, `forfeitRound`), 62 (harness), 58
- **Reference implementation:** `tests/e2e/beam-resume.spec.ts` (deadlocked round recovers its beam), `src/view/GameScreen.tsx` (`forfeit-banner`: "No die fit anywhere in round N. The beam still scores."), `src/util/autoPlayer.ts`
- **Context to attach:** `acceptance_tests.md` row AT-07, `mockups/08-round-forfeit.png`, `mockups/05-beam.png`, `mockups/09-final-report.png`
- **Requirements:** FR-6.1, 6.2, 6.4 to 6.6

### MANDATORY: Sandwich Requirement
- **Start:** URL `/?seed=7`, pattern Clerestory (`pattern-clerestory`); round 1 begins with the blue 1 on the bottom-right corner `cell-r3c3`. Every later move is mirrored from a model replica.
- **End:** A forfeit message, that round's beam score added, a final report after round 8, three screenshots and a `results.md` row.

### 1. Capability Specification
One acceptance spec; no production change. The UI forfeits on its own when the controller finds no legal move; the test never forces a forfeit.

### 2. Implementation Instructions
```typescript
// tests/e2e/acceptance/at07-deadlock.spec.ts
const replica = fastForward(7, 1); replica.choosePattern('clerestory');
const blueOne = replica.draftPool.dice.find((d) => d.color === 'blue' && d.value === 1);
test.setTimeout(240_000);
```
1. **Preflight (model):** assert `pattern-clerestory` is offered at seed 7 and `blueOne` exists; if not, Fail with the next fault ID ("AT-07 precondition not met at seed 7") and stop. Replay on a throw-away replica: blue 1 → (3,3), then `bestPair` each turn; the first turn where `bestPair` is `null` (equivalently `!hasLegalMove()`) is round `F`. If the max-flex replica never deadlocks, retry with the first entry of `legalPairs` each turn and note the strategy used. Store the move list and `F`.
2. **UI, step 1:** `startSeeded(page, 7, 'clerestory')`; click `select blue 1` (first), then `cell-r3c3`; `die-r3c3` visible.
3. **UI, step 2:** replay the stored moves through the harness `playMoves` until round `F`'s deadlock. Assert:
   - `forfeit-banner` visible with text `No die fit anywhere in round F` and `The beam still scores`; no `dialog`. Shot `forfeit` → `MOCKUP.forfeit`.
   - `beam-layer` appears and reaches `data-settled="true"`; `round-scores` gains `round F scored X` with `X` = replica's round-F score; `beam-total` = replica total. Shot `forfeit-beam` → `MOCKUP.beam`.
4. Continue `playMoves(page, replica, 'end')`; `game-over` visible; `round-scores` has 8 entries. Shot `report` → `MOCKUP.report`.
5. `logResult` with URL `/?seed=7`, `F`, the strategy, and the forfeit message text. Compare with `08-round-forfeit.png` (toast wording and position over the board), `05-beam.png`, `09-final-report.png`.

**Timing:** the banner is a transient toast; wait for it with `toBeVisible({ timeout: 15_000 })` right after the move that causes the deadlock and take the shot immediately.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm e2e:acceptance -g "AT-07" && pnpm e2e
```
- [ ] Forfeit message names the round and the reason
- [ ] Forfeited round has a beam score equal to the replica's; total = Σ rounds
- [ ] `docs/acceptance/AT07/01-forfeit.png`, `02-forfeit-beam.png`, `03-report.png`
- [ ] Tracking matrix green; commit `test(e2e): inc 68 AT-07 deadlock`, tag `inc-68-green`

---

**CRITICAL: A deadlocked round is forfeited with a reason, still scores its beam, and the run reaches round 8's report; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
