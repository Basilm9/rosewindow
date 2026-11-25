# Tracking matrix — fill one row per increment from real command output

Thresholds: see `00-master-context.md` section 4. Variant = the developer/branch that ran the increment.

| # | Prompt | Variant (who / branch) | typecheck errors | lint errors / warnings | unit pass % | golden master | e2e pass % | classes | import violations | zone | commit / tag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 ✔ | MVC Project Structure | Darren / feat/mvc-foundation | 0 | 0/0 | 98.4%->100% after junction fix | 156 ✓ | — | 15 | — |red -> Green | inc-01-green |
| 02 ✔ | Dependencies and Import-Boundary Rules | Darren / feat/mvc-foundation | 0 | 0 / 0 | 100% (270/270) | 156 ✓ | — | 15 | — | green | inc-02-green |
| 03 ✔ | MVC Infrastructure | Darren / feat/mvc-foundation | 0 | 0/0 | 100% (287/287) | 156 ✓ | smoke 1/1 | 15 | — | green | inc-03-green |
| 04 ✓ | MVC Infrastructure Tests | Darren / feat/mvc-foundation | 0 | 0/0 | 100% (291/291) | 156 ✓ | — | 15 | — | green | inc-04-green |
| 05 ✓ | GameError and PlacementError | Darren / feat/mvc-model |  0 | 0/0 | 100% (291/291) | 156 ✓ | — | 15 | — | green | inc-05-green |
| 06 ✓ | GameError and PlacementError Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (313/313) | 156 ✓ | — | 15 | — | green | inc-06-green |
| 07 ✓ | GameConfig | Darren / feat/mvc-model | 0 | 0/0 | 100% (313/313) | 156✓ | — | 15 | — | green | inc-07-green |
| 08 ✓ | GameConfig Tests | Darren / feat/mvc-model | 0 | 0/0 | 100% (334/334) | 156✓ | — | 15 | — | green  | inc-08-green |
| 09 | SeededRandom | Darren / feat/mvc-model | 0 | 0/0 | 100% (334/334) | 156✓ | — | 15 | — | green  | inc-09-green |
| 10 | SeededRandom Tests | | | | | | | | | | |
| 11 | Die | | | | | | | | | | |
| 12 | Die Tests | | | | | | | | | | |
| 13 | Direction | | | | | | | | | | |
| 14 | Direction Tests | | | | | | | | | | |
| 15 ✔ | CellConstraint, ColorConstraint, ValueConstraint, OpenConstraint | | | | | | | | | | |
| 16 | CellConstraint Tests | | | | | | | | | | |
| 17 | WindowPattern | | | | | | | | | | |
| 18 | WindowPattern Tests | | | | | | | | | | |
| 19 | WindowCell | | | | | | | | | | |
| 20 | WindowCell Tests | | | | | | | | | | |
| 21 ✔ | GlassWindow | | | | | | | | | | |
| 22 | GlassWindow Tests | | | | | | | | | | |
| 23 | DiceBag | | | | | | | | | | |
| 24 | DiceBag Tests | | | | | | | | | | |
| 25 | DraftPool | | | | | | | | | | |
| 26 | DraftPool Tests | | | | | | | | | | |
| 27 ✔ | PlacementValidator | | | | | | | | | | |
| 28 | PlacementValidator Tests | | | | | | | | | | |
| 29 | EntryPoint | | | | | | | | | | |
| 30 | EntryPoint Tests | | | | | | | | | | |
| 31 | BeamSegment | | | | | | | | | | |
| 32 | BeamSegment Tests | | | | | | | | | | |
| 33 | BeamPath | | | | | | | | | | |
| 34 | BeamPath Tests | | | | | | | | | | |
| 35 ✔ | BeamTracer | | | | | | | | | | |
| 36 | BeamTracer Tests | | | | | | | | | | |
| 37 | Objective Interface and PublicObjective | | | | | | | | | | |
| 38 | PublicObjective Tests | | | | | | | | | | |
| 39 | PrivateObjective | | | | | | | | | | |
| 40 | PrivateObjective and Deal Tests | | | | | | | | | | |
| 41 | ScoreReport | | | | | | | | | | |
| 42 | ScoreReport Tests | | | | | | | | | | |
| 43 ✔ | ScoreCalculator | | | | | | | | | | |
| 44 | ScoreCalculator Tests | | | | | | | | | | |
| 45 ✔ | The Seven Model Event Classes | | | | | | | | | | |
| 46 | Model Event Tests | | | | | | | | | | |
| 47 ✔ | Game (the model facade) | | | | | | | | | | |
| 48 ✔ | Game Tests, Golden Master and Safety Properties | | | | | | | | | | |
| 49 ✔ | Game Statechart (XState v5) | | | | | | | | | | |
| 50 ✔ | GameController | | | | | | | | | | |
| 51 | GameController Tests | | | | | | | | | | |
| 52 | Beam Statechart | | | | | | | | | | |
| 53 ✔ | BeamAnimationController | | | | | | | | | | |
| 54 | BeamAnimationController Tests | | | | | | | | | | |
| 55 ✔ | RunRecorder | | | | | | | | | | |
| 56 | PlayerProfile | | | | | | | | | | |
| 57 | ChallengeCodec | | | | | | | | | | |
| 58 ✔ | View Rewiring (state only through GameController and useModelEvents) | | | | | | | | | | |
| 59 | Utilities and Legacy Removal | | | | | | | | | | |
| 60 ✔ | Class Diagram Generator with Import-Rule Report | | | | | | | | | | |
| 61 | Statechart Diagram Export | | | | | | | | | | |
| 62 ✔ | AT-01 Begin a Run at a Chosen Seed (+ shared acceptance harness) | | | | | | | | | | |
| 63 | AT-02 Review the Objectives Mid-Run | | | | | | | | | | |
| 64 | AT-03 Draft, Swap and Return a Die | | | | | | | | | | |
| 65 | AT-04 One Rejection per Placement Law | | | | | | | | | | |
| 66 | AT-05 Illuminate the Window | | | | | | | | | | |
| 67 ✔ | AT-06 Golden Game (Reproducibility) | | | | | | | | | | |
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