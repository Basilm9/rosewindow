# Module of Thought Prompts — Rose Window (Push MVC, TypeScript)

**CRITICAL: These prompts drive a coding agent (Claude Code, Codex or opencode) to rebuild Rose Window in the Model-View-Controller style from the reference implementation in `src/`. Load `00-master-context.md` first in every session, then run the prompts in the order below, one at a time, verifying and recording each before the next.**

Generated on 19 Nov 2026 by Claude (model `claude-opus-5-5`, in Claude Cowork) by executing `ctxt/promptForPromptGenRoseWindow.txt` against the context folder: `RoseWindowReqPrompt.txt`, `Module of Thought_instr.md`, `MVC_RoseWindow.md`, `MVC_JohnHunt.md`, `GUI_mockupsRoseWindow.md` with `mockups/`, `acceptance_tests.md`, and the SRS (Rev 1.4). The generation was split across four writer agents working from one shared plan (numbering, file format, tracking thresholds), then cross-checked for consistent class names, file paths and error kinds.

**79 prompts** (Prompt 0 plus 78 increments). **19 are CRITICAL checkpoints (24 %)**, marked ✔ below; each carries a risk, failure indicators, an isolation-testing protocol and a rollback procedure.

---

## Prompt sequence (execution order)


### Foundation

| # | File | Purpose | CRITICAL |
| --- | --- | --- | --- |
| 00 | `00-master-context.md` | **Load first, every session.** Master context (MoT Prompt 0): domain, architecture, components, tracking thresholds, constraints, working agreements. |  |

### Project setup and MVC infrastructure

| # | File | Purpose | CRITICAL |
| --- | --- | --- | --- |
| 01 | `01-mvc-project-structure.md` | MVC Project Structure — Create the six MVC package folders (`src/mvc`, `src/model`, `src/controller`, `src/view`, `src/progression`, `src/util`), their mirrored `tests/` fold… | ✔ |
| 02 | `02-dependencies-and-import-rules.md` | Dependencies and Import-Boundary Rules — Pin the toolchain (pnpm, Vite, TypeScript strict, React 19, XState v5, Vitest, Playwright, ESLint 9 flat config, Prettier) and encode the package depe… | ✔ |
| 03 | `03-mvc-infrastructure.md` | MVC Infrastructure — Implement the push-MVC base types in `src/mvc` — `ModelListener`, `ModelEvent`, `AbstractModel`, `AbstractController`, `View` — plus the `useModelEven… | ✔ |
| 04 | `04-mvc-infrastructure-tests.md` | MVC Infrastructure Tests — Write the unit tests for `AbstractModel`, `AbstractController` and `subscribeModel` that prove listener registration, unsubscription and the in-order … |  |

### Model: errors, configuration, randomness and dice

| # | File | Purpose | CRITICAL |
| --- | --- | --- | --- |
| 05 | `05-game-error-classes.md` | GameError and PlacementError — Create `GameError` and its subclass `PlacementError` in `src/model/GameError.ts`, each carrying a machine-readable `violation`, and extend the violati… |  |
| 06 | `06-game-error-tests.md` | GameError and PlacementError Tests — Write `tests/model/GameError.test.ts` (Vitest) covering the error hierarchy, the structured `violation` payload and a non-empty, kind-specific message… |  |
| 07 | `07-game-config.md` | GameConfig — Move `GameConfig` into `src/model/GameConfig.ts` as the ONE place every tunable number lives (NFR-4.4): seed, rounds 8, gridSize 4, draftSize 5, place… |  |
| 08 | `08-game-config-tests.md` | GameConfig Tests — Write `tests/model/GameConfig.test.ts` that pins every default, the seed-normalization partitions, deep immutability and the `invalidArgument` rejecti… |  |
| 09 | `09-seeded-random.md` | SeededRandom — Move `SeededRandom` (mulberry32) and the Fisher–Yates `shuffled`/`sample` helpers into `src/model/SeededRandom.ts` as the SOLE randomness source of th… |  |
| 10 | `10-seeded-random-tests.md` | SeededRandom Tests — Write `tests/model/SeededRandom.test.ts` that freezes the mulberry32 stream and the Fisher–Yates order against PRECOMPUTED constants, so any change to… |  |
| 11 | `11-die.md` | Die — Move the immutable `Die` value class (color + value, frozen, value equality) into `src/model/Die.ts`, together with `DieColor` and `DIE_COLORS` in the… |  |
| 12 | `12-die-tests.md` | Die Tests — Write `tests/model/Die.test.ts` covering immutability, color+value equality (including plain JSON data), the fixed `DIE_COLORS` order and one rejectio… |  |
| 13 | `13-direction.md` | Direction — Create the `Direction` class in `src/model/Direction.ts` with exactly four static instances (NORTH, EAST, SOUTH, WEST), a private constructor, `clockw… |  |
| 14 | `14-direction-tests.md` | Direction Tests — Write `tests/model/Direction.test.ts` that pins the four instances, their deltas, both rotations for every direction, identity semantics and the `inva… |  |

### Model: the window and the draft

| # | File | Purpose | CRITICAL |
| --- | --- | --- | --- |
| 15 | `15-cell-constraints.md` | CellConstraint, ColorConstraint, ValueConstraint, OpenConstraint — Replace the provisional `CellConstraint` with the real interface in `src/model/CellConstraint.ts` and move the three implementing classes there, so a … | ✔ |
| 16 | `16-cell-constraint-tests.md` | CellConstraint Tests — Write `tests/model/CellConstraint.test.ts` that pins the acceptance table of all three constraint classes against a fixed set of dice, their own-data … |  |
| 17 | `17-window-pattern.md` | WindowPattern — Turn `WindowPattern` from an interface into a class in `src/model/WindowPattern.ts` that parses and VALIDATES its hand-authored rows at load time (NFR… |  |
| 18 | `18-window-pattern-tests.md` | WindowPattern Tests — Write `tests/model/WindowPattern.test.ts` that freezes the six-pattern catalog (ids, order, 4×4 shape, demand counts, the corrected novice-rose descri… |  |
| 19 | `19-window-cell.md` | WindowCell — Create the immutable `WindowCell` class in `src/model/WindowCell.ts` (a printed `CellConstraint` plus zero-or-one `Die`) that replaces the reference `… |  |
| 20 | `20-window-cell-tests.md` | WindowCell Tests — Write `tests/model/WindowCell.test.ts` covering every branch of `WindowCell` (empty / occupied for each method), its immutability and data shape, dele… |  |
| 21 | `21-glass-window.md` | GlassWindow — Rebuild `GlassWindow` in `src/model/GlassWindow.ts` as a grid of immutable `WindowCell`s with bounds and occupancy queries, and make it the class the … | ✔ |
| 22 | `22-glass-window-tests.md` | GlassWindow Tests — Write `tests/model/GlassWindow.test.ts` that pins construction from a pattern, snapshot isolation of `dice`, bounds and occupancy queries, and one tes… |  |
| 23 | `23-dice-bag.md` | DiceBag — Move `DiceBag` into `src/model/DiceBag.ts`: 90 dice (5 colors × 6 values × `config.copiesPerDie`), built in DIE_COLORS × value × copy order and shuffl… |  |
| 24 | `24-dice-bag-tests.md` | DiceBag Tests — Write `tests/model/DiceBag.test.ts` that pins the 90-die composition, the seeded draw order against PRECOMPUTED dice, conservation across draw/return,… |  |
| 25 | `25-draft-pool.md` | DraftPool — Move `DraftPool` into `src/model/DraftPool.ts`: the dice visible this round, with `take` matching by color AND value (never identity) and throwing `Pl… |  |
| 26 | `26-draft-pool-tests.md` | DraftPool Tests — Write `tests/model/DraftPool.test.ts` covering every branch of `take` (first match, duplicate dice, absent die), the copy semantics of the constructor… |  |

### Model: placement laws

| # | File | Purpose | CRITICAL |
| --- | --- | --- | --- |
| 27 | `27-placement-validator.md` | PlacementValidator — Move `PlacementValidator` into `src/model/PlacementValidator.ts` checking the six placement laws in the FIXED order cellOccupied → dieNotInPool → cons… | ✔ |
| 28 | `28-placement-validator-tests.md` | PlacementValidator Tests — Write `tests/model/PlacementValidator.test.ts` with one test per placement law (six), one precedence test for each of the 11 law pairs (of all 15) tha… |  |

### Model: the beam

| # | File | Purpose | CRITICAL |
| --- | --- | --- | --- |
| 29 | `29-entry-point.md` | EntryPoint — Create the `EntryPoint` class in `src/model/` (an edge cell plus the inward `Direction` the beam travels) and its deterministic enumeration `EntryPoin… |  |
| 30 | `30-entry-point-tests.md` | EntryPoint Tests — Write `tests/model/EntryPoint.test.ts`, porting every `allEntryPoints` case from `tests/engine/types.test.ts` and adding branch-coverage cases for `al… |  |
| 31 | `31-beam-segment.md` | BeamSegment — Create the immutable `BeamSegment` class in `src/model/` — one cell the beam entered: position, the direction it entered with (pre-refraction), the di… |  |
| 32 | `32-beam-segment-tests.md` | BeamSegment Tests — Write `tests/model/BeamSegment.test.ts` using input-domain partitioning over (die present/absent × multiplier 1 / middle / cap) and port the reference… |  |
| 33 | `33-beam-path.md` | BeamPath — Create the immutable `BeamPath` class in `src/model/` — the ordered `BeamSegment`s of one trace, their total and the termination reason (`'exitedGrid'… |  |
| 34 | `34-beam-path-tests.md` | BeamPath Tests — Write `tests/model/BeamPath.test.ts` with branch coverage of `totalScore`, `bendCount` and `peakMultiplier` (empty, single, straight, bent paths) agai… |  |
| 35 | `35-beam-tracer.md` | BeamTracer — Move the beam traversal into `src/model/BeamTracer.ts` returning `BeamPath`/`BeamSegment`/`EntryPoint` instances, preserving the reference rule law ex… | ✔ |
| 36 | `36-beam-tracer-tests.md` | BeamTracer Tests — Write `tests/model/BeamTracer.test.ts` asserting every path CELL BY CELL (row, col, direction, points), porting all 13 reference beam cases and coveri… |  |

### Model: objectives and scoring

| # | File | Purpose | CRITICAL |
| --- | --- | --- | --- |
| 37 | `37-public-objective.md` | Objective Interface and PublicObjective — Introduce the `Objective` interface (`score(grid)`) and the `PublicObjective` class holding one of the eight public rules as strategy data, moving the… |  |
| 38 | `38-public-objective-tests.md` | PublicObjective Tests — Write `tests/model/PublicObjective.test.ts` with one partitioned block per strategy family (FR-2.4 "one case per objective family"), porting every fam… |  |
| 39 | `39-private-objective.md` | PrivateObjective — Create `PrivateObjective implements Objective` (sum of the values of one patron colour, FR-2.5) and move the seeded deal into `dealObjectives(random)`… |  |
| 40 | `40-private-objective-tests.md` | PrivateObjective and Deal Tests — Write `tests/model/PrivateObjective.test.ts` covering the patron-colour sum by input-domain partitioning and the seeded deal by fixed-seed constants, … |  |
| 41 | `41-score-report.md` | ScoreReport — Create the immutable `ScoreReport` class in `src/model/` — itemized objective lines, beam total, grand total and tier — whose `total` is DERIVED as be… |  |
| 42 | `42-score-report-tests.md` | ScoreReport Tests — Write `tests/model/ScoreReport.test.ts` verifying that `total` always equals beam total plus the itemized lines (FR-8.3), that the report is immutable… |  |
| 43 | `43-score-calculator.md` | ScoreCalculator — Move final scoring into `src/model/ScoreCalculator.ts`: it scores the finished window against the four dealt objectives polymorphically through the `O… | ✔ |
| 44 | `44-score-calculator-tests.md` | ScoreCalculator Tests — Write `tests/model/ScoreCalculator.test.ts` testing tier boundaries by INPUT-DOMAIN PARTITIONING (each side of 40, 65 and 90 — FR-8.4 "one case per ti… |  |

### Model: events and the Game facade

| # | File | Purpose | CRITICAL |
| --- | --- | --- | --- |
| 45 | `45-model-event-classes.md` | The Seven Model Event Classes — Turn the `GameEvent` discriminated union into seven immutable classes extending `ModelEvent` (prompt 03) — `DiePlacedEvent`, `PlacementRejectedEvent`,… | ✔ |
| 46 | `46-model-event-tests.md` | Model Event Tests — Write `tests/model/events.test.ts` proving each of the seven event classes extends `ModelEvent`, carries its exact `kind` literal and payload, is immu… |  |
| 47 | `47-game.md` | Game (the model facade) — Move `Game` into `src/model/Game.ts` as `class Game extends AbstractModel<GameEvent>`: same round loop, phases, public API and seeded construction ord… | ✔ |
| 48 | `48-game-tests-golden-master.md` | Game Tests, Golden Master and Safety Properties — Write `tests/model/Game.test.ts` (phase-transition coverage, one test per error kind, all 21 ported reference cases), the frozen golden master — seed … | ✔ |

### Controller and statecharts

| # | File | Purpose | CRITICAL |
| --- | --- | --- | --- |
| 49 | `49-game-statechart.md` | Game Statechart (XState v5) — Move the game-flow statechart into `src/controller/gameStatechart.ts` and bring it to the shape of `MVC_RoseWindow.md` section 6 — explicit `forfeit` … | ✔ |
| 50 | `50-game-controller.md` | GameController — Create `GameController extends AbstractController<Game>` in `src/controller`: it owns the game statechart actor, turns each user gesture into one stat… | ✔ |
| 51 | `51-game-controller-tests.md` | GameController Tests — Write `tests/controller/GameController.test.ts` that covers every transition of the section 6 game statechart through the `GameController` API, proves… |  |
| 52 | `52-beam-statechart.md` | Beam Statechart — Move the beam statechart into `src/controller/beamStatechart.ts` and complete it per `MVC_RoseWindow.md` section 6: `traveling → refracting / lockedSt… |  |
| 53 | `53-beam-animation-controller.md` | BeamAnimationController — Create `BeamAnimationController extends AbstractController<Game>` in `src/controller`: it listens for `BeamTracedEvent`, owns one beam statechart acto… | ✔ |
| 54 | `54-beam-animation-controller-tests.md` | BeamAnimationController Tests — Write `tests/controller/BeamAnimationController.test.ts` covering every transition of the beam statechart and every pacing branch of `BeamAnimationCon… |  |

### Progression and persistence

| # | File | Purpose | CRITICAL |
| --- | --- | --- | --- |
| 55 | `55-run-recorder.md` | RunRecorder — Create `RunRecorder` in `src/progression`: it records the player's admitted actions, validates a stored record as untrusted data, and restores a run b… | ✔ |
| 56 | `56-player-profile.md` | PlayerProfile — Create the immutable value class `PlayerProfile` in `src/progression` that wraps the existing profile record (XP, level, shards, bests, achievements, … |  |
| 57 | `57-challenge-codec.md` | ChallengeCodec — Create `ChallengeCodec` in `src/progression` that encodes and decodes versioned friend-challenge codes (`RW1.<seed36>.<patternId>.<target36>.<check>`)… |  |

### View, utilities and legacy removal

| # | File | Purpose | CRITICAL |
| --- | --- | --- | --- |
| 58 | `58-view-rewiring.md` | View Rewiring (state only through GameController and useModelEvents) — Rewire every React view so it receives state only through `GameController` (snapshot + read model + queries) and model events only through `useModelEv… | ✔ |
| 59 | `59-util-and-legacy-removal.md` | Utilities and Legacy Removal — Move `sfx` and the auto-player into `src/util`, move the two view-only hooks into `src/view/hooks`, then delete the strangler shims in `src/engine`, `… |  |

### Diagrams

| # | File | Purpose | CRITICAL |
| --- | --- | --- | --- |
| 60 | `60-class-diagram-generator.md` | Class Diagram Generator with Import-Rule Report — Extend the existing deterministic `scripts/generate-uml.mjs` (TypeScript compiler API, runs inside `pnpm typecheck`) — do NOT replace it — so the gene… | ✔ |
| 61 | `61-statechart-diagram-export.md` | Statechart Diagram Export — Add a deterministic exporter that reads the two real XState v5 machine definitions (`gameStatechart`, `beamStatechart`) and writes them as UML state d… |  |

### Acceptance tests (Playwright)

| # | File | Purpose | CRITICAL |
| --- | --- | --- | --- |
| 62 | `62-at01-begin-run.md` | AT-01 Begin a Run at a Chosen Seed (+ shared acceptance harness) — Create the shared Playwright acceptance harness and `tests/e2e/acceptance/at01-begin-run.spec.ts`; | ✔ |
| 63 | `63-at02-objectives.md` | AT-02 Review the Objectives Mid-Run — Create `tests/e2e/acceptance/at02-objectives.spec.ts` proving the goal sheet shows three public objectives and one private colour objective, that open… |  |
| 64 | `64-at03-draft.md` | AT-03 Draft, Swap and Return a Die — Create `tests/e2e/acceptance/at03-draft.spec.ts` proving that selecting, swapping and returning a die moves exactly one die between draft and hand and… |  |
| 65 | `65-at04-placement-laws.md` | AT-04 One Rejection per Placement Law — First search seeds with the model to find a seed and pattern where each placement law can be broken in turn, record it, then create `tests/e2e/accepta… |  |
| 66 | `66-at05-illuminate.md` | AT-05 Illuminate the Window — Create `tests/e2e/acceptance/at05-illuminate.spec.ts` proving the beam enters at the announced cell and direction, is drawn cell by cell, and adds rou… |  |
| 67 | `67-at06-golden-game.md` | AT-06 Golden Game (Reproducibility) — Create `tests/e2e/acceptance/at06-golden-game.spec.ts` that plays seed 3, Novice Rose, with the max-flex automatic player through the real UI twice in… | ✔ |
| 68 | `68-at07-deadlock.md` | AT-07 Deadlocked Round — Create `tests/e2e/acceptance/at07-deadlock.spec.ts` proving that when no die fits anywhere the round is forfeited with a message saying why, the beam … |  |
| 69 | `69-at08-final-report.md` | AT-08 Complete a Run and Review the Score — Create `tests/e2e/acceptance/at08-final-report.spec.ts` proving the final report lists one line per objective plus a beam line, the grand total is the… |  |
| 70 | `70-at09-recast.md` | AT-09 Recast the Draft — Create `tests/e2e/acceptance/at09-recast.spec.ts` proving one recast per run returns the showing dice and the held die to the bag, deals fresh dice, k… |  |
| 71 | `71-at10-restore.md` | AT-10 Interrupt and Restore — Create `tests/e2e/acceptance/at10-restore.spec.ts` proving that reloading plain `localhost:5173` restores an interrupted run automatically (no prompt)… |  |
| 72 | `72-at11-suspend.md` | AT-11 Suspend a Run — Create `tests/e2e/acceptance/at11-suspend.spec.ts` proving that while paused no game action can happen: a click outside the pause menu only closes it,… |  |
| 73 | `73-at12-tutorial.md` | AT-12 First-Time Tutorial — Create `tests/e2e/acceptance/at12-tutorial.spec.ts` proving the first-launch tutorial appears, advances when the taught action is performed (the three… |  |
| 74 | `74-at13-audio.md` | AT-13 Audio Control — Create `tests/e2e/acceptance/at13-audio.spec.ts` whose automated part checks the sound calls (none before the first interaction, distinct sounds for s… |  |
| 75 | `75-at14-daily.md` | AT-14 Daily Challenge — Create `tests/e2e/acceptance/at14-daily.spec.ts` proving today's daily window, started from the pause menu, has the same seed and pattern in two brows… |  |
| 76 | `76-at15-challenge.md` | AT-15 Challenge Another Player — Create `tests/e2e/acceptance/at15-challenge.spec.ts` proving Challenge on the final report copies a link that carries only the challenge code, that th… |  |
| 77 | `77-at16-phone-width.md` | AT-16 Play a Round at Phone Width — Create `tests/e2e/acceptance/at16-phone-width.spec.ts` that plays one round by tapping at 360×640 with touch and again at 1920×1080, proving there is … |  |
| 78 | `78-at17-accessibility.md` | AT-17 Accessibility — Create `tests/e2e/acceptance/at17-accessibility.spec.ts` that uses Playwright's accessibility snapshot and emulated reduced motion to prove the window… |  |

---

## How to run them

1. **Session start:** load `00-master-context.md` as persistent context, then open `TRACKING.md` and continue from the last green row.
2. **One prompt at a time:** give the agent the prompt plus the files it lists under *Context to attach* (for view prompts, the named mockup images).
3. **Verify:** run `pnpm typecheck && pnpm lint && pnpm test` (and `pnpm e2e` from prompt 58 on). Read the actual output; do not accept the agent's summary.
4. **Record:** fill the prompt's row in `TRACKING.md` with the real numbers; commit (`feat(model): inc NN …`); tag `inc-NN-green` when every metric is green.
5. **Red metric:** follow the degradation protocol in Prompt 0; for a CRITICAL prompt, use its isolation and rollback steps (`git reset --hard inc-<last green>-green`).
6. **Two developers:** split by package (for example model 05–48 to one developer; MVC 01–04, controller 49–54, progression 55–57, view 58–61 to the other), each on their own branch; merge often and rerun the full suite after every merge. Acceptance tests 62–78 run last, against the final build.

## Tracking matrix thresholds

| Metric | Green | Yellow | Red |
| --- | --- | --- | --- |
| `pnpm typecheck` errors | 0 | — | ≥ 1 |
| `pnpm lint` | 0 errors, 0 warnings | 0 errors, 1–5 warnings | any error or > 5 warnings |
| Unit test pass rate | 100 % | — | < 100 % |
| Golden master (seed 3, novice-rose, max-flex) | 5,5,31,16,2,7,53,37 / 156 | — | any difference |
| E2E pass rate (from 58) | 100 % | ≥ 90 % | < 90 % |
| Concrete class count | ≥ planned for the increment (final ≥ 36) | ≥ 15, below plan | < 15 |
| Import-rule violations (from 60) | 0 | — | ≥ 1 |

## Conventions used in every prompt

- **Sandwich method:** the critical requirement opens and closes every prompt.
- **Attention anchoring:** **MANDATORY** and **CRITICAL** directives where compliance is required.
- **Visual emphasis and clear delimiters:** bold, `code`, TypeScript signature blocks, `###` sections.
- **Selective context:** each prompt names only the reference module, tests, SRS requirements and `ctxt/` files it needs.
- **MoT increment header:** status (Standard / CRITICAL), dependencies, reference implementation, requirements; then capability, implementation, verification protocol, and (CRITICAL only) the checkpoint.

## Not covered here (Step 4, verification and testing)

The 1,000-seed reliability run (NFR-1.8; prompt 48 samples seeds 1–100), the timing tests for NFR-3.6 and NFR-3.7, and the Hoare-style proof of the beam loop checked with Lean 4 are planned as separate verification work after these prompts.
