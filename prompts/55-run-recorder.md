# Prompt 55: RunRecorder

**CRITICAL: Create `RunRecorder` in `src/progression`: it records the player's admitted actions, validates a stored record as untrusted data, and restores a run by replaying the actions through `Game` — never by trusting a stored board or score. Progression imports only the model (section 5: no XState, no controller), and a restored run must equal the uninterrupted run exactly (NFR-1.7). Golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**

---

### INCREMENT 55: RunRecorder
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompts 47, 48, 50
- **Reference implementation:** `src/hooks/runSession.ts` (`RunSession`, `replaySession`, `saveSession`, `loadSession`, `clearSession`, key `rosewindow-active-v1`, `USER_ACTIONS`) and `tests/hooks/runSession.test.ts` (10 blocks)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` sections 4 (row 27), 5; `ctxt/acceptance_tests.md` AT-10
- **Requirements:** FR-12.1–FR-12.6, NFR-1.6, NFR-1.7, NFR-2.6, NFR-2.7, NFR-2.8, NFR-3.6

### MANDATORY: Sandwich Requirement
- **Start:** Validation rules are copied **exactly** from `loadSession` (id non-blank, `tutorial` boolean, seed safe integer 0…4294967295, mode ∈ free/daily/challenge, ≤ 1000 actions, `targetRound === 1`, die colour/value, position 0…3, optional `patternId` string, optional `targetScore` 0…1 000 000).
- **End:** `tests/hooks/runSession.test.ts` passes unchanged through the shim, and a restored seed-3 run equals the original in board, round, scores, hand, draft and recasts.

---

### 1. Capability Specification
- **Adds:** class #27. Storage is injected (`StorageLike` from `profile.ts`), default `globalThis.localStorage` inside `try`.
- **Changes (behaviour):** replay no longer uses the statechart. It calls `Game` methods directly and reproduces the statechart's automatic deadlock escape (after each action: while phase is `draft`/`place` and `!game.hasLegalMove()`, call `game.forfeitRound()`). An action the rules refuse (`GameError`) makes the whole record invalid → `restore` returns `null` and the caller starts a new run (FR-12.4).
- **Unchanged:** storage key, JSON shape of `RunSession`, all reference test expectations.

### 2. Implementation Instructions
```ts
// src/progression/RunRecorder.ts   (imports: @model, ./profile types only)
export type RecordedAction =
  | { readonly type: 'CHOOSE_PATTERN'; readonly id: string }
  | { readonly type: 'SELECT_DIE'; readonly die: { readonly color: DieColor; readonly value: number } }
  | { readonly type: 'PLACE_DIE'; readonly position: { readonly row: number; readonly col: number } }
  | { readonly type: 'CANCEL_SELECTION' } | { readonly type: 'REFRESH_DRAFT' }
export interface RunSession {
  readonly id: string; readonly seed: number; readonly mode: 'free' | 'daily' | 'challenge'
  readonly patternId?: string; readonly targetScore?: number
  readonly targetRound: number; readonly tutorial: boolean; readonly actions: readonly RecordedAction[]
}
export class RunRecorder {
  static readonly STORAGE_KEY = 'rosewindow-active-v1'
  static readonly MAX_ACTIONS = 1000
  readonly #storage: Pick<StorageLike, 'getItem' | 'setItem'> & { removeItem(key: string): void } | undefined
  #session: RunSession | null = null
  constructor(storage?: Pick<StorageLike, 'getItem' | 'setItem'> & { removeItem(key: string): void })
  begin(session: RunSession): void                  // starts recording; does NOT persist (see rules)
  record(action: RecordedAction): boolean           // append + save; false if storage refused (FR-12.6)
  get session(): RunSession | null
  save(): boolean
  load(): RunSession | null                         // validated AND restorable, else discarded and null (FR-12.4)
  clear(): void                                     // FR-12.5 completed or abandoned
  static validate(value: unknown): RunSession | null
  static restore(run: { readonly seed: number; readonly actions: readonly unknown[] }): Game | null  // replay through Game; null on any GameError
  static isUserAction(value: unknown): value is RecordedAction
}
```
Rules:
- `begin` only remembers the session; the first successful `record` (or an explicit `save()`, as `App.start` does today) writes it. If `begin` wrote at once, opening a friend's link would overwrite the run in progress before the player did anything, and an untouched page would be "restored" next time instead of offering a new window.
- `record` writes nothing when `targetRound !== 1` (the dev fast-forward demo is never stored, as today).
- `load` returns a session only if `validate` accepts it **and** `restore` can replay it; otherwise it calls `clear()` and returns `null`, so the caller starts a new run and the bad record is not appended to (FR-12.4).
- `record` is wired to `GameController`'s `onAction` option (prompt 50), which fires only for an action that took effect, so illegal attempts are never stored. Non-user events (`DIE_PLACED`, `ROUND_COMPLETED`, `BEAM_ANIMATION_DONE`, `PAUSE`, `RESUME`) are ignored by `record` and by `validate`'s replay filter (keep the reference test "ignores animation and internal orchestration events").
- `useGame`'s `send` stops recording when `can()` is true; it passes `onAction: (action) => recorder.record(action)` to its `GameController` (a refused placement is never stored).
- `restore`: `new Game(createGameConfig(session.seed))`; skip non-user events (`isUserAction`); for each remaining action call `choosePattern`, `selectDie`, `placeDie`, `cancelSelection`, `refreshDraft`; then apply the forfeit loop. Catch only `GameError` (return `null`); any other exception propagates.
- No method throws on storage failure (private browsing, quota): return `false`/`null` (FR-12.6). Document each `@returns` and the one `@throws` (non-`GameError` from `Game`).
- Strangler shim: `src/hooks/runSession.ts` keeps its four exported functions as one-line delegates (`replaySession(seed: number, actions: readonly { readonly type: string }[]): Game` → `RunRecorder.restore({ seed, actions })`, throwing `GameError({ kind: 'invalidArgument', detail: 'recorded run cannot be replayed' })` when it is `null`; `loadSession` already refuses such a record, so the app never reaches that) and re-exports `RunSession`. Export the class from `src/progression/index.ts`.
- Tighten ESLint `jsdoc/require-jsdoc` to include `src/progression/RunRecorder.ts`.

**Class test** `tests/progression/RunRecorder.test.ts` — **criterion: input-domain partitioning** of stored records plus branch coverage of `record`/`load`. Fresh recorder and in-memory storage per test; no control flow inside a test (auto-play in a helper):

| Id | Case | Expected |
|---|---|---|
| R1 | NFR-1.7: seed 3 auto-played into round 3 with one recast, every `onAction` recorded, `restore` | `roundScores`, `totalScore`, `window.dice`, `hand`, `draftPool.dice`, `refreshesRemaining`, `placementsRemaining` equal the original |
| R2 | seed 7 Clerestory, blue 1 at `{row:3,col:3}` | restored run is in round 2 with the same round score |
| R3 | full golden action list | `totalScore` 156 |
| R4 | a rule-violating record (a `PLACE_DIE` on an occupied cell) | `restore` `null`; `load` `null` and the key removed |
| R5 | unknown pattern id | `restore` `null` |
| R6 | 1001 actions; out-of-range position; unknown die color (`it.each`) | `validate` `null` |
| R7 | `begin` | storage still empty; after the first `record` it holds one action |
| R8 | `begin` over a stored run, nothing recorded | the stored run is unchanged |
| R9 | `targetRound: 5` then `record` | storage empty |
| R10 | storage that throws on every call | `record` and `save` `false`, `load` `null`, `clear` does not throw |
| R11 | non-user events in the list (`BEAM_ANIMATION_DONE`, `PAUSE`) | same game as without them |
| R12 | a `RangeError` thrown by the model during `restore` (`vi.spyOn(Game.prototype, 'choosePattern')`) | propagates (`toThrow(RangeError)`) |

### 3. Verification Protocol
```bash
pnpm vitest run tests/hooks/runSession.test.ts tests/progression/RunRecorder.test.ts   # 10/10 unchanged + R1–R12
pnpm typecheck && pnpm lint && pnpm test && pnpm e2e   # e2e incl. phase8/phase9 restore specs
pnpm vitest run -t "golden"                       # 156
pnpm check:classes                                # ≥ 34
grep -n "xstate\|@controller" src/progression/RunRecorder.ts   # 0
git commit -am "feat(progression): inc 55 RunRecorder" && git tag inc-55-green
```
- [ ] `tests/progression/RunRecorder.test.ts` R1–R12 pass (R1 is NFR-1.7, R2 the deadlock replay)
- [ ] Tracking: typecheck 0, lint 0/0, unit 100 %, golden exact, e2e 100 %, classes ≥ 34

### 4. CRITICAL Checkpoint
- **Risk:** replay without the statechart diverges from live play (missed automatic forfeit, ordering of re-selection). **Failure indicators:** restored round number lower than live; restored run forfeits at a different round; AT-10 restore shows a different board; stored illegal actions now reject previously restorable sessions.
- **Isolation testing protocol:**
  1. Simplified config: replay only `CHOOSE_PATTERN` + one `SELECT_DIE`; compare `hand`.
  2. Components separately: `validate` with the reference malformed inputs; `restore` with a full golden action list (must reach 156); deadlock replay with seed 7.
  3. Interaction effects: swap the shim into `useGame`/`App`, play to round 3 in `pnpm dev`, reload without `?seed=`, compare screenshots before/after.
- **Rollback procedure:** `git reset --hard inc-54-green`; keep the machine-based replay in the shim until the equivalence check passes.

---

**CRITICAL: `RunRecorder` records only admitted actions, treats stored data as untrusted, and restores by replaying through `Game` (including the automatic forfeit) with no XState or controller import; restored runs equal uninterrupted ones. Golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
