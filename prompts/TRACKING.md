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
| 26 | DraftPool Tests | | | | | | | | | | |
| 27 ⚠ | PlacementValidator | | | | | | | | | | |
| 28 | PlacementValidator Tests | | | | | | | | | | |
| 29 | EntryPoint | | | | | | | | | | |
| 30 | EntryPoint Tests | | | | | | | | | | |
| 31 | BeamSegment | | | | | | | | | | |
| 32 | BeamSegment Tests | | | | | | | | | | |
| 33 | BeamPath | | | | | | | | | | |
| 34 | BeamPath Tests | | | | | | | | | | |
| 35 ⚠ | BeamTracer | | | | | | | | | | |
| 36 | BeamTracer Tests | | | | | | | | | | |
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