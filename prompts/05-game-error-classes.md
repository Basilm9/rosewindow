# Prompt 05: GameError and PlacementError

**CRITICAL: Create `GameError` and its subclass `PlacementError` in `src/model/GameError.ts`, each carrying a machine-readable `violation`, and extend the violation union so that NO model code ever needs `throw new Error(...)` again. Existing messages must stay byte-identical (tests match `/draft pool/`, `/printed demand/`, `/outside the grid/`).**

---

### INCREMENT 05: Model exception hierarchy
- **Status:** Standard
- **Dependencies:** Prompts 01–04
- **Reference implementation:** `src/engine/errors.ts` (logic) and `tests/engine/errors.test.ts` (tests)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §4 (rows 23–24) and §5
- **Requirements:** NFR-2.2, NFR-2.4, NFR-1.3, FR-4.9, FR-4.11, NFR-4.3

### MANDATORY: Sandwich Requirement
- **Start:** Every foreseeable model failure throws `GameError` or `PlacementError`; the `violation.kind` is the machine-readable reason (NFR-2.2).
- **End:** `pnpm test` 100 % green, golden master unchanged, `pnpm check:classes` ≥ **15**.

### 1. Capability Specification
- **Adds:** `src/model/Position.ts` (the `Position` interface, moved from `engine/types.ts`) and `src/model/GameError.ts`.
- **Adds four violation kinds** the reference still expresses as `throw new Error(...)`:
  - `outOfBounds` — `placementValidator.ts` line 73 (NFR-2.4: caller defect, fail loudly)
  - `malformedPattern` — `patterns.ts` lines 28, 42, 53 (NFR-1.3)
  - `unknownPattern` — `game.ts` line 137
  - `invalidArgument` — `sample.ts` line 20 and any bad constructor argument
- **Unchanged:** all existing kinds and their message strings; `engine/errors.ts` becomes a re-export shim.

### 2. Implementation Instructions
```typescript
// src/model/Position.ts
/** Grid coordinates; row 0 = north edge, col 0 = west edge. */
export interface Position { readonly row: number; readonly col: number }

// src/model/GameError.ts — imports only ./Position and ./CellConstraint (type-only)
export type PlacementViolation =
  | { readonly kind: 'cellOccupied' }
  | { readonly kind: 'dieNotInPool' }
  | { readonly kind: 'constraintMismatch'; readonly expected: CellConstraint }
  | { readonly kind: 'adjacencyViolation'; readonly offendingNeighbors: readonly Position[] }
  | { readonly kind: 'illegalFirstPlacement' }
  | { readonly kind: 'disconnectedPlacement' }

export type GameViolation =
  | PlacementViolation
  | { readonly kind: 'emptyBag' | 'invalidPhase' | 'refreshSpent' | 'legalMovesRemain' }
  | { readonly kind: 'outOfBounds'; readonly target: Position }
  | { readonly kind: 'malformedPattern'; readonly reason: string }
  | { readonly kind: 'unknownPattern'; readonly id: string }
  | { readonly kind: 'invalidArgument'; readonly detail: string }

/** Base class for every rule rejection the model raises. */
export class GameError extends Error {
  readonly violation: GameViolation
  constructor(violation: GameViolation)          // name = 'GameError'
  /** Human-readable text for a violation; exhaustive switch with a `never` default. */
  static describe(violation: GameViolation): string
}

/** Placement family; callers may catch the group and still read the reason. */
export class PlacementError extends GameError {
  declare readonly violation: PlacementViolation
  constructor(violation: PlacementViolation)     // name = 'PlacementError'
}
```

**`CellConstraint` forward declaration.** The real interface arrives in Prompt 15. In this increment create `src/model/CellConstraint.ts` containing only:
```typescript
/** Provisional; Prompt 15 narrows `accepts` to `(die: DieData) => boolean`. */
export interface CellConstraint {
  readonly kind: 'open' | 'color' | 'value'
  accepts(die: { readonly color: string; readonly value: number }): boolean
}
```
The engine constraint classes satisfy it structurally (method parameters are bivariant).

**Behaviour rules (from `engine/errors.ts`):**
1. Copy the ten existing messages verbatim (e.g. `dieNotInPool` → "die is not in the current draft pool").
2. New messages: `outOfBounds` → `` `target ${JSON.stringify(target)} is outside the grid` ``; `malformedPattern` → `` `malformed window pattern: ${reason}` ``; `unknownPattern` → `` `unknown pattern id: "${id}"` ``; `invalidArgument` → `` `invalid argument: ${detail}` ``.
3. `outOfBounds` is a `GameError`, **not** a `PlacementError`: it is a caller defect, not a broken placement law. Conversely every `PlacementViolation` kind is always raised as a `PlacementError`, wherever it occurs — including `dieNotInPool` from `DraftPool.take` (Prompt 25).
4. TSDoc on both classes, the field, the constructor and `describe`, including when each is thrown.
5. Shim: `src/engine/errors.ts` becomes `export { GameError, PlacementError } from '../model/GameError'` plus `export type { GameViolation, PlacementViolation }`; `engine/types.ts` re-exports `Position` from `src/model/Position`.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check:classes
pnpm vitest run tests/engine/game.test.ts -t "golden master"
git commit -am "feat(model): inc 05 GameError PlacementError" && git tag inc-05-green
```
- [ ] typecheck 0 errors; lint 0 errors, 0 warnings
- [ ] `tests/engine/errors.test.ts` and all other suites 100 % pass
- [ ] Golden master 5,5,31,16,2,7,53,37 / 156
- [ ] `check:classes` ≥ 15 (names unchanged, so count is unchanged)
- [ ] `grep -rn "new Error(" src/model` returns nothing
- [ ] Removing a case from `describe` makes `pnpm typecheck` fail (exhaustiveness)

---

**CRITICAL: GameError/PlacementError carry a machine-readable `violation`, keep every existing message verbatim, and add the `outOfBounds`, `malformedPattern`, `unknownPattern` and `invalidArgument` kinds; golden master stays 5,5,31,16,2,7,53,37 / 156.**
