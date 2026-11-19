# Prompt 47: Game (the model facade)

**CRITICAL: Move `Game` into `src/model/Game.ts` as `class Game extends AbstractModel<GameEvent>`: same round loop, phases, public API and seeded construction order as `src/engine/game.ts`, but every event is now an event-class instance published ONLY through `this.notifyChanged(...)`. The model must not import React, DOM, `window`, `localStorage` or XState. Golden master: seed 3, novice-rose, max-flex auto-player → 5,5,31,16,2,7,53,37, beam total 156, report 186 gold.**

---

### INCREMENT 47: Game extends AbstractModel<GameEvent>
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompts 03, 05–45 (all model classes)
- **Reference implementation:** `src/engine/game.ts` and `tests/engine/game.test.ts`; callers `src/hooks/useGame.ts`, `src/hooks/runSession.ts`, `src/dev/autoPlayer.ts`, `src/progression/challenges.ts`
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §1–§5, `ctxt/MVC_JohnHunt.md`, `ctxt/RoseWindowReqPrompt.txt`
- **Requirements:** FR-1.3, FR-1.4, FR-3.1–3.6, FR-4.1, FR-4.10, FR-4.14, FR-4.15, FR-5.1, FR-5.11, FR-6.1–6.4, FR-6.6, FR-8.1, FR-11.1–11.6, NFR-1.1, NFR-2.1–2.3

### MANDATORY: Sandwich Requirement
- **Start:** `Game` sequences model services and publishes events; it evaluates no rule itself. `#emit` is deleted; `notifyChanged` is the only publication path.
- **End:** `src/engine/game.ts` is `export { Game } from '../model/Game'; export type { GamePhase } from '../model/Game'`; all suites green; class count **31**.

### 1. Capability Specification
- **Changes:** plain event objects → `new DiePlacedEvent(this, …)` etc.; `choosePattern` with an unknown id throws `GameError({ kind: 'unknownPattern', id })` (message `unknown pattern id: "<id>"`, so `/unknown pattern/i` still matches); `entrySequence` is `readonly EntryPoint[]` from `EntryPoint.allFor`.
- **Legacy adapter:** keep `subscribe(fn: (e: GameEvent) => void): () => void`, implemented as `return this.addModelListener({ modelChanged: fn })` and marked `@deprecated` (removed in prompt 59).
- **Unchanged:** RNG consumption order, event order, phase rules, all getters.

### 2. Implementation Instructions
```typescript
// src/model/Game.ts
export type GamePhase = 'patternSelection' | 'draft' | 'place' | 'gameOver'

export class Game extends AbstractModel<GameEvent> {
  readonly config: GameConfig
  readonly offeredPatterns: readonly [WindowPattern, WindowPattern]
  readonly objectives: DealtObjectives
  readonly entrySequence: readonly EntryPoint[]
  constructor(config: GameConfig)
  get phase(): GamePhase; get round(): number; get window(): GlassWindow | null
  get draftPool(): DraftPool; get hand(): Die | null; get refreshesRemaining(): number
  get placementsRemaining(): number; get currentEntry(): EntryPoint
  get roundScores(): readonly number[]; get totalScore(): number; get report(): ScoreReport | null
  /** @throws GameError invalidPhase | unknownPattern */
  choosePattern(id: string): void
  /** @throws GameError invalidPhase | dieNotInPool */
  selectDie(die: Die): void
  /** @throws GameError invalidPhase */
  cancelSelection(): void
  /** @throws GameError invalidPhase | refreshSpent */
  refreshDraft(): void
  /** @throws PlacementError (six laws) | GameError invalidPhase | outOfBounds */
  placeDie(position: Position): void
  /** @throws GameError invalidPhase | legalMovesRemain */
  forfeitRound(): void
  legalPlacementsFor(die: Die): readonly Position[]
  hasLegalMove(): boolean
}
```
Use the model class names exactly as prompts 07–27 created them (`DiceBag`, `DraftPool`, `GlassWindow`, `PlacementValidator`, `offerPatterns`, `dealObjectives`, `BeamTracer`, `ScoreCalculator`).

**Construction order (MANDATORY — changes it and every seed changes):** `rng = new SeededRandom(config.seed).next` → `new BeamTracer(config.multiplierCap)` → `new ScoreCalculator(config.tiers)` → `new DiceBag(config, rng)` → `offerPatterns(rng)` → `dealObjectives(rng)` → `SeededRandom.sample(EntryPoint.allFor(config.gridSize), config.rounds, rng)`.

**Event order (golden stream, 41 events):** `choosePattern` → `draftPoolRefreshed`; each legal `placeDie` → `diePlaced`; second placement → unplaced dice back to bag → `beamTraced` → `roundScored` → next round's `draftPoolRefreshed`, or after round 8 → `gameOver` (report = calculator over `window.dice` + `totalScore`). Rejected `placeDie` publishes `placementRejected` **then** rethrows; window, hand and pool unchanged (NFR-2.1). Publish it only when `error instanceof PlacementError` (the reference tests `'violation' in error`, which would now also catch `outOfBounds`, a caller defect that is not a placement law). `forfeitRound` → `roundForfeited` → `beamTraced` → `roundScored` → …. `refreshDraft` → `draftPoolRefreshed`.

All mutable state stays in `#private` fields (never enumerable). TSDoc on every member with `@throws`. Callers needing a string direction read `currentEntry.direction.name` (one-token edits in `src/view`, listed in the commit body).

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/game.test.ts tests/hooks tests/machine tests/progression
pnpm e2e   # views still consume Game through the shim
grep -rnE "from ['\"](react|react-dom|xstate)|window\.|localStorage|document\." src/model   # must print nothing
git commit -am "feat(model): inc 47 Game extends AbstractModel" && git tag inc-47-green
```
- [ ] `grep -n "#emit\|listener(" src/model/Game.ts` prints nothing; every publication is `this.notifyChanged(new …Event(this, …))`
- [ ] Golden master 5,5,31,16,2,7,53,37 / 156; report 186 gold; 41 events
- [ ] `check:classes` ≥ 31; typecheck 0; lint 0/0; unit 100 %; `pnpm e2e` no new failure vs `inc-46-green` (e2e thresholds apply from prompt 58)

### 4. CRITICAL Checkpoint
- **Risk:** this is the hub of the model; a changed RNG call order, a missing event, or a listener registered twice shifts every seeded game, breaks `useGame` animations, or breaks restore (`runSession` replays actions through `Game`).
- **Failure indicators:** golden round scores differ (RNG order); event count ≠ 41 or `gameOver` not last; `replays bit-identically` fails (enumerable `source`, see prompt 45); `/unknown pattern/` test fails; any `src/model` → React/XState import in the UML report.
- **Isolation testing protocol:**
  1. Simplified config: `new Game(createGameConfig(3, { rounds: 1 }))` — choose novice-rose, place two dice, expect exactly `draftPoolRefreshed, diePlaced, diePlaced, beamTraced, roundScored, gameOver`.
  2. Components separately: compare `offeredPatterns`, `objectives` ids and `entrySequence` (via `toData()`) of the new and the git-stashed old Game for seeds 1–20.
  3. Event connector alone: a `ModelListener` and a legacy `subscribe` callback both receive the same 41 instances in the same order.
  4. Interaction effects: run hooks/machine/progression suites, then `pnpm e2e`.
- **Rollback procedure:** `git reset --hard inc-46-green`; first commit `Game extends AbstractModel` with `#emit` delegating to `notifyChanged` and plain objects cast; go green; then switch to event classes in a second commit.

---

**CRITICAL: Game extends AbstractModel<GameEvent>, publishes only via notifyChanged, imports no React/DOM/XState, and reproduces seed 3 / novice-rose: 5,5,31,16,2,7,53,37, beam total 156, report 186 gold.**
