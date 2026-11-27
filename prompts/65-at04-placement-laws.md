# Prompt 65: AT-04 One Rejection per Placement Law

**CRITICAL: First search seeds with the model to find a seed and pattern where each placement law can be broken in turn, record it, then create `tests/e2e/acceptance/at04-placement-laws.spec.ts` showing each law named at the cell with the die kept in hand and the window unchanged.**

---

### INCREMENT 65: AT-04 acceptance test
- **Status:** Standard
- **Dependencies:** Prompts 27 (PlacementValidator), 62 (harness), 58
- **Reference implementation:** `src/model/PlacementValidator.ts` (law order: occupied → die-in-pool → demand → adjacency → first placement → connection), `src/util/autoPlayer.ts` (`fastForward`, `legalPairs`), `tests/e2e/phase8.spec.ts`, `GameScreen.tsx` (`rejection-hint` with `data-error-kind`, `ghost-r<r>c<c>`, `data-rejected`, `data-offending`)
- **Context to attach:** `acceptance_tests.md` row AT-04, `mockups/04-placement-rejected.png`, `mockups/03-legal-preview.png`
- **Requirements:** FR-4.1, 4.2, 4.4 to 4.8, 4.10 to 4.13; NFR-5.1, 5.2; NFR-6.1

### MANDATORY: Sandwich Requirement
- **Start:** The seed and every target cell come from a model search, never from guessing; the search result is written down before the spec uses it.
- **End:** Seven steps pass, every rejection is shown at its cell with no dialog, and the row is in `docs/acceptance/results.md`.

### 1. Capability Specification
Adds `tests/e2e/acceptance/at04-seed-search.ts` (a node script run with `pnpm exec vite-node`, which ships with Vitest) and the spec. Because the validator stops at the **first** broken law, each target must break only the intended law.

### 2. Implementation Instructions
**Seed search** (`at04-seed-search.ts`), seeds 1..2000, starting with seed 3, each offered pattern, on `fastForward(seed,1)` + `choosePattern(id)`:
```typescript
interface At04Plan { seed: number; patternId: string; first: Die; interior: Pos; edge: Pos;
  second: Die; colourCell: Pos; valueCell: Pos; adjacentCell: Pos; disconnectedCell: Pos; }
```
Accept a plan when, with `first` in hand on an empty board, `interior` is an open (or satisfied) interior cell whose only violation is `illegalFirstPlacement`; `edge` is legal; after placing `first` at `edge` and selecting `second`: `edge` gives `cellOccupied`; `colourCell` gives `constraintMismatch` with a colour demand; `valueCell` gives it with a value demand; `adjacentCell` gives `adjacencyViolation` with `edge` among `offendingNeighbors`; `disconnectedCell` gives `disconnectedPlacement`. Use the model's validator for every check. Print the first plan as JSON and save it to `tests/e2e/acceptance/at04-plan.json`; quote it in the `results.md` notes.

**Spec**, URL `/?seed=<plan.seed>` → `pattern-<plan.patternId>`. Before each rejection snapshot all `gridcell` aria-labels; after it assert they are unchanged, `held-die` still shows the die, `getByRole('dialog')` count 0, and the target cell has `data-rejected="true"`.

| Step | Action | Expected | Shot → mockup |
| --- | --- | --- | --- |
| 1 | select `first`, hover `interior` | `ghost` `data-legal="false"`, label ends `illegal`; click: `data-error-kind=illegalFirstPlacement`, text `Start at the edge` | `illegal-preview`, `first-law` → `rejected` |
| 2 | click `edge` | `die-r…c…` visible; `2`→`1 left to place this round` | `placed` → `legal` |
| 3 | select `second`, click `edge` | `cellOccupied` | `occupied` → `rejected` |
| 4 | click `colourCell` | `constraintMismatch`, text `Wrong color` | `colour` → `rejected` |
| 5 | click `valueCell` | `constraintMismatch`, text `Wrong number` | `value` → `rejected` |
| 6 | click `adjacentCell` | `adjacencyViolation`; `edge` cell `data-offending="true"` | `adjacency` → `rejected` |
| 7 | click `disconnectedCell` | `disconnectedPlacement`, text `Keep the glass connected` | `connection` → `rejected` |

Record the bounding boxes of `rejection-hint` and the target cell in the notes so a reviewer can confirm "message at the cell" against `04-placement-rejected.png`. Log with `logResult`.

### 3. Verification Protocol
```bash
pnpm exec vite-node tests/e2e/acceptance/at04-seed-search.ts && pnpm typecheck && pnpm lint && pnpm e2e:acceptance -g "AT-04" && pnpm e2e
```
- [ ] Plan JSON recorded; every target verified by the validator
- [ ] Six distinct `data-error-kind` observations plus one successful placement
- [ ] `docs/acceptance/AT04/01-illegal-preview.png` … `08-connection.png`
- [ ] Tracking matrix green; commit `test(e2e): inc 65 AT-04 placement laws`, tag `inc-65-green`

---

**CRITICAL: One rejection per law from a recorded model-searched seed, die stays in hand, window unchanged, no dialog; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
