# Prompt 48: Game Tests, Golden Master and Safety Properties

**CRITICAL: Write `tests/model/Game.test.ts` (phase-transition coverage, one test per error kind, all 21 ported reference cases), the frozen golden master — seed 3, pattern novice-rose, max-flex auto-player: round scores 5,5,31,16,2,7,53,37, beam total 156, 41-event stream, report 186 gold — and `tests/model/GameSafety.test.ts` for NFR-6.1, NFR-6.3 and NFR-6.4 over many seeds. The golden values are NEVER edited to make a test pass.**

---

### INCREMENT 48: Game tests + golden master + safety properties
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompt 47
- **Reference implementation:** `tests/engine/game.test.ts` (21 cases), `src/dev/autoPlayer.ts` via `tests/helpers/autoPlayer.ts` (`autoPlay`, `autoPlace`, `bestPair`)
- **Context to attach:** `SRS_rev1.4.txt` §3.3–3.6, §3.8, §3.11, §4.1–4.2, §4.6; `ctxt/MVC_RoseWindow.md` §3; `AGENTS.md` (golden-master rule)
- **Requirements:** FR-1.4, FR-3.3–3.6, FR-4.10, FR-4.14, FR-6.1–6.4, FR-6.6, FR-8.1, FR-11.1–11.6, NFR-1.1, NFR-2.1–2.3, NFR-6.1, NFR-6.3, NFR-6.4

### MANDATORY: Sandwich Requirement
- **Start:** Criterion comments at the top of both files; every expected value is a literal constant.
- **End:** both files 100 % green, golden master exactly 5,5,31,16,2,7,53,37 / 156; class count **31**.

### 1. Capability Specification
Adds two suites and one helper module `tests/helpers/safety.ts` (loops live in helpers, never inside a test). No production change.

### 2. Implementation Instructions
**`tests/model/Game.test.ts` header:**
```typescript
/**
 * Test-design criterion: TRANSITION COVERAGE of the Game phase machine
 *   patternSelection -choosePattern-> draft; draft -selectDie-> place; place -selectDie-> place;
 *   place -cancelSelection-> draft; place -placeDie(1st)-> draft; place -placeDie(2nd)-> draft(round+1)
 *   | gameOver(round 8); draft|place -refreshDraft-> draft; draft|place -forfeitRound-> draft(round+1)
 * plus every rejected action in a wrong phase, and ONE TEST PER ERROR KIND:
 *   invalidPhase, unknownPattern, dieNotInPool, refreshSpent, legalMovesRemain, outOfBounds,
 *   PlacementError (illegalFirstPlacement at (1,1) on the empty window).
 *   emptyBag is unreachable through Game (90 dice, ≤ 45 drawn) — documented, not tested.
 * Ported: all 21 cases of tests/engine/game.test.ts (titles + "(ported)").
 */
```
Golden constants (copy verbatim):
```typescript
const SEED = 3, PATTERN = 'novice-rose'
const GOLDEN_ROUNDS = [5, 5, 31, 16, 2, 7, 53, 37] as const
const GOLDEN_TOTAL = 156
const ROUND_KINDS = ['diePlaced', 'diePlaced', 'beamTraced', 'roundScored', 'draftPoolRefreshed'] as const
const GOLDEN_KINDS = ['draftPoolRefreshed', ...Array(7).fill(ROUND_KINDS).flat(),
  'diePlaced', 'diePlaced', 'beamTraced', 'roundScored', 'gameOver'] // 41 kinds
const GOLDEN_REPORT = { lines: [
  { objectiveId: 'column-color-variety', name: 'Column Color Variety', points: 10 },
  { objectiveId: 'row-value-variety', name: 'Row Value Variety', points: 4 },
  { objectiveId: 'even-values', name: 'Even Values', points: 7 },
  { objectiveId: 'patron-blue', name: 'Patron of Blue', points: 9 } ],
  beamTotal: 156, total: 186, tier: 'gold' } as const
```
Golden tests: G1 `roundScores` and `totalScore`; G2 `events.map(e => e.kind)` equals `GOLDEN_KINDS` (length 41); G3 `report` `toEqual(GOLDEN_REPORT)`; G4 replay: `autoPlay(newGame()).map(e => e.toData())` equals the same for a second fresh game; G5 every event `instanceof ModelEvent` and `event.source === game`.

**`tests/helpers/safety.ts`** (pure helpers; `try/catch` allowed here only):
```typescript
/** Plays seed with auto-player; before each placement tries EVERY illegal cell for the held die. */
export function rejectedPlacementAudit(seed: number):
  { windowChanged: number; handChanged: number; kinds: ReadonlySet<string> }
/** Records totalScore − Σ roundScores at each roundScored event. */
export function runningTotalDrift(seed: number): readonly number[]
/** Recasts once at round (seed % 8) + 1 after one placement; returns counters before/after. */
export function recastCounters(seed: number): { before: Counters; after: Counters; roundsPlayed: number }
```

**`tests/model/GameSafety.test.ts`** — criterion comment: *property checks over the input domain of seeds 1–100 (NFR-1.8 sample), one `it.each` row per seed*:
- **NFR-6.1:** `windowChanged === 0` and `handChanged === 0` for every seed; one aggregate test asserts the union of `kinds` equals the five reachable laws `{cellOccupied, constraintMismatch, adjacencyViolation, illegalFirstPlacement, disconnectedPlacement}`.
- **NFR-6.3:** `runningTotalDrift(seed)` equals `[0,0,0,0,0,0,0,0]`.
- **NFR-6.4:** `after` equals `before` for `round`, `placementsRemaining`, `roundScores`, `totalScore`, `placedCount`; `after.refreshesRemaining === 0`; `roundsPlayed === 8` (FR-6.6).

Rules: fresh `Game` per test; no `if/for/while` inside `it`; errors asserted with `expect(() => …).toThrow(GameError)` plus `toThrow(/unknown pattern/i)` etc.; one-off exploratory scripts are not committed.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/Game.test.ts -t "golden"
pnpm vitest run tests/model/Game.test.ts tests/model/GameSafety.test.ts tests/engine/game.test.ts
pnpm typecheck && pnpm lint && pnpm test
git add tests && git commit -m "test(model): inc 48 Game tests, golden master, NFR-6 safety" && git tag inc-48-green
```
- [ ] 21 ported + ≥ 7 error-kind + ≥ 9 transition tests; 300 safety rows; 100 % pass, suite < 60 s
- [ ] Golden: 5,5,31,16,2,7,53,37 / 156 / 41 events / 186 gold
- [ ] `grep -nE "^\s+(if|for|while) \(" tests/model/Game*.test.ts` prints nothing

### 4. CRITICAL Checkpoint
- **Risk:** the golden master is the oracle for every later increment; a wrong constant or an "updated" value would hide a rule change in the controller, recorder or views.
- **Failure indicators:** any golden difference; replay mismatch; `windowChanged > 0`; non-zero drift; a recast changing round or score; safety suite > 60 s.
- **Isolation testing protocol:**
  1. Simplified config: `createGameConfig(3, { rounds: 1 })` — run the helpers on one round first.
  2. Components separately: golden tests alone (`-t golden`), then each safety property alone (`-t "NFR-6.1"` …) on seeds 1–5.
  3. Interaction effects: full seed range 1–100, then the whole `pnpm test`.
- **Rollback procedure:** `git reset --hard inc-47-green`; if a golden value differs, the defect is in production code since inc-35 — bisect with `git bisect` between `inc-34-green` and HEAD; never edit `GOLDEN_*`.

---

**CRITICAL: Game is covered by phase transitions and one test per error kind; NFR-6.1/6.3/6.4 hold on seeds 1–100; golden master frozen at seed 3, novice-rose, max-flex: 5,5,31,16,2,7,53,37, beam total 156.**
