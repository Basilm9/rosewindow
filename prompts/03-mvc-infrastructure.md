# Prompt 03: MVC Infrastructure

**CRITICAL: Implement the push-MVC base types in `src/mvc` — `ModelListener`, `ModelEvent`, `AbstractModel`, `AbstractController`, `View` — plus the `useModelEvents` React hook, mirroring John Hunt's calculator MVC. `notifyChanged` must deliver each event to every listener in registration order, and nothing in `src/mvc` may import the model, controller, view or XState. Golden master stays 5,5,31,16,2,7,53,37 / 156.**

---

### INCREMENT 03: MVC base classes and listener hook
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompts 01, 02
- **Reference implementation:** `src/engine/game.ts` (`subscribe` / `#emit` over a `Set<GameListener>`), `src/engine/events.ts` (`GameEvent` with `kind`), `src/hooks/useGame.ts` (the `game.subscribe` effect)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` sections 1, 2, 5; `ctxt/MVC_JohnHunt.md`
- **Requirements:** NFR-4.1, NFR-4.2, NFR-4.3

### MANDATORY: Sandwich Requirement
- **Start:** `src/mvc` depends on nothing but itself (React only inside `src/mvc/react/`).
- **End:** a subclass calls one protected method, `notifyChanged(event)`, and every registered listener receives that exact event object, in registration order.

---

### 1. Capability Specification
- **Adds:** six files in `src/mvc/` and `src/mvc/react/useModelEvents.ts`; exports from `src/mvc/index.ts` (the hook is **not** re-exported from the barrel, so the model can import `@mvc` without pulling React).
- **Unchanged:** `Game` keeps its own `subscribe`; it is re-based on `AbstractModel` in prompt 47. Class count stays ≥ 15 (abstract classes are not counted).

### 2. Implementation Instructions
```ts
// src/mvc/ModelListener.ts
/** Receives semantic events pushed by a model (Hunt: the view side of the event connector). */
export interface ModelListener<E extends ModelEvent> {
  /** Called once per published event, synchronously, in registration order. */
  modelChanged(event: E): void
}

// src/mvc/ModelEvent.ts
/** Base of every semantic model event (section 3 catalogue). */
export abstract class ModelEvent {
  /** Discriminator, e.g. 'diePlaced'; subclasses narrow it to a literal. */
  abstract readonly kind: string
  /** The model that published the event. Non-enumerable (set with Object.defineProperty
   *  in the constructor) so `toEqual` on two event streams never deep-compares models. */
  readonly source!: AbstractModel<ModelEvent>
  protected constructor(source: AbstractModel<ModelEvent>)
}

// src/mvc/AbstractModel.ts
export abstract class AbstractModel<E extends ModelEvent> {
  /** Registered listeners; a Set gives registration order and ignores duplicates. */
  readonly #listeners: Set<ModelListener<E>> = new Set()
  /** Registers `listener`; returns an idempotent unsubscribe function. */
  addModelListener(listener: ModelListener<E>): () => void
  /** Removes `listener`; no-op if it is not registered. */
  removeModelListener(listener: ModelListener<E>): void
  /** Number of registered listeners (diagnostics and tests). */
  protected get listenerCount(): number
  /** The notification loop: sends `event` to a snapshot of the listeners, in order. */
  protected notifyChanged(event: E): void
}

// src/mvc/View.ts
/** Non-blocking feedback a controller asks its view to show (NFR-5.1, NFR-5.2). */
export interface Feedback {
  readonly kind: string            // e.g. 'adjacencyViolation', 'invalidPhase'
  readonly message: string
  readonly position?: { readonly row: number; readonly col: number }
}
/** What a controller may ask of its view. */
export interface View { showFeedback(feedback: Feedback): void }

// src/mvc/AbstractController.ts
export abstract class AbstractController<M extends AbstractModel<ModelEvent>> {
  /** The model this controller drives. */
  protected readonly model: M
  /** The attached view, or null when none is mounted. */
  protected view: View | null = null
  protected constructor(model: M)
  /** Attaches (or with null detaches) the view that receives feedback. */
  setView(view: View | null): void
  /** The driven model, for read access and listener registration by the view layer. */
  getModel(): M
}

// src/mvc/subscribeModel.ts — framework-free core of the hook (testable in Node)
export function subscribeModel<E extends ModelEvent>(
  model: AbstractModel<E>, onEvent: (event: E) => void): () => void

// src/mvc/react/useModelEvents.ts
export function useModelEvents<E extends ModelEvent>(
  model: AbstractModel<E> | null, onEvent: (event: E) => void): void
```

**Behaviour rules (from the reference `Game.subscribe` / `#emit`):**
- `notifyChanged` iterates `[...this.#listeners]` (a snapshot): a listener removed during dispatch still gets the current event; a listener added during dispatch gets only later events. Listener exceptions propagate to the caller (no swallowing); document with `@throws` "whatever a listener throws".
- `addModelListener` on an already registered listener leaves one registration.
- Methods are declared with method syntax (not arrow properties) so `AbstractModel<GameEvent>` is assignable to `AbstractModel<ModelEvent>` under `strictFunctionTypes`.
- `useModelEvents`: keep `onEvent` in a ref updated every render; `useEffect(() => model ? subscribeModel(model, (e) => ref.current(e)) : undefined, [model])` — subscribe on mount, unsubscribe on unmount, never resubscribe because the callback changed. This hook is the React form of `ModelListener` and the only place a view touches a model.
- Full TSDoc on every class, field, constructor and method (all visibilities); `src/mvc/index.ts` re-exports the six core files.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm vitest run -t "golden master"   # 5,5,31,16,2,7,53,37 / 156
pnpm check:classes                    # ≥ 15
grep -rE "from '(react|xstate|@model|@controller|@view)" src/mvc --include=*.ts | grep -v "src/mvc/react/" | wc -l   # 0
git commit -am "feat(mvc): inc 03 mvc infrastructure" && git tag inc-03-green
```
- [ ] Six core files + hook exist with the signatures above; barrel excludes the hook
- [ ] `pnpm uml` output unchanged in class count (abstract classes not counted)
- [ ] lint 0/0 including `jsdoc/require-jsdoc` on `src/mvc`

### 4. CRITICAL Checkpoint
- **Risk:** first introduction of the event connector; generic variance or a circular import (`ModelEvent` ↔ `AbstractModel`) blocks every later model class. **Failure indicators:** TS2322 when assigning `AbstractModel<SubEvent>` to `AbstractModel<ModelEvent>`; runtime `undefined` base class (use `import type` in `ModelEvent.ts`); React StrictMode double-subscribing (two deliveries per event).
- **Isolation testing protocol:**
  1. Simplified config: a throw-away `CounterModel extends AbstractModel<CounterEvent>` in a scratch test; one listener.
  2. Components separately: compile `ModelEvent`/`AbstractModel` alone, then `AbstractController` with a stub `View`, then `subscribeModel`.
  3. Interaction effects: run the full suite and `pnpm e2e tests/e2e/smoke.spec.ts` (hook not yet used, nothing may change).
- **Rollback procedure:** `git reset --hard inc-02-green`; reintroduce files one at a time in the order above.

---

**CRITICAL: `src/mvc` provides listener registration, the ordered `notifyChanged` loop, controller–view coupling and the `useModelEvents` hook, with no dependency on any other package. Golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
