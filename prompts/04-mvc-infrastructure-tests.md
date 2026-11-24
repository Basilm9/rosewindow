# Prompt 04: MVC Infrastructure Tests

**CRITICAL: Write the unit tests for `AbstractModel`, `AbstractController` and `subscribeModel` that prove listener registration, unsubscription and the in-order `notifyChanged` loop. Do not change production code unless a test exposes a defect; golden master 5,5,31,16,2,7,53,37 / 156 must stay green.**

---

### INCREMENT 04: MVC infrastructure test classes
- **Status:** Standard
- **Dependencies:** Prompt 03
- **Reference implementation:** none (new); behaviour mirrors `src/engine/game.ts` `subscribe`/`#emit`, whose tests in `tests/engine/game.test.ts` stay untouched
- **Context to attach:** `ctxt/MVC_RoseWindow.md` section 2; prompt 03
- **Requirements:** NFR-4.1, NFR-1.5

### MANDATORY: Sandwich Requirement
- **Start:** One test file per class under test, in `tests/mvc/`, mirroring `src/mvc/`.
- **End:** every listed case passes; removing the snapshot copy in `notifyChanged` makes cases M8 and M9 fail (mutation check).

---

### 1. Capability Specification
- **Adds:** `tests/mvc/AbstractModel.test.ts`, `tests/mvc/AbstractController.test.ts`, `tests/mvc/subscribeModel.test.ts`, and the test doubles in `tests/mvc/doubles.ts`.
- **Unchanged:** all production code; no existing test is modified.

### 2. Implementation Instructions
Test doubles (test folder only, never counted as production classes):
```ts
export class CountedEvent extends ModelEvent {
  readonly kind = 'counted' as const
  constructor(source: CounterModel, readonly value: number) { super(source) }
}
export class CounterModel extends AbstractModel<CountedEvent> {
  #value = 0
  increment(): CountedEvent { const e = new CountedEvent(this, ++this.#value); this.notifyChanged(e); return e }
  get listeners(): number { return this.listenerCount }
}
export class CounterController extends AbstractController<CounterModel> {
  constructor(model: CounterModel) { super(model) }
  currentView(): View | null { return this.view }
}
```

**Rules (course JUnit style):** fresh `CounterModel` in every `it` (build it inside the test or in `beforeEach`); no `if`/loops inside a test (use `it.each` for tables); expected values are literal constants; record calls in an array `const log: string[] = []` and compare with `toEqual([...])`.

**`AbstractModel.test.ts` — test-design criterion: branch (edge) coverage** of `addModelListener` (new / duplicate), `removeModelListener` (present / absent), unsubscribe (first / repeated call) and the `notifyChanged` loop (0, 1, many iterations; mutation during iteration). Put this comment at the top of the file with the case list:

| Id | Case | Expected |
|---|---|---|
| M1 | notify with 0 listeners | no throw; `listeners === 0` |
| M2 | 1 listener | receives the same instance (`toBe(event)`), `value === 1`, `source === model` |
| M3 | listeners a, b, c | log `['a','b','c']` |
| M4 | same listener added twice | 1 call; `listeners === 1` |
| M5 | returned unsubscribe | 0 calls after; `listeners === 0` |
| M6 | unsubscribe called twice | no throw; other listener still gets 1 call |
| M7 | `removeModelListener` of unknown listener | no throw; `listeners` unchanged (1) |
| M8 | a removes b during dispatch | first notify log `['a','b','c']`, second `['a','c']` |
| M9 | a adds d during dispatch | first notify log `['a','b']`, second `['a','b','d']` |
| M10 | listener throws `RangeError` | `expect(() => model.increment()).toThrow(RangeError)`; later listeners not called on that event |

**`AbstractController.test.ts` — criterion: branch coverage of `setView`** (attach / replace / detach):
C1 new controller → `currentView()` is `null`; C2 `getModel()` `toBe` the constructor model; C3 `setView(v1)` → `v1`; C4 `setView(v1)` then `setView(v2)` → `v2`; C5 `setView(v1)` then `setView(null)` → `null`.

**`subscribeModel.test.ts` — criterion: branch coverage of subscribe/unsubscribe:**
S1 callback receives 2 events with values `[1, 2]`; S2 after the returned unsubscribe, 0 further calls; S3 two subscriptions with the same callback function are independent (unsubscribing one leaves 1 call per event).

**Error kinds:** the MVC base classes raise no `GameError`; M10 is the single exception path (listener exceptions propagate unchanged). State this in the file comment.

### 3. Verification Protocol
```bash
pnpm vitest run tests/mvc            # 18 tests, 100 % pass
pnpm vitest run --coverage tests/mvc --coverage.include=src/mvc/*.ts   # branches 100 % on src/mvc core (if @vitest/coverage-v8 is available; otherwise skip)
pnpm typecheck && pnpm lint && pnpm test
pnpm vitest run -t "golden master"   # 156
git commit -am "test(mvc): inc 04 mvc infrastructure tests" && git tag inc-04-green
```
- [ ] 10 + 5 + 3 = 18 cases, ids in the test names (e.g. `it('M8 removal during dispatch', …)`)
- [ ] Mutation check: replacing `[...this.#listeners]` by `this.#listeners` turns M8 and M9 red (live Set iteration skips removed and visits added listeners); revert afterwards
- [ ] No control flow inside tests; no shared mutable fixture between tests
- [ ] Tracking: typecheck 0, lint 0/0, unit 100 %, golden exact, classes ≥ 15

---

**CRITICAL: Listener registration, idempotent unsubscribe and the ordered, snapshot-based `notifyChanged` loop are now pinned by 18 tests; production behaviour and the golden master (5,5,31,16,2,7,53,37 / 156) are unchanged.**
