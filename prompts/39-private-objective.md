# Prompt 39: PrivateObjective

**CRITICAL: Create `PrivateObjective implements Objective` (sum of the values of one patron colour, FR-2.5) and move the seeded deal into `dealObjectives(random)` in the model, drawing the three publics and then the one private in the reference order so the golden-master deal (column-color-variety, row-value-variety, even-values, patron-blue = 9) is unchanged.**

---

### INCREMENT 39: PrivateObjective + objective deal
- **Status:** Standard
- **Dependencies:** Prompts 09 (SeededRandom / `sample`), 37
- **Reference implementation:** `src/engine/objectives.ts` (`PrivateObjective`, `ALL_PRIVATE_OBJECTIVES`, `DealtObjectives`, `dealObjectives`), `src/engine/scoreCalculator.ts` (`scorePrivateObjective`); tests `tests/engine/objectives.test.ts`, `tests/engine/scoreCalculator.test.ts` ("private objective")
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (row 19), the SRS Rev 1.4 (attach the file; it is not in the repo) §3.2
- **Requirements:** FR-2.1, FR-2.2, FR-2.5, NFR-1.1, NFR-1.2

### MANDATORY: Sandwich Requirement
- **Start:** The deal consumes the RNG exactly as before: `sample(PublicObjective.ALL, 3, rng)` **then** `sample(PrivateObjective.ALL, 1, rng)`.
- **End:** Old objective tests pass via the shim; golden master and golden report unchanged; `check:classes` reports **23**.

### 1. Capability Specification
- **Adds:** `src/model/PrivateObjective.ts` (class + `PrivateObjective.ALL`), `src/model/objectiveDeal.ts` (`DealtObjectives` interface, `dealObjectives` function — not a class).
- **Changes:** `src/engine/objectives.ts` becomes a re-export shim (`ALL_PRIVATE_OBJECTIVES`, `dealObjectives`, type `DealtObjectives` from the model, and `ObjectiveCard = PublicObjective | PrivateObjective` over the plain-data interfaces prompt 37 kept; those interfaces stay until prompt 59); `scorePrivateObjective(grid, o)` delegates to `PrivateObjective.from(o).score(grid)`.
- **Unchanged:** ids `patron-red|yellow|blue|green|purple`, names `Patron of Red` …, descriptions, and colour order of `DIE_COLORS` (red, yellow, blue, green, purple).

### 2. Implementation Instructions
```typescript
// src/model/PrivateObjective.ts
/** The private colour objective (FR-2.2, FR-2.5): sum of the values of the patron colour's dice. */
export class PrivateObjective implements Objective {
  readonly kind = 'private' as const
  /** id `patron-<color>`, name `Patron of <Color>`, description `Score the sum of values of your <color> dice.` */
  constructor(readonly color: DieColor)
  readonly id: string
  readonly name: string
  readonly description: string
  /** The five objectives, one per colour, in DIE_COLORS order. */
  static readonly ALL: readonly PrivateObjective[]
  /** Wraps legacy plain data `{ color, … }` (only `color` is read). */
  static from(data: { readonly color: DieColor }): PrivateObjective
  /** Sum of values of dice whose colour is `this.color`; 0 when none. */
  score(grid: DieGrid): number
}

// src/model/objectiveDeal.ts
export interface DealtObjectives {
  readonly publics: readonly [PublicObjective, PublicObjective, PublicObjective]
  readonly privateObjective: PrivateObjective
}
/**
 * Deals three distinct publics and one private from the run's seeded stream (FR-2.1, FR-2.2).
 * @throws {GameError} `invalidArgument` only if `sample` is asked for more items than exist (cannot happen with 8 and 5).
 */
export function dealObjectives(next: Rng): DealtObjectives
```

**Rules:**
1. Field names `kind`, `id`, `name`, `description`, `color` are read by `src/view/Objectives.tsx` — keep them as own fields.
2. `score` is the reference reduction: `grid.flat().filter(d => d?.color === color).reduce((s, d) => s + d.value, 0)`.
3. Instances frozen; `ALL` built once and frozen.
4. Draw with `SeededRandom.sample(items, count, next)` from prompt 09 (it throws `GameError` `invalidArgument`, never `Error`).
5. TSDoc on all members, with `@throws` on `dealObjectives`.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/objectives.test.ts tests/engine/game.test.ts
git commit -am "feat(model): inc 39 PrivateObjective" && git tag inc-39-green
```
- [ ] Seed 3 game: `objectives.publics` ids = column-color-variety, row-value-variety, even-values; private = patron-blue
- [ ] Golden report private line `{ objectiveId: 'patron-blue', name: 'Patron of Blue', points: 9 }`
- [ ] Golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 23; lint 0/0

---

**CRITICAL: PrivateObjective scores its colour's value sum and the seeded deal order (3 publics, then 1 private) is untouched; golden master 5,5,31,16,2,7,53,37 / 156.**
