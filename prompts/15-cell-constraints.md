# Prompt 15: CellConstraint, ColorConstraint, ValueConstraint, OpenConstraint

**CRITICAL: Replace the provisional `CellConstraint` with the real interface in `src/model/CellConstraint.ts` and move the three implementing classes there, so a printed demand is checked polymorphically with `constraint.accepts(die)`. There must be exactly ONE definition of each class (engine re-exports it), and each instance's own enumerable data must stay `{kind, color}` / `{kind, value}` / `{kind}` or the reference `toEqual` assertions break.**

---

### INCREMENT 15: Printed cell demands as polymorphic classes
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompts 05, 11
- **Reference implementation:** `src/engine/types.ts` (`CellConstraint`, `OpenConstraint`, `ColorConstraint`, `ValueConstraint`, factory functions) and `tests/engine/classes.test.ts` ("loads printed demands…"), `tests/engine/placementValidator.test.ts` (constraintMismatch cases)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (rows 5–7), §5
- **Requirements:** FR-4.4, FR-4.5, FR-1.2, NFR-2.2

### MANDATORY: Sandwich Requirement
- **Start:** `CellConstraint` is an interface; `OpenConstraint`, `ColorConstraint`, `ValueConstraint` `implements CellConstraint`; callers declare variables as `CellConstraint`, never as a concrete class.
- **End:** `pnpm test` 100 % green, golden master unchanged, `check:classes` ≥ **16**.

### 1. Capability Specification
- **Changes:** the forward declaration from Prompt 05 becomes the real interface (`accepts(die: DieData)` — plain die data, which a `Die` instance also satisfies); the three classes move from `engine/types.ts`.
- **Adds:** argument validation (`ColorConstraint` rejects an unknown color, `ValueConstraint` a value outside 1–6) via `GameError` `invalidArgument`; `describe()` for rejection toasts (FR-4.11).
- **Unchanged:** acceptance rules — color demand ignores value, value demand ignores color, open accepts everything.

### 2. Implementation Instructions
```typescript
// src/model/CellConstraint.ts — imports ./Die and ./GameError only
export type ConstraintKind = 'open' | 'color' | 'value'

/** The printed demand on a window cell. */
export interface CellConstraint {
  /** Discriminator; also the serialized tag. */
  readonly kind: ConstraintKind
  /** Whether `die` satisfies this printed demand (FR-4.4/4.5). */
  accepts(die: DieData): boolean
  /** Player-facing text, e.g. "must be yellow", "must show 4", "open". */
  describe(): string
}

export class OpenConstraint implements CellConstraint {
  readonly kind = 'open'
  constructor()
  accepts(die: DieData): boolean            // always true
  describe(): string                        // 'open'
}
export class ColorConstraint implements CellConstraint {
  readonly kind = 'color'
  /** @throws GameError invalidArgument if color ∉ DIE_COLORS */
  constructor(readonly color: DieColor)
  accepts(die: DieData): boolean            // die.color === this.color
  describe(): string                        // `must be ${color}`
}
export class ValueConstraint implements CellConstraint {
  readonly kind = 'value'
  /** @throws GameError invalidArgument unless an integer Die.MIN_VALUE..Die.MAX_VALUE */
  constructor(readonly value: number)
  accepts(die: DieData): boolean            // die.value === this.value
  describe(): string                        // `must show ${value}`
}
```

**Behaviour rules:**
1. `accepts` and `describe` are **prototype methods** on all three classes. The reference `OpenConstraint` declares `accepts` as an own arrow property; drop that so its own data is exactly `{ kind: 'open' }`.
2. `Object.freeze(this)` last in every constructor. Validation for `ColorConstraint`/`ValueConstraint` happens before freezing (use explicit field assignment if parameter properties make the order impossible).
3. `accepts` takes `DieData` (from Prompt 11) so plain restored data and test fixtures still work.
4. TSDoc on the interface, every member, every class, field, constructor (`@throws`) and method.
5. **Shim:** `src/engine/types.ts` replaces its class bodies with `export { OpenConstraint, ColorConstraint, ValueConstraint } from '../model/CellConstraint'` and `export type { CellConstraint }`; `openConstraint()`, `colorConstraint(c)`, `valueConstraint(v)` stay as one-line factories returning `CellConstraint`.
6. `GameError.ts` now imports the final `CellConstraint` type; delete the provisional declaration.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/classes.test.ts tests/engine/placementValidator.test.ts tests/engine/patterns.test.ts
pnpm vitest run tests/engine/game.test.ts -t "golden master"
grep -rn "class \(Open\|Color\|Value\)Constraint" src | wc -l    # must print 3
git commit -am "feat(model): inc 15 CellConstraint classes" && git tag inc-15-green
```
- [ ] `new ColorConstraint('yellow')` `toEqual({ kind: 'color', color: 'yellow' })`
- [ ] `parseConstraints(['R3.', '...', '...'])[0]` yields instances of the three **model** classes (`instanceof` from both import paths)
- [ ] `new ValueConstraint(7)` throws `GameError` kind `invalidArgument`
- [ ] typecheck 0; lint 0/0; unit 100 %; golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 16

### 4. CRITICAL Checkpoint
- **Risk:** architectural transition — the first time a model interface is realized by several classes that both the engine and the model import. Duplicate class definitions or extra own properties silently break `instanceof` and `toEqual`.
- **Failure indicators:** `classes.test.ts` "loads printed demands…" fails on `toBeInstanceOf`; placementValidator `constraintMismatch` cases fail with an extra `accepts` key in the diff; typecheck errors in `GameError.ts` about `CellConstraint`; class count drops or the grep above prints 6.
- **Isolation testing protocol:**
  1. Simplified config: in a scratch test, construct one instance of each class and assert `Object.keys(x)` equals `['kind']`, `['kind','color']`, `['kind','value']`.
  2. Components separately: run `tests/engine/classes.test.ts` alone, then `placementValidator.test.ts` alone, then `patterns.test.ts` alone.
  3. Interaction effects: run `tests/engine/game.test.ts` (golden master consumes patterns → constraints → validator) and confirm 156.
- **Rollback procedure:** `git reset --hard inc-14-green`; re-apply in two steps — first move the classes with no behaviour change and re-run the suite, then add validation and `describe()`.

---

**CRITICAL: CellConstraint is one interface with exactly one definition of each of its three classes, acceptance rules unchanged and own data `{kind[, color|value]}`; golden master stays 5,5,31,16,2,7,53,37 / 156.**
