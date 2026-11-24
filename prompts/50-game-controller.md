# Prompt 50: GameController

**CRITICAL: Create `GameController extends AbstractController<Game>` in `src/controller`: it owns the game statechart actor, turns each user gesture into one statechart event only when `snapshot.can(event)` allows it, handles every `GameError` and asks its `View` for non-blocking feedback. `useGame` becomes a thin adapter over it. No React in the controller; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**

---

### INCREMENT 50: GameController
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompts 03, 47, 49
- **Reference implementation:** `src/hooks/useGame.ts` (`send` with `can()` gate, `legalPreview`, `objectiveLines`, rejection mapping) and `src/machine/gameMachine.ts`; tests `tests/machine/gameMachine.test.ts`
- **Context to attach:** `ctxt/MVC_RoseWindow.md` sections 1, 2, 4 (row 25), 5, 6
- **Requirements:** NFR-2.1, NFR-2.2, NFR-2.3, NFR-4.2, NFR-5.1, NFR-5.2, NFR-6.5, FR-17.2, NFR-3.2

### MANDATORY: Sandwich Requirement
- **Start:** The controller is the only object that sends events to the game actor; it imports only `@model`, `@mvc`, `xstate` and `./gameStatechart`.
- **End:** `useGame` returns the same `UseGameResult` shape as before, built on a `GameController`, and all e2e tests still pass.

---

### 1. Capability Specification
- **Adds:** class #25 of section 4. Rule-free presentation queries move out of the React hook: `legalPreview()` (pure validator per cell, NFR-3.2) and `objectiveLines()` (scorer with `beamTotal: 0`).
- **Changes:** `useGame.ts` stops calling `useMachine`; it creates one controller per `Game` and reads snapshots through `useSyncExternalStore`.
- **Unchanged:** event names, recorded-action list for sessions, every view file, all tests.

### 2. Implementation Instructions
```ts
// src/controller/GameController.ts
export type GameAction = Extract<GameStatechartEvent,
  { type: 'CHOOSE_PATTERN' | 'SELECT_DIE' | 'PLACE_DIE' | 'CANCEL_SELECTION' | 'REFRESH_DRAFT' }>
export type GameSnapshot = SnapshotFrom<typeof gameStatechart>
/** Read-only face of the model handed to views: queries and listener registration, no mutators. */
export type GameReadModel = Pick<Game, 'phase' | 'round' | 'window' | 'draftPool' | 'hand' | 'refreshesRemaining'
  | 'placementsRemaining' | 'currentEntry' | 'entrySequence' | 'roundScores' | 'totalScore' | 'report'
  | 'config' | 'offeredPatterns' | 'objectives' | 'legalPlacementsFor' | 'addModelListener' | 'removeModelListener'>

/** What a placement or selection refusal tells the view; `violation` carries the detail (FR-4.11: which demand; FR-4.12: which neighbours). */
export interface GameFeedback extends Feedback { readonly violation?: GameViolation }

/** What a die's color does to the beam, for drawing only (views may not import the table's value from `@model`). */
export function refractionOf(color: DieColor): Refraction

export class GameController extends AbstractController<Game> {
  #actor: Actor<typeof gameStatechart>
  #persisted: Snapshot<unknown> | null = null
  readonly #skipAnimations: boolean
  readonly #listeners = new Set<(snapshot: GameSnapshot) => void>()
  #lastActivePath = 'setup'
  constructor(model: Game, options?: { readonly skipAnimations?: boolean
    /** Called once per player action that took effect (used to record the run, prompt 55). */
    readonly onAction?: (action: GameAction) => void })
  start(): void                    // idempotent; restarts from #persisted after stop()
  stop(): void                     // persists getPersistedSnapshot(), stops the actor
  getSnapshot(): GameSnapshot
  subscribe(listener: (s: GameSnapshot) => void): () => void   // for useSyncExternalStore
  get statePath(): string          // statePath(getSnapshot()); 'paused' while paused
  get viewPath(): string           // statePath, or while paused the path RESUME returns to (what the board behind the menu shows)
  get game(): GameReadModel
  can(event: GameStatechartEvent): boolean
  dispatch(action: GameAction): boolean
  choosePattern(id: string): boolean
  selectDie(die: DieData): boolean
  placeDie(position: Position): boolean
  cancelSelection(): boolean
  recast(): boolean                // sends REFRESH_DRAFT (FR-11)
  pause(): boolean
  resume(): boolean
  beamAnimationDone(): boolean     // BEAM_ANIMATION_DONE
  legalPreview(): ReadonlyMap<string, PlacementViolation | null>   // key "row,col"; empty when no die held
  objectiveLines(): readonly ScoreLine[]
  #send(event: GameStatechartEvent): boolean
}
```
`#send` algorithm (document it in TSDoc):
1. If `!this.#actor.getSnapshot().can(event)` → return `false` (model untouched — NFR-2.3, NFR-6.5).
2. `actor.send(event)`. **XState v5 does not rethrow an exception thrown inside an action** (checked on the installed 5.32.6): `send` returns normally, the actor stops with `snapshot.status === 'error'` and the exception is in `snapshot.error`; with no `error` observer it is also reported as an unhandled exception. So a `try/catch` around `send` never fires. Subscribe every actor with `{ next, error }` (the `error` observer does nothing else), and after the send, if `status === 'error'`: rebuild the actor from the model (`createActor(gameStatechart, { input })`; its `setup` boot transitions put it back in step with the model), start it, notify listeners, then if `snapshot.error instanceof GameError` → `view?.showFeedback({ kind: error.violation.kind, message: error.message, violation: error.violation })` and return `false`; otherwise rethrow `snapshot.error`, so non-`GameError` exceptions propagate.
3. Otherwise, if `context.lastRejection !== null` → `view?.showFeedback({ kind: violation.kind, message: lastError, position, violation })`, return `false`; else if `context.lastError !== null` → feedback `{ kind: 'rejected', message: lastError }`, return `false`; otherwise call `onAction` when the event is a `GameAction`, and return `true`.
- **Snapshot listeners are notified on every actor snapshot change** (from the actor subscription), including refused actions: `useGame` still shows the rejection toast from `snapshot.context.lastRejection` until prompt 58, and without a notification React would never re-render it.
- `#lastActivePath` is updated on every snapshot whose path is not `paused`; `viewPath` returns it while paused.
- The actor is created in the constructor with input `{ game: model, skipAnimations }` and started. React 19 StrictMode runs effect cleanups twice, and a stopped XState v5 actor cannot restart, so `start()` after `stop()` recreates it with `createActor(gameStatechart, { input, snapshot: this.#persisted })`.
- `legalPreview` / `objectiveLines` copy the loops in `useGame.ts` exactly, calling `PlacementValidator` and `ScoreCalculator` from `@model`.
- TSDoc on all members; `@throws` on `dispatch` and the gesture methods: "rethrows any non-`GameError` exception".

**`useGame` adapter** (`src/hooks/useGame.ts`, legacy until 58): `const [controller] = useState(() => new GameController(game))` keyed by `game`; `useEffect(() => { controller.start(); return () => controller.stop() }, [controller])`; `snapshot = useSyncExternalStore(subscribe, getSnapshot)` with both wrapped in `useCallback` around `controller.subscribe(l)` / `controller.getSnapshot()` (never pass unbound methods); `send = (e) => e.type === 'BEAM_ANIMATION_DONE' ? controller.beamAnimationDone() : controller.dispatch(e)` (`onBeamDone` sends that event through the same function and it is not a `GameAction`), keeping the session-recording block; `legalPreview = controller.legalPreview()`; `objectiveLines = controller.objectiveLines()`. Everything else (animations, sfx) stays in the hook for now.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test       # all prior tests unchanged and green
pnpm vitest run -t "golden"                    # 5,5,31,16,2,7,53,37 / 156
pnpm e2e                                       # 23/23
pnpm check:classes                             # ≥ 32
git commit -am "feat(controller): inc 50 GameController" && git tag inc-50-green
```
- [ ] `grep -n "useMachine" src/hooks/useGame.ts` → 0; `grep -rn "react" src/controller` → 0
- [ ] Scratch run: `new GameController(new Game(config(3)), { skipAnimations: true })` driven by the auto-player's `bestPair` choices ends in `gameOver` with `totalScore === 156`
- [ ] Tracking: typecheck 0, lint 0/0, unit 100 %, golden exact, e2e ≥ 100 %, classes ≥ 32

### 4. CRITICAL Checkpoint
- **Risk:** integration of statechart, model and React lifecycle. **Failure indicators:** a `GameError` from the model reported as "unhandled" in Vitest, or the game dead after it (the actor is in status `error`); "actor stopped" warnings in the dev console; double placement per tap (StrictMode); `tutorial.spec.ts` or `beam-resume.spec.ts` timing out in `round.illuminate`; feedback toast missing on rejection.
- **Isolation testing protocol:**
  1. Simplified config: controller alone in Vitest with `skipAnimations: true` and a recording stub `View`.
  2. Components separately: `start/stop/start` cycle keeps `statePath` and `heldDie`; `legalPreview()` equals the old hook's map for seed 3 after choosing novice-rose and selecting the first die.
  3. Interaction effects: plug into `useGame`, run `pnpm dev`, take Playwright MCP screenshots of mockups 02, 03, 04 states and compare; then `pnpm e2e`.
- **Rollback procedure:** `git reset --hard inc-49-green`; land the class first with the hook untouched, then switch the hook.

---

**CRITICAL: `GameController` is now the single gateway from gestures to the game statechart: `can()`-gated, `GameError`-safe (by reading the actor's error status, not by catching), feedback through `View`, no React. Golden master 5,5,31,16,2,7,53,37 / 156 and all e2e tests unchanged.**
