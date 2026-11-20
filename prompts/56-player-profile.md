# Prompt 56: PlayerProfile

**CRITICAL: Create the immutable value class `PlayerProfile` in `src/progression` that wraps the existing profile record (XP, level, shards, bests, achievements, daily progress) and exposes the pure reward functions of `profile.ts` as methods. Every rule and number stays exactly as in the reference; no profile value may ever reach the model (FR-13.11). Golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**

---

### INCREMENT 56: PlayerProfile
- **Status:** Standard
- **Dependencies:** Prompts 02, 55
- **Reference implementation:** `src/progression/profile.ts` (`createProfile`, `getLevel` 250 XP/level, `claimDailyReward` 50 shards, `getStreak`, `getDailyQuests`, `recordRun`, `unlockedPalettes`, `selectPalette`, `purchasePalette`, `loadProfile`, `saveProfile`, `isProfile`) and `tests/progression/profile.test.ts` (14 blocks)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` sections 4 (row 28), 5
- **Requirements:** FR-13.1–FR-13.11, FR-14.1–FR-14.6, FR-15.5–FR-15.10, NFR-1.6, NFR-2.6

### MANDATORY: Sandwich Requirement
- **Start:** The interface currently named `PlayerProfile` in `profile.ts` is renamed `ProfileData` (the class takes the name); update the one type import in `src/App.tsx`. All free functions keep their signatures over `ProfileData`.
- **End:** `tests/progression/profile.test.ts` passes unchanged and a new class test proves each method returns the same data as its function.

---

### 1. Capability Specification
- **Adds:** class #28 (`src/progression/PlayerProfile.ts`), exported from `src/progression/index.ts`; `tests/progression/PlayerProfile.test.ts`.
- **Unchanged:** storage key `rose-window.profile.v1`, `PROFILE_VERSION 1`, `ACHIEVEMENTS`, `PALETTES`, quest table, validation (`isProfile`), reward amounts.

### 2. Implementation Instructions
```ts
// src/progression/PlayerProfile.ts   (imports ./profile only)
export interface RecordOutcome {
  readonly profile: PlayerProfile; readonly recorded: boolean; readonly xpEarned: number
  readonly shardsEarned: number; readonly newAchievements: readonly AchievementId[]; readonly isPersonalBest: boolean
}
export class PlayerProfile {
  readonly #data: ProfileData
  private constructor(data: ProfileData)
  static create(): PlayerProfile                                   // createProfile()
  static from(value: unknown): PlayerProfile | null                // isProfile guard; null if invalid
  static load(storage?: Pick<StorageLike, 'getItem'>): PlayerProfile   // never throws (NFR-1.6)
  save(storage?: Pick<StorageLike, 'setItem'>): boolean            // false on blocked storage/quota
  toData(): ProfileData
  get xp(): number; get shards(): number; get bestScore(): number; get bestBeam(): number
  get totalRuns(): number; get selectedPalette(): PaletteId; get achievements(): readonly AchievementId[]
  get level(): { level: number; currentXp: number; requiredXp: number; progress: number }
  claimDailyReward(date: Date): { profile: PlayerProfile; claimed: boolean; shards: number }
  streak(date: Date): number
  dailyQuests(date: Date): readonly DailyQuest[]
  recordRun(result: RunResult): RecordOutcome
  unlockedPalettes(): readonly PaletteId[]
  selectPalette(id: PaletteId): PlayerProfile
  purchasePalette(id: PaletteId): { profile: PlayerProfile; purchased: boolean;
    reason: 'purchased' | 'already-unlocked' | 'insufficient-shards' | 'unknown-palette' }
}
```
Rules:
- Each method is a one-line delegate to the function in `profile.ts` wrapping the returned `ProfileData` in a new `PlayerProfile` (immutability: the receiver never changes; `Object.freeze` the wrapped data).
- Dates are always injected; no method reads the clock or `localStorage` except `load`/`save` through the optional storage parameter.
- `@throws` documentation: `claimDailyReward`, `streak`, `dailyQuests` throw `Error('A valid date is required')` for an invalid `Date` (from `dailyKey`); `recordRun` throws `Error('Invalid completed run')`. Keep these messages — the reference tests match them. Progression is not model code, so the `GameError` rule does not apply; say so in the class TSDoc.
- Add `src/progression/PlayerProfile.ts` to the `jsdoc/require-jsdoc` file list.

**Class test** `tests/progression/PlayerProfile.test.ts` — **criterion: input-domain partitioning** per method (valid/invalid date; new/duplicate run id; palette locked/unlocked/affordable/unaffordable/unknown; storage valid/corrupt/unavailable). Fresh profile per test, literal expected values, no control flow:
- P1 `create().xp === 0`, `level.level === 1`; P2 XP 249 → level 1, 250 → level 2 (via `from`); P3 `claimDailyReward` twice same UTC day → shards 50 then claimed `false`; P4 invalid date → `toThrow('valid date')`; P5 `recordRun` same id twice → second `recorded false`; P6 invalid run → `toThrow('Invalid completed run')`; P7 purchase each reason (4 rows, `it.each`); P8 `load` of corrupt JSON → equals `create().toData()`; P9 `save` with throwing storage → `false`; P10 receiver unchanged after `recordRun` (`xp` before === after); P11 `from({})` → `null`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/progression   # profile.test.ts 14 blocks unchanged + PlayerProfile.test.ts 14 cases
pnpm typecheck && pnpm lint && pnpm test && pnpm e2e
pnpm vitest run -t "golden"         # 156 (FR-13.11: progression never alters scores)
pnpm check:classes                  # ≥ 35
git commit -am "feat(progression): inc 56 PlayerProfile" && git tag inc-56-green
```
- [ ] `grep -rn "interface PlayerProfile" src` → 0; `grep -rn "@model\|engine/" src/progression/PlayerProfile.ts` → 0
- [ ] Tracking: typecheck 0, lint 0/0, unit 100 %, golden exact, e2e 100 %, classes ≥ 35

---

**CRITICAL: `PlayerProfile` is an immutable class over the unchanged, validated profile record and reward rules; nothing in it can influence dice, rules or scores. Golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
