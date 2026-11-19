# Prompt 11: Die

**CRITICAL: Move the immutable `Die` value class (color + value, frozen, value equality) into `src/model/Die.ts`, together with `DieColor` and `DIE_COLORS` in the reference order red, yellow, blue, green, purple. That order drives the bag build and the golden master; never change it.**

---

### INCREMENT 11: Die value object
- **Status:** Standard
- **Dependencies:** Prompts 05, 09
- **Reference implementation:** `src/engine/types.ts` (`DIE_COLORS`, `DieColor`, `Die`, `sameDie`) and `tests/engine/classes.test.ts` ("draws immutable Die instances…")
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 3)
- **Requirements:** FR-3.2, FR-4.3, NFR-2.6, NFR-5.5

### MANDATORY: Sandwich Requirement
- **Start:** `Die` is immutable (`Object.freeze(this)`) and equality is **by color and value**, never by identity, so dice restored from JSON still match (FR-4.3, run restore).
- **End:** `pnpm test` 100 % green, golden master unchanged, `check:classes` ≥ 15.

### 1. Capability Specification
- **Adds:** `src/model/Die.ts`.
- **Changes:** the constructor validates its arguments and throws `GameError({ kind: 'invalidArgument', detail })` for an unknown color or a value that is not an integer 1–6 (NFR-2.6: restored data is untrusted).
- **Unchanged:** fields, `Die.equals` accepting plain `{color, value}` data, `sameDie`, `DIE_COLORS` order. Tests and fixtures that build plain objects (`tests/helpers/board.ts`) keep working because `Die.equals` only reads `color` and `value`.

### 2. Implementation Instructions
```typescript
// src/model/Die.ts — imports ./GameError only
/** The five glass colors, in draft-pool display order. */
export const DIE_COLORS = ['red', 'yellow', 'blue', 'green', 'purple'] as const
export type DieColor = (typeof DIE_COLORS)[number]

/** Plain die data (e.g. parsed from a stored run); what equality compares. */
export interface DieData { readonly color: DieColor; readonly value: number }

/** An immutable colored die; `value` is the printed face, 1–6. */
export class Die implements DieData {
  /** Lowest printed face. */
  static readonly MIN_VALUE = 1
  /** Highest printed face. */
  static readonly MAX_VALUE = 6
  /** Glass color. */
  readonly color: DieColor
  /** Printed face. */
  readonly value: number
  /** @throws GameError invalidArgument if color ∉ DIE_COLORS or value ∉ {1..6} */
  constructor(color: DieColor, value: number)   // explicit fields: validate BEFORE assigning
  /** Value equality; accepts plain data restored from a recording. */
  static equals(a: DieData, b: DieData): boolean
  /** Instance form of `Die.equals`. */
  equals(other: DieData): boolean
  /** Rehydrates plain data into a validated Die. @throws GameError invalidArgument */
  static from(data: DieData): Die
  /** `"red 3"` — used for ARIA labels; never parsed back. */
  toString(): string
}
```

**Behaviour rules (from `engine/types.ts`):**
1. Constructor order: validate, assign, `Object.freeze(this)`. Own enumerable properties are exactly `color` and `value` (so `JSON.stringify(die)` stays `{"color":"red","value":3}` and `toEqual({color, value})` still passes).
2. `equals` compares `a.color === b.color && a.value === b.value`; no `instanceof` check.
3. `detail` strings: `` `unknown die color "${color}"` `` and `` `die value ${value} is not an integer 1–6` ``.
4. `DiceBag` (Prompt 23) loops `Die.MIN_VALUE..Die.MAX_VALUE`; no other model file writes the literal 6 for faces.
5. TSDoc on the class, both fields, both statics constants, constructor (`@param`, `@throws`) and each method.
6. **Shim:** in `src/engine/types.ts`, replace the `DIE_COLORS`, `DieColor` and `Die` declarations with `export { DIE_COLORS, Die } from '../model/Die'` and `export type { DieColor } from '../model/Die'`; `sameDie(a, b)` becomes `return Die.equals(a, b)`.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/classes.test.ts tests/engine/diceBag.test.ts
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "feat(model): inc 11 Die" && git tag inc-11-green
```
- [ ] `Object.isFrozen(new Die('red', 3))`
- [ ] `Die.equals(new Die('red', 3), { color: 'red', value: 3 })` is `true`; with value 7 data it is `false`
- [ ] `new Die('red', 7)` and `new Die('pink' as DieColor, 3)` throw `GameError` kind `invalidArgument`
- [ ] Only one `class Die` exists in `src/` (engine re-exports it): `grep -rn "class Die\b" src` prints one line
- [ ] typecheck 0; lint 0/0; unit 100 %; golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 15

---

**CRITICAL: Die is a frozen, validated value object with color+value equality and DIE_COLORS keeps the order red, yellow, blue, green, purple; golden master stays 5,5,31,16,2,7,53,37 / 156.**
