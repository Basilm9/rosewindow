# Prompt 66: AT-05 Illuminate the Window

**CRITICAL: Create `tests/e2e/acceptance/at05-illuminate.spec.ts` proving the beam enters at the announced cell and direction, is drawn cell by cell, and adds round 1's points so that the running total equals the sum of round scores.**

---

### INCREMENT 66: AT-05 acceptance test
- **Status:** Standard
- **Dependencies:** Prompts 53 (BeamAnimationController), 62 (harness), 58
- **Reference implementation:** `tests/e2e/phase9.spec.ts` (beam layer, `score-float-*`, `data-settled`), `src/view/BeamLayer.tsx` (`beam-layer`, `bead-<i>`, `beam-core`, aria `beam path scoring N points…`), `src/view/ScorePanel.tsx` (`beam-total`, `round-scores`, aria `round N scored X`)
- **Context to attach:** `acceptance_tests.md` row AT-05, `mockups/02-board-round1.png`, `mockups/05-beam.png`
- **Requirements:** FR-5.1, 5.2, 5.10, 5.11; FR-7.2, 7.3; NFR-6.3

### MANDATORY: Sandwich Requirement
- **Start:** Precondition AT-01 done (`/?seed=3`, Novice Rose, round 1). Expected path and points come from a model replica, never hard-coded guesses.
- **End:** The UI beam matches the replica's `BeamPath` cell for cell, round 1 scores 5 (golden master), and the row is in `docs/acceptance/results.md`.

### 1. Capability Specification
One acceptance spec, no production change. Uses the max-flex auto-player for the two placements so round 1 is the golden-master round (score **5**).

### 2. Implementation Instructions
```typescript
// tests/e2e/acceptance/at05-illuminate.spec.ts
import { fastForward, bestPair } from '../../../src/util/autoPlayer';
const replica = fastForward(3, 1); replica.choosePattern('novice-rose');
const entry = replica.currentEntry;            // announced before any placement
```
**URL:** `/?seed=3` → `pattern-novice-rose`.

1. **Note the announced entry:** `cell-r<entry.row>c<entry.col>` contains `entry-arrow` with label `beam enters heading <entry.direction>`. Shot `entry` → `MOCKUP.board`.
2. **Make both placements:** twice: `bestPair(replica)` → click `select <color> <value>` (first) and the target cell; apply the same move to the replica. Capture the expected path from the replica's `beamPath`/round event (`BeamPath.segments`: positions in order, points per strike).
3. **Watch the beam:** subscribe with `page.exposeFunction` + a `MutationObserver` on `beam-layer` (installed before the second placement) that records each `bead-<i>` / `score-float-<i>` as it appears, with its timestamp. Assert:
   - `beam-layer` visible, `glass-board` `aria-busy="true"` while drawing; shot `beam-mid` → `MOCKUP.beam` taken after the first `score-float` appears and before `data-settled`.
   - The first bead sits in the entry cell and the bead order equals the replica path order (cell by cell, increasing timestamps).
   - `beam-layer` aria-label `beam path scoring 5 points, …` after `data-settled="true"`.
   - `round-scores` has `round 1 scored 5`; `beam-total` = `5` = sum of all `round N scored X` values; `round-indicator` `ROUND 2/8`.
   - The next entry is announced: `entry-arrow` now sits on the replica's new `currentEntry` with its direction.
   Shot `round-score` → `MOCKUP.beam`.
4. `logResult` with URL `/?seed=3`, the recorded path and timings in notes; compare PNGs with `05-beam.png` (warm beam, score floats, multiplier chip) and `02-board-round1.png` (sun badge + arrow).

**Rules:** if bead elements do not map to cells, compare `beam-core` `points` against cell centres computed from the replica path instead, and say so in the notes; do not loosen any other expectation.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm e2e:acceptance -g "AT-05" && pnpm e2e
```
- [ ] Round 1 = 5, `beam-total` = Σ round scores (NFR-6.3)
- [ ] Path order matches replica; entry matches announcement
- [ ] `docs/acceptance/AT05/01-entry.png`, `02-beam-mid.png`, `03-round-score.png`
- [ ] Tracking matrix green; commit `test(e2e): inc 66 AT-05 illuminate`, tag `inc-66-green`

---

**CRITICAL: The beam starts where it was announced, draws in order, and total = Σ round scores; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
