# Prompt 45: The Seven Model Event Classes

**CRITICAL: Turn the `GameEvent` discriminated union into seven immutable classes extending `ModelEvent` (prompt 03) — `DiePlacedEvent`, `PlacementRejectedEvent`, `DraftPoolRefreshedEvent`, `BeamTracedEvent`, `RoundScoredEvent`, `RoundForfeitedEvent`, `GameOverEvent` — keeping the exact `kind` strings and payload field names of `src/engine/events.ts`, so that when `Game` publishes them (prompt 47) every existing listener, the view, and the golden-master event stream (41 events) keep working.**

---

### INCREMENT 45: Model event classes
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompts 03 (ModelEvent, AbstractModel), 05, 11, 33, 41
- **Reference implementation:** `src/engine/events.ts` (union + `GameListener`); consumers `src/hooks/useGame.ts`, `src/dev/autoPlayer.ts`; tests `tests/engine/game.test.ts` (event-kind sequence, replay)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §2, §3 (event catalogue), §5
- **Requirements:** FR-4.10, FR-4.11, FR-5.10, FR-5.11, FR-6.5, FR-8.2, NFR-2.2

### MANDATORY: Sandwich Requirement
- **Start:** Same seven `kind` literals, same payload names: `position`, `die`, `violation`, `dice`, `path`, `round`, `delta`, `report`.
- **End:** All tests green, `src/engine/events.ts` untouched (prompt 47 switches it), `check:classes` reports **31**.

### 1. Capability Specification
- **Adds:** `src/model/events.ts` with the seven classes and `export type GameEvent = DiePlacedEvent | … | GameOverEvent`.
- **Changes:** none to existing files. `src/engine/events.ts` keeps its plain union for now: `Game` still emits plain objects until prompt 47, and a plain object has no `source` or `toData`, so re-exporting the class union here would fail `pnpm typecheck` in `src/engine/game.ts`.
- **Unchanged:** narrowing by `event.kind` in every consumer (the `kind` field is a literal type on each class).

### 2. Implementation Instructions
```typescript
// src/model/events.ts — imports src/mvc and model types only
/** A die was committed to a cell (FR-4.1). View: placement slam. */
export class DiePlacedEvent extends ModelEvent {
  readonly kind = 'diePlaced' as const
  constructor(source: AbstractModel<GameEvent>, readonly position: Position, readonly die: Die)
  toData(): { kind: 'diePlaced'; position: Position; die: Die }
}
/** A placement broke a law (FR-4.10/4.11); violation carries kind + offending neighbours. */
export class PlacementRejectedEvent extends ModelEvent {
  readonly kind = 'placementRejected' as const
  constructor(source: AbstractModel<GameEvent>, readonly position: Position, readonly violation: PlacementViolation)
}
/** A fresh or recast draft is visible. Payload: frozen copy of `dice`. */
export class DraftPoolRefreshedEvent extends ModelEvent { readonly kind = 'draftPoolRefreshed' as const /* dice */ }
/** The round's beam was traced (FR-5.10). Payload: `path: BeamPath`. */
export class BeamTracedEvent extends ModelEvent { readonly kind = 'beamTraced' as const /* path */ }
/** Beam points added to the running total (FR-5.11). Payload: `round`, `delta`. */
export class RoundScoredEvent extends ModelEvent { readonly kind = 'roundScored' as const /* round, delta */ }
/** A deadlocked round was forfeited (FR-6.2, FR-6.5). Payload: `round`. */
export class RoundForfeitedEvent extends ModelEvent { readonly kind = 'roundForfeited' as const /* round */ }
/** Final report after round 8 (FR-8.1). Payload: `report: ScoreReport`. */
export class GameOverEvent extends ModelEvent { readonly kind = 'gameOver' as const /* report */ }

export type GameEvent = DiePlacedEvent | PlacementRejectedEvent | DraftPoolRefreshedEvent
  | BeamTracedEvent | RoundScoredEvent | RoundForfeitedEvent | GameOverEvent
```

**Rules:**
1. Each constructor calls `super(source)` (prompt 03: `protected constructor(source: AbstractModel<ModelEvent>)`), copies arrays/positions, then `Object.freeze(this)`.
2. `source` must not take part in structural equality: if `ModelEvent` stores it as an enumerable field, change `src/mvc/ModelEvent.ts` to `Object.defineProperty(this, 'source', { value: source, enumerable: false })`. Otherwise `toEqual` on two event streams deep-compares two `Game` instances and their listener arrays.
3. Every class has `toData()` returning the legacy plain union member (`kind` + payload, no `source`); `BeamTracedEvent.toData()` uses `path.toData()`.
4. No exceptions; TSDoc on each class, field, constructor and method, including the view reaction from MVC §3.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/game.test.ts
git commit -am "feat(model): inc 45 model event classes" && git tag inc-45-green
```
- [ ] 7 classes, each `instanceof ModelEvent`, each `kind` literal matches the old union
- [ ] `Object.keys(new RoundScoredEvent(stub, 1, 5)).sort()` (a stub `AbstractModel` subclass; `Game` is not one until prompt 47) is `['delta', 'kind', 'round']` (no `source`)
- [ ] `src/model/events.ts` has no React/DOM/XState import
- [ ] Golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 31; lint 0/0

### 4. CRITICAL Checkpoint
- **Risk:** a renamed `kind` or payload field silently breaks the view's animations and `useGame` reducers (they switch on `kind`), and an enumerable `source` breaks the replay equality test once Game emits classes (prompt 47).
- **Failure indicators:** any typecheck error in an existing file (nothing existing should change); `Object.keys` shows `source`; `toEqual` between two identical runs fails; event count ≠ 41 in the golden stream.
- **Isolation testing protocol:**
  1. Simplified config: construct each class with a stub `AbstractModel` subclass and literal payloads; compare `toData()` to the old union literal.
  2. Components separately: in a scratch file, assign each `toData()` result to the legacy `GameEvent` type of `src/engine/events.ts` and run `pnpm typecheck`.
  3. Interaction effects: run `tests/engine/game.test.ts` and `tests/hooks`, `tests/machine` suites.
- **Rollback procedure:** `git reset --hard inc-44-green`; reintroduce the classes one at a time, without touching `src/engine/events.ts`.

---

**CRITICAL: Seven ModelEvent subclasses with the original kinds and payload names, `source` excluded from equality; golden master 5,5,31,16,2,7,53,37 / 156.**
