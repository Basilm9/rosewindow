# Prompt 54: BeamAnimationController Tests

**CRITICAL: Write `tests/controller/BeamAnimationController.test.ts` covering every transition of the beam statechart and every pacing branch of `BeamAnimationController` (normal, reduced motion, pause/resume, replacement, recovery, dispose) with a fake scheduler, and port the 4 blocks of `tests/machine/beamMachine.test.ts`. No production change unless a defect is found; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**

---

### INCREMENT 54: BeamAnimationController test class
- **Status:** Standard
- **Dependencies:** Prompts 52, 53
- **Reference implementation:** `tests/machine/beamMachine.test.ts` (`walk` helper, `parseGrid` from `tests/helpers/board.ts`, paths through `traceBeam`/`BeamTracer`)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` section 6; `AGENTS.md` (mandatory beam cases)
- **Requirements:** FR-5.6, FR-5.7, FR-5.10, NFR-5.6, NFR-3.4, FR-17.1

### MANDATORY: Sandwich Requirement
- **Start:** Fresh `Game`, `FakeScheduler` and recording listener per test; time advances only through `scheduler.tick(ms)`.
- **End:** all statechart transitions B1–B9 and pacing cases P1–P9 pass; `tests/machine/beamMachine.test.ts` is still green.

---

### 1. Capability Specification
- **Adds:** `tests/controller/BeamAnimationController.test.ts`, `tests/controller/FakeScheduler.ts` (implements `Scheduler`; `tick(ms)` runs due callbacks in time order).
- **Unchanged:** production code; old beam test file (removed in 59).

### 2. Implementation Instructions
Paths (precomputed with the model's `BeamTracer`, multiplier cap 5) — reuse the reference grids:
```ts
const BEND  = trace(['.. R1 .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'], { row: 0, col: 0 }, 'east')  // refracts once
const LOCK  = trace(['.. R6 .. ..', '.. Y3 .. ..', '.. .. .. ..', '.. .. .. ..'], { row: 0, col: 0 }, 'east')  // V−1 lockout
const CYCLE = trace(['R1 R1', 'B1 R1'], { row: 1, col: 0 }, 'east')                                           // cap 5, cycle guard
const EXIT  = trace(['.. .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'], { row: 0, col: 0 }, 'south')
```
(`trace` = small helper outside the tests wrapping the model tracer; `direction` uses the `Direction` instances of prompt 13.)

Header comment: **test-design criterion: transition coverage** for the beam statechart and **branch coverage** of `play`/`advance`/`pause`/`resume`/`dispose`. No control flow inside a test; constants only.

| Id | Transition / branch | Expected |
|---|---|---|
| B1 | traveling →terminated (`pathExhausted`) on EXIT after its 4 steps (the reference test's "single-cell path" comment is wrong: (0,0) south crosses 4 cells) | status `done`, `index` 4 |
| B2 | traveling →refracting (`nextBends`) | BEND: states visited contain `refracting`, `multiplier 2` |
| B3 | traveling →lockedStraight (`nextLocked`) | LOCK: contains `lockedStraight`, final `lockout 2`, `multiplier 2` |
| B4 | traveling self (`advanceStraight`) | EXIT before termination: state `traveling`, `index 1` |
| B5 | refracting →traveling (ADVANCE) | BEND |
| B6 | lockedStraight →traveling (ADVANCE) | LOCK |
| B7 | SKIP from traveling / refracting / lockedStraight (`it.each`, 3 rows) | final context equals stepped context (precomputed constants) |
| B8 | traveling →terminated eventless (`reducedMotion`) | `done` right after `start()` |
| B9 | CYCLE: 5 `refracting` visits, `multiplier 5` (cap), terminates | cycle guard holds (NFR-1.4) |
| P1 | `play(BEND)` normal | `onStart` once; 0 steps at t=0; first `onStep` at t=400 |
| P2 | completion | `onSettled` once when done; `onFinished` at settle + 450 ms, not before (tick 449 → 0 calls) |
| P3 | step payload | for the R1 strike `multiplier 1`, `bent true`; `run.points` equals path total at settle |
| P4 | reduced motion | all 4 steps of EXIT and `onSettled` inside `play`; `onFinished` 0 times until `tick(0)`, then once; 0 pending timers after |
| P5 | pause mid-path then tick 5000 | no new steps; resume → next step after 400 ms; total steps equals the uninterrupted run |
| P6 | second `play` before done | first path's remaining steps never delivered; `onFinished` called once (for the second) |
| P7 | `dispose()` | 0 pending timers, `isPlaying false`, later `beamTraced` events ignored |
| P8 | `attach()` then model publishes `beamTraced` (drive a seeded `Game` through two placements) | `onStart` receives that event's path (`toBe`) |
| P9 | `recover()` on a model whose blocked draft was forfeited before `attach()` (seed 7, Clerestory, blue 1 at `{row:3,col:3}`, then `forfeitRound()`) | `true`, `onStart` path starts at `entrySequence[0]` and its total equals `roundScores[0]`; a second call while playing is `false`; on a game with no scored round `false` |

**Error kinds:** the controller raises none; P7 also asserts `advance()` after `dispose()` returns `null` instead of throwing.

**Port:** the 4 reference blocks, prefixed `ported:`, now built on `beamStatechart`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/controller/BeamAnimationController.test.ts   # 9 + 2 (B7 extra rows) + 9 + 4 ported = 24 tests, 100 %
pnpm typecheck && pnpm lint && pnpm test && pnpm e2e
pnpm vitest run -t "golden"                                        # 156
git commit -am "test(controller): inc 54 BeamAnimationController tests" && git tag inc-54-green
```
- [ ] Fake scheduler only; no real `setTimeout` in the file (`grep -c "setTimeout(" …` counts only FakeScheduler)
- [ ] Each B and P id appears in a test title
- [ ] Tracking: unit 100 %, golden exact, lint 0/0, e2e 100 %, classes ≥ 33

---

**CRITICAL: Beam statechart transitions and BeamAnimationController pacing (normal, reduced motion, pause, replacement, dispose) are pinned by deterministic tests; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
