# Master Context Document (Prompt 0) — Rose Window, Push MVC in TypeScript

**CRITICAL: Load this document at the start of every development session, before any numbered prompt. It is the single source of domain and architectural truth for Prompts 01–78. When a numbered prompt and this document disagree, stop and ask; do not guess.**

---

### 1. Domain Background & Theory

- **Rose Window** is a single-player stained-glass puzzle game for the browser. Over **8 rounds** the player drafts dice from a seeded pool of 5 and places **2 per round** into a **4×4 window** under placement laws; at the end of each round a **beam of light** enters at an announced edge cell, refracts through the placed dice and scores them. After round 8 the window is also scored against **3 public objectives** and **1 private objective**. Full requirements: `ctxt/RoseWindowReqPrompt.txt` and the SRS (Rev 1.4).
- **Placement laws** (checked in this fixed order, first violation wins): cell occupied → die not in pool → printed demand (colour or value) → orthogonal adjacency (no shared colour or value) → first die on the outer ring → every later die touches a placed die (orthogonally or diagonally).
- **Beam law** (do not reinterpret): red/yellow turn 90° clockwise, blue/green 90° counter-clockwise, purple straight. A struck die scores `value × multiplier` **before** its own bend; each bend adds 1 to the multiplier, capped at **5**; after a bend on a die of value V the beam is locked straight for **V − 1** cells (dice there still score); the beam stops on leaving the window or on re-entering a (cell, direction) pair already visited (**cycle guard**).
- **Determinism:** every random element comes from one numeric seed through one seeded RNG (mulberry32). Same seed ⇒ identical run.
- **Push MVC** (John Hunt, `ctxt/MVC_JohnHunt.md`): the **model** owns all state and rules and knows nothing of views; on every change it **pushes** a semantic event to registered listeners (Observer, a loop over listeners in `AbstractModel.notifyChanged`). The **controller** turns user gestures into model calls (Strategy). The **view** renders and forwards gestures. User → View → Controller → Model → (event) → View.

---

### 2. System Architecture Overview

| Package | Folder | Responsibility | May import |
| --- | --- | --- | --- |
| MVC infrastructure | `src/mvc` | `ModelListener`, `ModelEvent`, `AbstractModel`, `AbstractController`, `View`, `useModelEvents` | — |
| Model | `src/model` | All state and rules; publishes events | `src/mvc` only. **No** React, DOM, `window`, `localStorage`, XState |
| Controller | `src/controller` | `GameController` (owns the game statechart), `BeamAnimationController` (owns the beam statechart) | `model`, `mvc`, XState |
| View | `src/view` | React function components; receive state only through `GameController` + `useModelEvents` | `controller`, `mvc`, model **types** |
| Progression | `src/progression` | `RunRecorder`, `PlayerProfile`, `ChallengeCodec`; never affects rules or scores | `model` |
| Utility | `src/util` | `sfx`, `autoPlayer` | — |

Tests mirror the packages under `tests/`; Playwright specs live in `tests/e2e/` (acceptance tests in `tests/e2e/acceptance/`). Design detail: `ctxt/MVC_RoseWindow.md` (section 4 class list, section 5 import rules, section 6 statecharts). GUI: the screenshots in `ctxt/mockups/` are authoritative (`ctxt/GUI_mockupsRoseWindow.md`).

**Migration strategy (strangler):** the existing code in `src/engine`, `src/machine`, `src/hooks`, `src/dev` is the **reference implementation**. Each class prompt builds the class in its new package by reusing the named reference module's logic and tests, then turns the old module into a thin delegate so the game keeps running. The shims are deleted in Prompt 59.

---

### 3. Component Specifications (summary)

- **Model (24 classes + 7 events):** `GameError`, `PlacementError`, `GameConfig`, `SeededRandom`, `Die`, `Direction`, `ColorConstraint`, `ValueConstraint`, `OpenConstraint`, `WindowPattern`, `WindowCell`, `GlassWindow`, `DiceBag`, `DraftPool`, `PlacementValidator`, `EntryPoint`, `BeamSegment`, `BeamPath`, `BeamTracer`, `PublicObjective`, `PrivateObjective`, `ScoreReport`, `ScoreCalculator`, `Game` (extends `AbstractModel<GameEvent>`); events `DiePlacedEvent`, `PlacementRejectedEvent`, `DraftPoolRefreshedEvent`, `BeamTracedEvent`, `RoundScoredEvent`, `RoundForfeitedEvent`, `GameOverEvent`.
- **Controller:** `GameController extends AbstractController<Game>`; `BeamAnimationController`.
- **Progression:** `RunRecorder` (record actions, restore by **replaying** them through `Game`, never by loading a stored board), `PlayerProfile`, `ChallengeCodec`.
- **Statecharts:** game — `setup → round (draft ⇄ place) → illuminate → next round | finalScoring → gameOver`, with `forfeit` on no legal move and `paused` from any in-run state; beam — `traveling → refracting → lockedStraight → … → terminated`, with immediate completion under reduced motion.
- **Exceptions:** every foreseeable failure throws `GameError` or a subclass carrying a machine-readable violation; every throwing method documents `@throws`.

---

### 4. Performance Metrics & Thresholds (tracking matrix — record after every increment in `prompts/TRACKING.md`)

| Metric | Green | Yellow | Red |
| --- | --- | --- | --- |
| `pnpm typecheck` errors | 0 | — | ≥ 1 |
| `pnpm lint` | 0 errors, 0 warnings | 0 errors, 1–5 warnings | any error or > 5 warnings |
| Unit test pass rate (`pnpm test`) | 100 % | — | < 100 % |
| **Golden master** | seed 3, novice-rose, max-flex auto-player: rounds **5,5,31,16,2,7,53,37**, beam total **156** | — | any difference |
| E2E pass rate (`pnpm e2e`, from Prompt 58) | 100 % | ≥ 90 % | < 90 % |
| Concrete class count (`pnpm check:classes`) | ≥ the count planned for the increment (final ≥ 36) | ≥ 15 but below plan | < 15 |
| Import-rule violations (UML generator, from Prompt 60) | 0 | — | ≥ 1 |

**Degradation protocol** (any red): 1) isolate — rerun only the current increment's tests; 2) compare against the last green tag; 3) inspect intermediate outputs (event stream, beam path cell by cell, score lines); 4) verify the rule against the SRS and the reference test; 5) apply the prompt's rollback/mitigation. Never edit golden values to make a test pass.

**Critical checkpoints (a priori, 19 of 79 = 24 %):** 01, 02, 03, 15, 21, 27, 35, 43, 45, 47, 48, 49, 50, 53, 55, 58, 60, 62, 67 — architectural transitions, the two core algorithms (placement, beam), the model facade, the controller/statechart hand-over, persistence, the view rewiring, and the acceptance harness.

---

### 5. Technical Constraints

- Node ≥ 22, pnpm; Vite 7, React 19, TypeScript strict, Tailwind v4, XState v5, Vitest 3, Playwright; static deployment, no server, no network needed to play, all player data on the device.
- Tunable numbers (rounds 8, grid 4, draft 5, placements 2, copies per die 3, multiplier cap 5, tier thresholds) live only in `GameConfig`.
- TSDoc on every class, field and method at every visibility; declare by interface/abstract type where one exists; UI components identified by strings/enums.
- Accessibility: the window is a `role="grid"` with `role="row"` rows and `role="gridcell"` cells labelled with row/column (counted from 1) and contents; die values drawn as numerals; reduced motion respected; playable 360–1920 px without scrolling; single-tap controls ≥ 24×24 px.
- Safety properties (SRS §4.6): a rejected placement never changes the window; the beam always stops; the running total equals the sum of round scores; a recast never grants an extra placement, round or points; no game action while paused.

---

### 6. Dependencies, Prerequisites & Working Agreements

- **Context to load with every prompt:** this file plus the files the prompt lists under "Context to attach" (from `ctxt/`). The SRS is `ctxt/SRS_rev1.4.txt` (plain-text copy of `RoseWindow_SRS_Group18 (Rev 1.4).docx`); any prompt that cites `SRS_rev1.4.txt` means this file.
- **Process:** one capability per prompt, in README order; after each prompt run `pnpm typecheck && pnpm lint && pnpm test` (and `pnpm e2e` once views are involved), fill the prompt's row in `TRACKING.md`, commit (`feat(model): inc NN …`), and tag `inc-NN-green` when every metric is green. Rollback = `git reset --hard inc-<last green>-green`.
- **Team process:** the two developers split prompts by package, each works on their own branch, merges back, and reruns the full suite after every merge (regression testing). The git history is part of the deliverable.
- **Verification is human-owned:** an agent's claim that tests pass is not evidence; the tracking row is filled from the actual command output.

---

**CRITICAL: Load this master context at the start of every session. The model never imports React, DOM or XState; every change keeps the golden master at 5,5,31,16,2,7,53,37 / 156; one capability per prompt, verified and recorded before the next.**
