# Prompt 51: GameController Tests

**CRITICAL: Write `tests/controller/GameController.test.ts` that covers every transition of the section 6 game statechart through the `GameController` API, proves that a paused run accepts no drafting, placing or recast action (NFR-6.5), and ports all 15 blocks of `tests/machine/gameMachine.test.ts`. The golden run through the controller must give 5,5,31,16,2,7,53,37 / 156.**

---

### INCREMENT 51: GameController test class
- **Status:** Standard
- **Dependencies:** Prompts 49, 50
- **Reference implementation:** `tests/machine/gameMachine.test.ts` (fixtures `makeActor`, seed 3, `PATTERN = 'novice-rose'`), `tests/helpers/autoPlayer.ts` (`bestPair`), `tests/helpers/board.ts`
- **Context to attach:** `ctxt/MVC_RoseWindow.md` section 6; `ctxt/acceptance_tests.md` AT-07, AT-09, AT-11
- **Requirements:** NFR-2.3, NFR-6.5, FR-17.1, FR-17.2, FR-6.2, FR-11.6, FR-11.7, NFR-5.1

### MANDATORY: Sandwich Requirement
- **Start:** One test class for one production class; every test builds a fresh `Game` + `GameController` + recording `View`.
- **End:** all 27 rows listed below are exercised (each test name starts with its id) and the old machine test file still passes untouched.

---

### 1. Capability Specification
- **Adds:** `tests/controller/GameController.test.ts`, fixture builder `tests/controller/fixtures.ts`.
- **Unchanged:** production code (fix only genuine defects, each in its own commit); `tests/machine/gameMachine.test.ts` stays until prompt 59.

### 2. Implementation Instructions
Fixture (no shared mutable state):
```ts
export function makeController(seed = 3, skipAnimations = true) {
  const game = new Game(createGameConfig(seed))
  const view = { feedback: [] as Feedback[], showFeedback(f: Feedback) { this.feedback.push(f) } }
  const controller = new GameController(game, { skipAnimations })
  controller.setView(view)
  return { game, controller, view }
}
```
Header comment: **test-design criterion: transition coverage** of the game statechart (every transition, including eventless `always` and fallback branches, at least once), plus **one test per error kind** the controller can surface. Rules: no `if`/loops inside a test (use `it.each` for tables, a helper outside the test to auto-play), compare with literal constants, let exceptions propagate.

| Id | Transition | Setup → action | Assert |
|---|---|---|---|
| T1 | setup →round.draft | `choosePattern('novice-rose')` | `true`, path `round.draft` |
| T2 | setup fallback | `choosePattern('no-such')` | `false`, path `setup`, 1 feedback `kind 'rejected'` |
| T3–T5 | setup boot: gameOver / holding die / in round | pre-advanced `Game` (reference blocks "resumes a model that already has a selected die") | path `finalScoring→gameOver` / `round.place` / `round.draft` |
| T6 | draft →place | `selectDie(pool[0])` | `true`, `heldDie` equals die |
| T7 | draft fallback | `selectDie(purple 6)` | `false`, message `'die not in pool or wrong phase'` |
| T8 | draft recast | `recast()` | `true`, `refreshesRemaining === 0` |
| T9 | draft →forfeit→illuminate | seed 7, `skipAnimations: true`, Clerestory, AT-07 placement: blue 1 at `{row:3,col:3}` | `roundForfeited` event received, round advances |
| T10 | place →draft (DIE_PLACED) | legal ring placement | `placementsRemaining === 1` |
| T11 | place →illuminate (ROUND_COMPLETED) | second legal placement, `skipAnimations: false` | path `round.illuminate` |
| T12 | place fallback | interior `(1,1)` first placement | `false`, feedback `{ kind: 'illegalFirstPlacement', position: {row:1,col:1} }`, `placedCount === 0` |
| T13–T14 | place reselect / reselect fallback | | hand swapped / `false` |
| T15 | place →draft cancel | `cancelSelection()` | `hand === null` |
| T16 | place →draft recast | hold die, `recast()` | draft size 5 − placed, hand `null` |
| T17 | place →forfeit | seed 7, Clerestory on the model: `choosePattern`, select and place blue 1 at `{row:3,col:3}`, `selectDie(pool[0])`, add a model listener, then `new GameController(game, { skipAnimations: true })` (a draft with no legal move is forfeited before a die can be picked through the controller, so this state is reachable only by booting on such a model) | `roundForfeited` recorded, path `round.draft` of round 2 |
| T18 | forfeit →illuminate | covered by T9 (assert path with `skipAnimations: false`) | `round.illuminate` |
| T19 | illuminate →announceNext | `beamAnimationDone()` | round + 1 |
| T20 | illuminate pass-through | `skipAnimations: true` | never `round.illuminate` |
| T21–T22 | announceNext →finalScoring / →draft | last round / other rounds | `report` non-null / path `round.draft` |
| T23 | round →paused | `pause()` from draft, place, illuminate (`it.each`) | `true`, path `paused` |
| T24 | paused →round.hist | `resume()` | path equals the pre-pause path (3 rows) |
| T25 | finalScoring →gameOver | golden auto-play | `snapshot.status === 'done'` |
| T26 | PAUSE refused outside a run | `pause()` in setup and after game over (`it.each`) | `false`, path unchanged |
| T27 | `viewPath` while paused | `pause()` from draft, place, illuminate (`it.each`) | `statePath` is `paused`, `viewPath` is the pre-pause path |

**NFR-6.5 / FR-17.2 table** (`it.each` over 5 actions while paused with a die held): `selectDie`, `placeDie({row:0,col:0})`, `cancelSelection`, `recast`, `choosePattern` → each returns `false`; `game.window.placedCount`, `game.hand`, `game.draftPool.size`, `game.refreshesRemaining` equal their pre-pause constants; no feedback is recorded (silent refusal, AT-11).

**Error-kind tests:** (E1) placement rejection → `PlacementError` kinds surface as feedback (T12), and a demand mismatch carries `violation.expected` (FR-4.11); (E2) second recast (FR-11.7) → `recast()` returns `false` and state unchanged; (E3) a `GameError` thrown by the model is caught: test double `class ThrowingGame extends Game { override selectDie(): void { throw new GameError({ kind: 'invalidPhase' }) } }` → `selectDie` returns `false`, feedback kind `'invalidPhase'`, and the controller still works afterwards (`statePath` is `round.draft` and `recast()` returns `true`: the actor was rebuilt, prompt 50 step 2); (E4) a non-`GameError` (`RangeError` from the double) propagates: `expect(() => controller.selectDie(d)).toThrow(RangeError)`; (E5) an illegal placement followed by `selectDie(purple 6)` gives feedback kind `'rejected'` second, not the stale placement rejection; (E6) a snapshot listener is called after a refused placement; (E7) `onAction` is called once with the action on success and not at all on a refusal.

**Golden test:** drive the controller with `bestPair` from `tests/helpers/autoPlayer.ts` (helper loop outside the `it`), assert `roundScores` `toEqual([5,5,31,16,2,7,53,37])` and `totalScore` `toBe(156)`.

**Port:** re-express each of the 15 reference blocks through the controller API (keep their titles with prefix `ported:`), including the out-of-grid `it.each` positions `{row:-1,col:0}`, `{row:4,col:0}` …

### 3. Verification Protocol
```bash
pnpm vitest run tests/controller/GameController.test.ts   # ≥ 27 transition tests + 5 paused rows + 7 error tests + golden + 15 ported, 100 %
pnpm typecheck && pnpm lint && pnpm test && pnpm e2e
pnpm vitest run -t "golden"        # 156
git commit -am "test(controller): inc 51 GameController tests" && git tag inc-51-green
```
- [ ] T1–T27 and E1–E7 ids present in test titles (including `it.each` titles)
- [ ] Every paused-action row asserts model unchanged
- [ ] Tracking: unit 100 %, golden exact, lint 0/0, e2e 100 %, classes ≥ 32

---

**CRITICAL: Every statechart transition, the paused-run refusal (NFR-6.5) and every controller error path are now pinned by tests on `GameController`; the golden master 5,5,31,16,2,7,53,37 / 156 reproduces through the controller.**
