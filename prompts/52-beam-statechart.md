# Prompt 52: Beam Statechart

**CRITICAL: Move the beam statechart into `src/controller/beamStatechart.ts` and complete it per `MVC_RoseWindow.md` section 6: `traveling → refracting / lockedStraight (dwell states) → … → terminated`, plus immediate completion when reduced motion is requested (`SKIP` event or `reducedMotion` input). It replays a finished `BeamPath`; it never re-decides the beam law. Golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**

---

### INCREMENT 52: Beam statechart
- **Status:** Standard
- **Dependencies:** Prompts 31, 33, 35, 49
- **Reference implementation:** `src/machine/beamMachine.ts` (logic) and `tests/machine/beamMachine.test.ts` (4 blocks)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` sections 5, 6; `AGENTS.md` (beam rules: lockout `V−1`, cap 5)
- **Requirements:** FR-5.10, NFR-5.6, NFR-3.4, FR-5.6, FR-5.7

### MANDATORY: Sandwich Requirement
- **Start:** Keep the reference context (`path`, `multiplierCap`, `index`, `multiplier`, `lockout`), guards (`pathExhausted`, `nextBends`, `nextLocked`) and actions (`advanceStraight`, `applyBend`, `applyLocked`) with identical semantics.
- **End:** after `SKIP` (or with `reducedMotion: true`) the final context equals the context reached by stepping with `ADVANCE` to `terminated`, for every reference path.

---

### 1. Capability Specification
- **Adds:** `SKIP` event (valid in `traveling`, `refracting`, `lockedStraight`) → `terminated` with action `completeAll`; input flag `reducedMotion` → eventless transition from `traveling` to `terminated` with `completeAll`.
- **Changes:** imports of `DEFAULT_MULTIPLIER_CAP` and `REFRACTION_BY_COLOR` come from `@model` (`GameConfig.ts`, prompt 07, and `Refraction.ts`, prompt 35); never redefine them.
- Typing the input as the model's `BeamPath` would fail `pnpm typecheck` in `tests/machine/beamMachine.test.ts` (a plain path has no `length`, `bendCount` …), and that file must stay unchanged.
- **Unchanged:** one `ADVANCE` per beam step; `refracting` and `lockedStraight` are dwell states left by the next `ADVANCE` without consuming a segment; running out of segments in `traveling` terminates.

### 2. Implementation Instructions
```ts
// src/controller/beamStatechart.ts   (imports: xstate, @model only)
/** The only part of a path this machine reads. Model `BeamPath` satisfies it, and so does the legacy plain path the old test and `BeamLayer` still pass. */
export interface PlayablePath { readonly segments: readonly { readonly die: DieData | null }[] }
export interface BeamStatechartInput {
  readonly path: PlayablePath
  readonly multiplierCap?: number
  /** True when the viewer prefers reduced motion (NFR-5.6): finish at once. */
  readonly reducedMotion?: boolean
}
export interface BeamStatechartContext {
  readonly path: PlayablePath; readonly multiplierCap: number; readonly reducedMotion: boolean
  /** Index of the NEXT segment to consume. */ readonly index: number
  readonly multiplier: number; readonly lockout: number
}
export type BeamStatechartEvent = { readonly type: 'ADVANCE' } | { readonly type: 'SKIP' }
export type BeamStepKind = 'bend' | 'locked' | 'straight' | 'exhausted'

/** Pure step function shared by the guards, the actions and `completeAll`. */
export function classifyStep(context: BeamStatechartContext): BeamStepKind
export function applyStep(context: BeamStatechartContext): BeamStatechartContext
export const beamStatechart   // setup({ types, guards, actions }).createMachine({ id: 'beam', … })
```
Step semantics (copy from the reference, do not change):
- `bend`: segment has a die, `lockout === 0`, and the die's colour does not go straight → `index+1`, `multiplier = min(multiplier+1, cap)`, `lockout = die.value − 1`.
- `locked`: segment has a die and `lockout > 0` → `index+1`, `lockout = max(0, lockout−1)`.
- `straight`: empty cell or straight colour → `index+1`, `lockout = max(0, lockout−1)`.
- `exhausted`: `index >= path.segments.length`.
- `completeAll`: apply `applyStep` until `exhausted` (bounded by `path.segments.length`, so it terminates — NFR-1.4).

States: `traveling` (`always: [{ guard: 'reducedMotion', target: 'terminated', actions: 'completeAll' }]`, `ADVANCE: [pathExhausted→terminated | nextBends→refracting/applyBend | nextLocked→lockedStraight/applyLocked | advanceStraight]`, `SKIP → terminated/completeAll`), `refracting` and `lockedStraight` (`ADVANCE → traveling`, `SKIP → terminated/completeAll`), `terminated` (`type: 'final'`).

Strangler shim: `src/machine/beamMachine.ts` becomes `export { beamStatechart as beamMachine } from '@controller/beamStatechart'` plus type aliases `BeamMachineInput`, `BeamMachineContext`, `BeamMachineEvent`, with `@deprecated` TSDoc. `src/view/BeamLayer.tsx` keeps importing the shim until prompt 58. Export from `src/controller/index.ts`.

TSDoc on every export; at `applyStep` document the ambiguity resolutions the reference documents (score-before-bend, lockout `V−1`, cap) per NFR-4.6, referring to `BeamTracer` as the authority.

### 3. Verification Protocol
```bash
pnpm vitest run tests/machine/beamMachine.test.ts      # 4/4, file unchanged
pnpm typecheck && pnpm lint && pnpm test && pnpm e2e    # e2e 23/23 (BeamLayer unchanged)
pnpm vitest run -t "golden"                             # 156
git commit -am "feat(controller): inc 52 beam statechart" && git tag inc-52-green
```
- [ ] Scratch check: for the reference "golden cycle" path (`['R1 R1','B1 R1']`, entry `(1,0)` east) `SKIP` gives `multiplier 5`, `index === segments.length`, status `done`
- [ ] With `reducedMotion: true` the actor is `done` immediately after `start()`
- [ ] `grep -n "engine/" src/controller/beamStatechart.ts` → 0
- [ ] Tracking: typecheck 0, lint 0/0, unit 100 %, golden exact, e2e 100 %, classes ≥ 32

---

**CRITICAL: The beam statechart lives in `src/controller`, paces one `ADVANCE` per step with `refracting`/`lockedStraight` dwell states, completes immediately under reduced motion with the same final context, and never changes the beam law. Golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
