# Prompt 53: BeamAnimationController

**CRITICAL: Create `BeamAnimationController extends AbstractController<Game>` in `src/controller`: it listens for `BeamTracedEvent`, owns one beam statechart actor per path, paces playback (400 ms per step, 450 ms tail), supports pause/resume and reduced motion, and reports completion so `GameController.beamAnimationDone()` can release the `illuminate` gate. The view only draws what it is told. Golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**

---

### INCREMENT 53: BeamAnimationController
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompts 45, 47, 50, 52
- **Reference implementation:** `src/view/BeamLayer.tsx` (the `useEffect` that creates the actor, `setInterval(STEP_MS = 400)`, `TAIL_MS = 450`, `onStrike` with `scoringMultiplier = round(points / die.value)` and `bent`), `src/hooks/useGame.ts` (`onBeamStrike`, `onBeamDone`, `beamRun`), `src/machine/beamMachine.ts`; tests `tests/machine/beamMachine.test.ts`, `tests/e2e/beam-resume.spec.ts`
- **Context to attach:** `ctxt/MVC_RoseWindow.md` sections 3, 4 (row 26), 6; `ctxt/GUI_mockupsRoseWindow.md` §4 (Beam moment)
- **Requirements:** FR-5.10, NFR-5.6, NFR-3.1, NFR-3.4, FR-17.1, NFR-4.2

### MANDATORY: Sandwich Requirement
- **Start:** Presentation arithmetic (`scoringMultiplier`, `bent`, running `points/strikes`) moves out of the view into this controller; the beam path itself still comes only from `BeamTracer` via the event.
- **End:** `BeamLayer` renders from controller callbacks, `beam-resume.spec.ts` passes, and no timer runs when no beam is playing (NFR-3.4).

---

### 1. Capability Specification
- **Adds:** class #26 of section 4 and its scheduler seam.
- **Changes:** `BeamLayer.tsx` no longer creates an actor or a timer; `useGame` creates one `BeamAnimationController` per game and wires `onFinished` to `controller.beamAnimationDone()`.
- **Unchanged:** beam visuals (mockup `05-beam.png`), test ids `beam-layer`, `beam-core`, `data-settled`, step timing, sounds.

### 2. Implementation Instructions
```ts
// src/controller/BeamAnimationController.ts
export interface Scheduler {
  setInterval(fn: () => void, ms: number): unknown; clearInterval(handle: unknown): void
  setTimeout(fn: () => void, ms: number): unknown;  clearTimeout(handle: unknown): void
}
export interface BeamStep {
  readonly segment: BeamSegment; readonly index: number
  readonly multiplier: number    // scoring multiplier of this strike, 1 for empty cells
  readonly bent: boolean         // next segment changes direction
  readonly state: 'traveling' | 'refracting' | 'lockedStraight'
}
export interface BeamPlaybackListener {
  onStart(path: BeamPath): void
  onStep(step: BeamStep, run: { readonly points: number; readonly multiplier: number; readonly strikes: number }): void
  onSettled(): void              // path fully drawn (sets data-settled)
}
export class BeamAnimationController extends AbstractController<Game> {
  static readonly STEP_MS = 400
  static readonly TAIL_MS = 450
  #actor: Actor<typeof beamStatechart> | null = null
  #interval: unknown = null; #tail: unknown = null; #paused = false
  readonly #scheduler: Scheduler; readonly #reducedMotion: boolean
  readonly #onFinished: () => void
  readonly #playback = new Set<BeamPlaybackListener>()
  constructor(model: Game, onFinished: () => void,
              options?: { readonly scheduler?: Scheduler; readonly reducedMotion?: boolean })
  attach(): () => void           // addModelListener for 'beamTraced'; returns detach
  addPlaybackListener(l: BeamPlaybackListener): () => void
  play(path: BeamPath): void     // stops any running playback first
  advance(): BeamStep | null     // one ADVANCE; null when terminated (used by the timer and tests)
  pause(): void; resume(): void  // stop / restart the interval; no step is lost or repeated
  dispose(): void                // clear timers, stop actor, detach
  get stateValue(): string | null
  get isPlaying(): boolean
}
```
Rules:
- On `BeamTracedEvent` → `play(event.path)`. Multiplier cap comes from `model.config` (never a literal).
- `play`: create the actor with `{ path, multiplierCap, reducedMotion }`; notify `onStart`. If `reducedMotion` (NFR-5.6): emit every step synchronously with no interval, then `onSettled()` and `onFinished()` without the tail delay. Otherwise start `setInterval(advance, STEP_MS)`; when the actor is `done` clear it, `onSettled()`, then `setTimeout(onFinished, TAIL_MS)`.
- `advance` mirrors `BeamLayer`: read `index` before `ADVANCE`; if it increased and the segment holds a die, compute `multiplier = die.value > 0 ? Math.round(points / die.value) : 1` and `bent` from the next segment's direction, accumulate `run`, call `onStep`; call `sfx` **not** here (controller has no audio — the view plays sounds in its `onStep`).
- `pause`/`resume` are called by `GameController.pause()/resume()` wiring in `useGame` (FR-17.1): pausing clears the interval and any tail timeout; resuming restarts them from the current actor state.
- Default scheduler = `globalThis` timers (allowed: no DOM). TSDoc everywhere, including the reduced-motion decision and the timing constants' origin.
- `BeamLayer.tsx` keeps its props shape for the parent but receives steps through a `BeamPlaybackListener` registered in an effect; `useGame` exposes `beamRun` and `litCells` from the same listener.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm e2e                                   # 23/23, incl. beam-resume.spec.ts (3) and phase8/9
pnpm vitest run -t "golden"                # 156
pnpm check:classes                         # ≥ 33
grep -n "createActor\|setInterval" src/view/BeamLayer.tsx   # 0 lines
git commit -am "feat(controller): inc 53 BeamAnimationController" && git tag inc-53-green
```
- [ ] Playwright MCP screenshot mid-beam matches `mockups/05-beam.png` layout (floats "+N ×M", dimmed tray)
- [ ] With `page.emulateMedia({ reducedMotion: 'reduce' })` the beam settles within one frame
- [ ] Tracking: typecheck 0, lint 0/0, unit 100 %, golden exact, e2e 100 %, classes ≥ 33

### 4. CRITICAL Checkpoint
- **Risk:** timing integration across model events, two statecharts and React. **Failure indicators:** game stuck in `round.illuminate` (onFinished never called); beam steps doubled under StrictMode; `data-settled` never `true`; score total HUD differs from `game.totalScore`.
- **Isolation testing protocol:**
  1. Simplified config: Vitest with a manual fake `Scheduler`, one hand-built path, no React.
  2. Components separately: reduced motion only; then pause in mid-path and resume; then two consecutive `beamTraced` events (second `play` cancels the first).
  3. Interaction effects: wire into `useGame` and `BeamLayer`, run `pnpm e2e tests/e2e/beam-resume.spec.ts`, then all e2e.
- **Rollback procedure:** `git reset --hard inc-52-green`; land the controller with tests first, switch `BeamLayer` second.

---

**CRITICAL: `BeamAnimationController` alone paces beam playback from `BeamTracedEvent` (400 ms steps, 450 ms tail, pause/resume, instant under reduced motion) and releases the illuminate gate; views only draw. Golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
