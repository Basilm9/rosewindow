# Tracking matrix — fill one row per increment from real command output

Thresholds: see `00-master-context.md` section 4. Variant = the developer/branch that ran the increment.

| # | Prompt | Variant (who / branch) | typecheck errors | lint errors / warnings | unit pass % | golden master | e2e pass % | classes | import violations | zone | commit / tag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 ⚠ | MVC Project Structure | Darren / feat/mvc-foundation | 0 | 0/0 | 98.4%->100% after junction fix | 156 ✓ | — | 15 | — |red -> Green | inc-01-green |
| 02 ⚠ | Dependencies and Import-Boundary Rules | Darren / feat/mvc-foundation | 0 | 0 / 0 | 100% (270/270) | 156 ✓ | — | 15 | — | green | inc-02-green |
| 03 ⚠ | MVC Infrastructure | Darren / feat/mvc-foundation | 0 | 0/0 | 100% (287/287) | 156 ✓ | smoke 1/1 | 15 | — | green | inc-03-green |
| 04 | MVC Infrastructure Tests | Darren / feat/mvc-foundation | 0 | 0/0 | 100% (291/291) | 156 ✓ | — | 15 | — | green | inc-04-green |
| 05 | GameError and PlacementError | Darren / feat/mvc-model |  0 | 0/0 | 100% (291/291) | 156 ✓ | — | 15 | — | green | inc-05-green |
| 06 | GameError and PlacementError Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (313/313) | 156 ✓ | — | 15 | — | green | inc-06-green |
| 07 | GameConfig | Darren / feat/mvc-model | 0 | 0/0 | 100% (313/313) | 156✓ | — | 15 | — | green | inc-07-green |
| 08 | GameConfig Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (334/334) | 156✓ | — | 15 | — | green | inc-08-green |
| 09 | SeededRandom | Darren / feat/mvc-model | 0 | 0/0 | 100% (334/334) | 156✓ | — | 15 | — | green | inc-09-green |
| 10 | SeededRandom Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (355/355) | 156✓ | — | 15 | — | green | inc-10-green |
| 11 | Die | Darren / feat/mvc-model | 0 | 0/0 | 100% (355/355) | 156✓ | — | 15 | — | green  | inc-11-green |
| 12 | Die Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (380/380) | 156✓ | — | 15 | — | green | inc-12-green |
| 13 | Direction | Darren / feat/mvc-model | 0 | 0/0 | 100% (380/380) | 156✓ | — | 16 | — | green | inc-13-green |
| 14 | Direction Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (415/415) | 156✓ | — | 16 | — | green | inc-14-green |
| 15 ⚠ | CellConstraint, ColorConstraint, ValueConstraint, OpenConstraint | Darren / feat/mvc-model | 0 | 0/0 | 100% (441/441) | 156✓ | — | 16 | — | green | inc-15-green |
| 16 | CellConstraint Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (455/455) | 156✓ | — | 16 | — | green | inc-16-green |
| 17 | WindowPattern | Darren / feat/mvc-model | 0 | 0/0 | 100% (455/455) | 156✓ | — | 17 | — | green | inc-17-green |
| 18 | WindowPattern Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (479/479) | 156✓ | — | 17 | — | green | inc-18-green |
| 19 | WindowCell | Darren / feat/mvc-model | 0 | 0/0 | 100% (479/479) | 156✓ | — | 18 | — | green | inc-19-green |
| 20 | WindowCell Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (496/496) | 156✓ | — | 18 | — | green | inc-20-green |
| 21 ⚠ | GlassWindow | Darren / feat/mvc-model | 0 | 0/0 | 100% (496/496) | 156✓ | — | 18 | — | green | inc-21-green |
| 22 | GlassWindow Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (522/522) | 156✓ | — | 18 | — | green | inc-22-green |
| 23 | DiceBag | Darren / feat/mvc-model | 0 | 0/0 | 100% (522/522) | 156✓ | — | 18 | — | green | inc-23-green |
| 24 | DiceBag Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (543/543) | 156✓ | — | 18 | — | green | inc-24-green |
| 25 | DraftPool | Darren / feat/mvc-model | 0 | 0/0 | 100% (543/543) | 156✓ | — | 18 | — | green | inc-25-green |
| 26 | DraftPool Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (564/564) | 156✓ | — | 18 | — | green | inc-26-green |
| 27 ⚠ | PlacementValidator | Darren / feat/mvc-model | 0 | 0/0 | 100% (564/564) | 156✓ | — | 18 | — | green | inc-27-green |
| 28 | PlacementValidator Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (670/670) | 156✓ | — | 18 | — | green | inc-28-green |
| 29 | EntryPoint | Darren / feat/mvc-model | 0 | 0/0 | 100% (670/670) | 156✓ | — | 19 | — | green | inc-29-green |
| 30 | EntryPoint Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (715/715) | 156✓ | — | 19 | — | green | inc-30-green |
| 31 | BeamSegment | Darren / feat/mvc-model | 0 | 0/0 | 100% (715/715) | 156✓ | — | 20 | — | green | inc-31-green |
| 32 | BeamSegment Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (740/740) | 156✓ | — | 20 | — | green | inc-32-green |
| 33 | BeamPath | Darren / feat/mvc-model | 0 | 0/0 | 100% (740/740) | 156✓ | — | 21 | — | green | inc-33-green |
| 34 | BeamPath Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (761/761) | 156✓ | — | 21 | — | green | inc-34-green |
| 35 ⚠ | BeamTracer | Darren / feat/mvc-model | 0 | 0/0 | 100% (761/761) | 156✓ | — | 21 | — | green | inc-35-green |
| 36 | BeamTracer Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (791/791) | 156✓ | — | 21 | — | green | inc-36-green |
| 37 | Objective Interface and PublicObjective | | | | | | | | | | |
| 38 | PublicObjective Tests | | | | | | | | | | |
| 39 | PrivateObjective | | | | | | | | | | |
| 40 | PrivateObjective and Deal Tests | | | | | | | | | | |
| 41 | ScoreReport | | | | | | | | | | |
| 42 | ScoreReport Tests | | | | | | | | | | |
| 43 ⚠ | ScoreCalculator | | | | | | | | | | |
| 44 | ScoreCalculator Tests | | | | | | | | | | |
| 45 ⚠ | The Seven Model Event Classes | | | | | | | | | | |
| 46 | Model Event Tests | | | | | | | | | | |
| 47 ⚠ | Game (the model facade) | | | | | | | | | | |
| 48 ⚠ | Game Tests, Golden Master and Safety Properties | | | | | | | | | | |
| 49 ⚠ | Game Statechart (XState v5) | | | | | | | | | | |
| 50 ⚠ | GameController | | | | | | | | | | |
| 51 | GameController Tests | | | | | | | | | | |
| 52 | Beam Statechart | | | | | | | | | | |
| 53 ⚠ | BeamAnimationController | | | | | | | | | | |
| 54 | BeamAnimationController Tests | | | | | | | | | | |
| 55 ⚠ | RunRecorder | | | | | | | | | | |
| 56 | PlayerProfile | | | | | | | | | | |
| 57 | ChallengeCodec | | | | | | | | | | |
| 58 ⚠ | View Rewiring (state only through GameController and useModelEvents) | | | | | | | | | | |
| 59 | Utilities and Legacy Removal | | | | | | | | | | |
| 60 ⚠ | Class Diagram Generator with Import-Rule Report | | | | | | | | | | |
| 61 | Statechart Diagram Export | | | | | | | | | | |
| 62 ⚠ | AT-01 Begin a Run at a Chosen Seed (+ shared acceptance harness) | | | | | | | | | | |
| 63 | AT-02 Review the Objectives Mid-Run | | | | | | | | | | |
| 64 | AT-03 Draft, Swap and Return a Die | | | | | | | | | | |
| 65 | AT-04 One Rejection per Placement Law | | | | | | | | | | |
| 66 | AT-05 Illuminate the Window | | | | | | | | | | |
| 67 ⚠ | AT-06 Golden Game (Reproducibility) | | | | | | | | | | |
| 68 | AT-07 Deadlocked Round | | | | | | | | | | |
| 69 | AT-08 Complete a Run and Review the Score | | | | | | | | | | |
| 70 | AT-09 Recast the Draft | | | | | | | | | | |
| 71 | AT-10 Interrupt and Restore | | | | | | | | | | |
| 72 | AT-11 Suspend a Run | | | | | | | | | | |
| 73 | AT-12 First-Time Tutorial | | | | | | | | | | |
| 74 | AT-13 Audio Control | | | | | | | | | | |
| 75 | AT-14 Daily Challenge | | | | | | | | | | |
| 76 | AT-15 Challenge Another Player | | | | | | | | | | |
| 77 | AT-16 Play a Round at Phone Width | | | | | | | | | | |
| 78 | AT-17 Accessibility | | | | | | | | | | |

## Notes

- 01: architecture tests failed on Windows (symlink permission), 98.4 % → 100 % after switching to junctions (separate commit); .gitattributes keeps the generated UML at LF.
- 02: 13 import-rule tests (10 blocked, 3 allowed); prettier endOfLine auto, prompts/ctxt/docs ignored; no mass reformat.
- 03: first lint run had 2 missing-doc errors in View.ts, fixed before commit; ModelEvent.source made non-enumerable (declare readonly).
- 04: mutation check: with the snapshot removed from notifyChanged, M8/M9 fail; 5 duplicate prompt-03 tests removed.
- 05: 4 new error kinds; exhaustiveness check: removing a case fails tsc; temporary cast in useGame.ts until prompt 15.
- 06: one message test per error kind (14); no control flow in tests.
- 07: invalid overrides now throw invalidArgument (six number fields must be positive integers, tiers strictly increasing); view hard-codes the multiplier cap, logged for prompt 58.
- 08: 21 tests; input-domain partitioning (valid / zero / negative / fractional); all six validated fields plus non-increasing tiers rejected; seed normalization covers NaN, Infinity, negative, fractional and >2^32; ported config.test.ts cases in full.
- 09: SeededRandom moved from engine; mulberry32 + Fisher–Yates copied unchanged; engine rng.ts/sample.ts now re-export shims; sample() now throws invalidArgument GameError; no Math.random in model/engine. Error-kind assertion deferred to prompt 10.
- 10: 21 tests (18 cases, it.each on 14–16 and 18, plus error-kind test); precomputed sequence constants match the copied mulberry32; reference rng.test.ts left in place; sample() error kind checked via objectContaining matcher (no try/catch), mutation-checked against 'emptyBag.'
- 11: Die moved from engine/types.ts (now re-exports); frozen value object with only static Die.equals (no instance equals); invalid color/value throw invalidArgument; diceBag face loop left for prompt 23.
- 12: 25 tests; input-domain partitioning (5 colours, valid 1/3/6, invalid 0/7/2.5/NaN, bad colour, Die.from); every rejection checks kind invalidArgument via shared objectContaining matcher; compile-time check that a plain {color, value} satisfies Die; reference classes.test.ts case ported with a directly built die.
- 13: Direction promoted from string type to class (classes 15 → 16); four frozen instances, private constructor, clockwise/counterClockwise/step/fromName; engine types.ts keeps string Direction as shim (class imported as CompassDirection); colour→turn table untouched, moves in beam prompts.
- 14: 35 tests (22 listed cases + step and fromName tables so every direction appears in every method, + error-kind check, + per-index toBe identity on ALL with length check); reference types.test.ts direction cases ported.
- 15 (CRITICAL): constraint classes moved from engine (count stays 16); real CellConstraint interface with accepts/describe; useGame.ts cast from 05 removed; 3 views (GlassBoard, SetupScreen, GameScreen) switched from kind-narrowing to instanceof (not in prompt; visually checked against mockups 01/02/04); 26 tests added early, prompt 16 extends rather than duplicates.
- 16: extended prompt-15 file (26 → 40 tests); added full 12-cell acceptance table (incl. BLUE4), substitutability test, values 1–6; replaced 3 partial acceptance tests covered by the table; removed for loop from frozen test (no-control-flow rule).
- 17: WindowPattern promoted from interface to class (16 → 17); load-time validation throws malformedPattern; constraintAt outOfBounds, byId unknownPattern; offer uses SeededRandom.sample; novice-rose description corrected to "Three demands"; added DEFAULT_GRID_SIZE to GameConfig so fromRows' default isn't a literal 4.
- 18: 24 tests; all patterns.test.ts cases ported; malformedPattern (one per reason), outOfBounds (−1, 4, 0.5), unknownPattern each check kind; offers pinned for seeds 42 and 3; novice-rose "Three demands" pinned.
- 19: WindowCell promoted from interface to frozen class (17 → 18); satisfiedBy delegates to CellConstraint; withDie throws cellOccupied PlacementError; cleared() returns new empty cell; engine glassWindow.ts re-exports and builds cells via the class; validator not yet routed through satisfiedBy (prompt 27).
- 20: 17 tests; branch-coverage criterion, 100% statements/branches/functions/lines on WindowCell.ts (coverage-v8); withDie rejection checks kind cellOccupied via matcher; originals unchanged after withDie and after cleared() on an occupied cell; glassWindow.test.ts case ported.
- 21 (CRITICAL): GlassWindow moved to model as WindowCell[][] grid (count stays 18); DieGrid moved to model, beamTracer imports it from there; isolation protocol run in full: 2×2 step-by-step match vs reference class, glassWindow/beamTracer/objectives alone, game.test 22/22, e2e 23/23; NFR-6.1 confirmed (outOfBounds and cellOccupied leave dice unchanged); board orientation checked by hand against mockup 02.
- 22: 26 tests; both legacy glassWindow.test.ts cases ported; outOfBounds (4 outside partitions incl. {4,0}) and cellOccupied checked by class, message and kind; NFR-6.1 permanent tests for both rejection kinds (24 cellOccupied, 24b outOfBounds); catchError helper is the only try (file-level, allowed).
- 23: DiceBag moved from engine (count stays 18); faces from Die.MIN_VALUE..MAX_VALUE; one shuffle via SeededRandom.shuffled; seed 3/42 first-five draws match reference; new: draw(n) rejects negative/non-integer n with invalidArgument before the emptyBag check (bag unchanged on rejection); permanent tests in 24.
- 24: 21 tests; draw(n) input × bag-state criterion; legacy diceBag.test.ts and classes.test.ts bag cases ported; emptyBag and invalidArgument checked by kind via matchers (added after review); bag unchanged after both rejections (cases 18, 21). Test rules added to 00-master-context.md after this review.
- 25: DraftPool moved from engine (count stays 18); take now throws PlacementError dieNotInPool (was GameError); static + instance contains added; engine Game.legalPlacementsFor switched to DraftPool.contains (not in prompt, low-risk, golden unchanged); placementValidator's own copy left for 27; 4 temporary checks listed for 26.
- 26: 21 tests; take found/not-found and contains true/false branches; dieNotInPool checked by kind; unchanged state after rejection on both [red3] and [red3, blue5]; review found 3 of prompt 25's 4 temporary checks uncovered → added cases 18–21; agent's first evidence line numbers were off by one (caught on follow-up). Temp-check list now passed from class prompt to test prompt in the template.
- 27 (CRITICAL): PlacementValidator moved to model (count stays 18); six private law methods run from a readonly list (order checked by hand in source; 4 of 15 pairs tested, rest in 28); out-of-grid now GameError outOfBounds, not PlacementError; dieNotInPool via DraftPool.contains; isolation protocol in full (2×2 per law, 3×3 for first/connectivity, each law test alone, game/machine/golden); purity confirmed incl. deep-frozen inputs; 13 temporary checks listed for 28; visual check of rejection toast vs mockup 04.
- 28: 106 tests, 100% statement/branch/function/line coverage on PlacementValidator.ts; 11 of 15 precedence pairs tested + 4 impossible pairs explained (line 514); all 13 prompt-27 temporary checks made permanent; unchanged-state and deep-frozen tables cover all six laws + outOfBounds; mutation check (swap two laws, drop same-value adjacency, drop diagonal connectivity, border ring always true) — every mutation caught (1/3/7/10 failures), code restored, empty diff.
- 29: EntryPoint promoted from interface to class (18 → 19); allFor keeps reference order (row-major, S/W/N/E per cell) — old allEntryPoints output saved before the change and matched byte for byte for sizes 3/4/5; wrong reference comment ("20", "N/E/S/W") corrected; EntryPointData interface added; no call sites changed; 7 temporary checks listed for 30.
- 30: 45 tests; full 16-entry allFor(4) order pinned as a literal (A8), checked against pre-29 code from git history, not the current shim; lengths 3/4/5; all 7 prompt-29 temporary checks covered; fromData invalidArgument checked by kind + input unchanged. NOTE for 59: A10 imports the engine shim — delete it with the shim.
- 31: BeamSegment promoted from interface to class (19 → 20); points derived in constructor (die.value × multiplier, 0 for empty pane), never passed in; only own fields position/direction/die/multiplier/points (struck is a getter); legacy engine interface untouched until 58; 5 temporary checks listed for 32.
- 32: 25 tests; die × multiplier partitioning with precomputed points; reference empty-cell case ported (R1, m=1..5); all 5 prompt-31 temporary checks covered (P7, P8, K3, D2); own-field and toData key lists pinned with Object.keys (toEqual alone ignores undefined keys); no error paths.
- 33: BeamPath new class (20 → 21); totalScore derived as sum of segment points; segments frozen copy in strike order; own fields segments/totalScore/termination only; bendCount = direction changes between consecutive segments (a bend on the final die is not counted, display-only); agent edited TRACKING.md unasked — reverted, row filled by hand; 6 temporary checks listed for 34.
- 34: 21 tests; fixtures EMPTY/SINGLE/STRAIGHT/ORBIT (+PAIR), ORBIT matches the reference cycle path cell by cell; all 6 prompt-33 temporary checks covered (L0, B0, F1, K1, D2, I1 split in 3); no error paths; TRACKING untouched by agent.
- 35 (CRITICAL): BeamTracer moved to model (count stays 21; engine wrapper counted once); loop ported statement by statement; REFRACTION_BY_COLOR moved to model/Refraction.ts (frozen); isolation protocol in full — golden walk 9 segments / 59 / cycle matched row by row (checked by hand), lockout cases, seed 3 = 5,5,31,16,2,7,53,37; purity confirmed; mutation check: bend-before-score caught by 12 tests, but empty-cell lockout, record-on-cycle and no-cap each caught by only 1–2 → strengthened in 36; restore verified by SHA-256 (new file, git diff not usable); prompt's -t "orbit" filter matches no test name.
- 36: 30 tests (13 reference cases ported); all 5 prompt-35 temporary checks covered; new K4, M4 (sixth bend at default cap), Y3 (3×3 cycle) — expected values hand-derived by agent and checked by hand; mutations rerun: a 18, b 3, c 3, d 6 failing tests (each now ≥ 3); B2 runs 3,200 random traces, all stop — 0 cycles, so the cycle guard is covered by hand-built Y1/Y3.