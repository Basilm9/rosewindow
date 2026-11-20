# Prompt 49: Game Statechart (XState v5)

**CRITICAL: Move the game-flow statechart into `src/controller/gameStatechart.ts` and bring it to the shape of `MVC_RoseWindow.md` section 6 — explicit `forfeit` state and a `paused` state reached from any in-run state and resumed through a deep-history state — while the machine still never implements a rule (guards call only `Game` queries and `PlacementValidator`). The golden run through the machine must still give 5,5,31,16,2,7,53,37 / 156.**

---

### INCREMENT 49: Game statechart
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompts 03, 27, 47, 48
- **Reference implementation:** `src/machine/gameMachine.ts` (logic) and `tests/machine/gameMachine.test.ts` (15 test blocks)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` sections 2, 5, 6; `ctxt/acceptance_tests.md` (AT-07, AT-11)
- **Requirements:** NFR-2.3, NFR-6.5, FR-17.1, FR-17.2, FR-6.2, FR-6.4, FR-11.6

### MANDATORY: Sandwich Requirement
- **Start:** Reuse the reference machine's guards, actions and event names verbatim; add only `forfeit`, `paused`, `round.hist`, `PAUSE`, `RESUME`.
- **End:** `tests/machine/gameMachine.test.ts` passes **unchanged** through the shim, including `drives the golden run to game over` (156).

---

### 1. Capability Specification
- **Adds:** pause/resume (FR-17.1); while paused, no drafting, placing or recast event is accepted (`snapshot.can(...) === false`, FR-17.2 / NFR-6.5); a named `forfeit` state for the deadlock escape.
- **Changes:** imports move from `../engine/*` to `@model`; every non-fallback transition taken on an external event (`CHOOSE_PATTERN`, `SELECT_DIE`, `PLACE_DIE`, `CANCEL_SELECTION`, `REFRESH_DRAFT`, `PAUSE`, `RESUME`, `BEAM_ANIMATION_DONE`) now resets `lastError` and `lastRejection` to `null` (`choosePattern` becomes an `assign`; add a `clearFeedback` assign to the others) — prompt 50 decides success by `lastError === null` after a send.
- **Unchanged:** event payloads, `skipAnimations` input, `illuminate` animation gate, `setup` boot transitions for pre-advanced games, the `lastError` strings.

### 2. Implementation Instructions
```ts
// src/controller/gameStatechart.ts   (imports: xstate, @model only)
export interface GameStatechartInput { readonly game: Game; readonly skipAnimations?: boolean }
export interface GameStatechartContext {
  readonly game: Game; readonly skipAnimations: boolean
  readonly lastError: string | null
  readonly lastRejection: { readonly position: Position; readonly violation: PlacementViolation } | null
  readonly heldDie: Die | null; readonly report: ScoreReport | null
}
export type GameStatechartEvent =
  | { readonly type: 'CHOOSE_PATTERN'; readonly id: string }
  | { readonly type: 'SELECT_DIE'; readonly die: Die }
  | { readonly type: 'PLACE_DIE'; readonly position: Position }
  | { readonly type: 'CANCEL_SELECTION' } | { readonly type: 'REFRESH_DRAFT' }
  | { readonly type: 'BEAM_ANIMATION_DONE' } | { readonly type: 'PAUSE' } | { readonly type: 'RESUME' }
  | { readonly type: 'DIE_PLACED' } | { readonly type: 'ROUND_COMPLETED' }   // internal (raised)
export const gameStatechart  // = setup({ types, guards, actions }).createMachine({ id: 'game', … })
```

State tree (ids exactly as below):
```
game (initial setup)
├─ setup        always: isGameOver→#game.finalScoring | isHoldingDie→#game.round.place | gameAlreadyInRound→round
│               CHOOSE_PATTERN: [patternOffered→round / choosePattern] | [else / lastError]
├─ round (initial draft)        on PAUSE → #game.paused
│  ├─ draft       always noLegalMoves→forfeit;  REFRESH_DRAFT[refreshAvailable]→draft (reenter) ; SELECT_DIE …
│  ├─ place       always noLegalMoves→forfeit;  PLACE_DIE / SELECT_DIE / CANCEL_SELECTION / REFRESH_DRAFT /
│  │              DIE_PLACED→draft / ROUND_COMPLETED→illuminate   (exactly as reference)
│  ├─ forfeit     entry forfeitRound;  always → illuminate
│  ├─ illuminate  always skipAnimations→announceNext;  BEAM_ANIMATION_DONE→announceNext
│  ├─ announceNext always isGameOver→#game.finalScoring | →draft
│  └─ hist        { type: 'history', history: 'deep' }
├─ paused       on RESUME → #game.round.hist      (no other event handled)
├─ finalScoring entry storeReport; always → gameOver
└─ gameOver     type: 'final'
```

Rules:
- Guards (`patternOffered`, `selectLegal`, `placementLegal`, `isGameOver`, `isHoldingDie`, `refreshAvailable`, `skipAnimations`, `gameAlreadyInRound`, `noLegalMoves`) and helpers `rejectionAt` / `rejectionText` are copied from the reference; `findPlacementViolation`/`isInsideGrid` calls are replaced by the `PlacementValidator` and grid-bounds query exported from `@model` (prompts 21, 27) — **never re-implement a law**.
- PAUSE during `illuminate` is allowed; the beam animation is paused by `BeamAnimationController` (prompt 53), and RESUME restores `round.illuminate` via history.
- Export `statePath(snapshot): string` (moved from `src/hooks/useGame.ts`): returns `'setup' | 'paused' | 'finalScoring' | 'gameOver'` or `'round.<child>'`.
- Strangler shim — `src/machine/gameMachine.ts` becomes:
```ts
/** @deprecated Moved to `@controller/gameStatechart`; removed in prompt 59. */
export { gameStatechart as gameMachine } from '@controller/gameStatechart'
export type { GameStatechartInput as GameMachineInput, GameStatechartContext as GameMachineContext,
  GameStatechartEvent as GameMachineEvent } from '@controller/gameStatechart'
```
  and `useGame.ts` re-exports `statePath` from the controller. `src/controller/index.ts` exports the statechart.
- TSDoc on every exported type, guard and action (one line each, citing FR/NFR); document the deep-history choice at `hist`.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm vitest run tests/machine/gameMachine.test.ts tests/hooks/runSession.test.ts   # 15 + 10 blocks green, unmodified
pnpm vitest run -t "golden"           # engine and machine golden runs: 5,5,31,16,2,7,53,37 / 156
pnpm e2e                               # 23 existing e2e tests, 100 %
pnpm check:classes                     # ≥ 31
git commit -am "feat(controller): inc 49 game statechart" && git tag inc-49-green
```
- [ ] Manual check in a scratch test: in `round.place`, `PAUSE` → `paused`; `can({type:'PLACE_DIE',…})`, `can({type:'SELECT_DIE',…})`, `can({type:'REFRESH_DRAFT'})` are all `false`; `RESUME` → `round.place` with the same `heldDie`
- [ ] `grep -n "engine/" src/controller/gameStatechart.ts` → 0 lines
- [ ] Tracking: typecheck 0, lint 0/0, unit 100 %, golden exact, e2e 100 %, classes ≥ 31

### 4. CRITICAL Checkpoint
- **Risk:** complexity spike in the phase controller; history and eventless transitions interact. **Failure indicators:** golden run stops early (stuck in `forfeit`/`announceNext`); infinite `always` loop error from XState; RESUME lands in `round.draft` instead of the pre-pause child; `beam-resume.spec.ts` fails (setup boot path broken).
- **Isolation testing protocol:**
  1. Simplified config: `skipAnimations: true`, no pause — run the 15 reference blocks.
  2. Components separately: test `forfeit` with seed 7 / pattern Clerestory deadlock (AT-07 setup); test pause/resume from each of `draft`, `place`, `illuminate` with `skipAnimations: false`.
  3. Interaction effects: pause in `illuminate`, RESUME, then `BEAM_ANIMATION_DONE` must advance the round exactly once; then full suite + e2e.
- **Rollback procedure:** `git reset --hard inc-48-green`; re-apply the move first (no new states), verify, then add `forfeit`, then `paused`/`hist`.

---

**CRITICAL: The section 6 statechart (with `forfeit`, `paused` and deep-history resume) now lives in `src/controller`, gates every action through guards that only query the model, accepts no game action while paused, and reproduces the golden master 5,5,31,16,2,7,53,37 / 156.**
