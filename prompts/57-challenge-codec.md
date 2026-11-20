# Prompt 57: ChallengeCodec

**CRITICAL: Create `ChallengeCodec` in `src/progression` that encodes and decodes versioned friend-challenge codes (`RW1.<seed36>.<patternId>.<target36>.<check>`) and derives the daily window, using the model only to confirm the seed really offers the pattern. Malformed, altered or unsupported codes are refused (FR-16.4) and a code can never change rules or scores (FR-16.6). Golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**

---

### INCREMENT 57: ChallengeCodec
- **Status:** Standard
- **Dependencies:** Prompts 47, 56
- **Reference implementation:** `src/progression/challenges.ts` (`CHALLENGE_RULESET = 'classic-v1'`, `FriendChallenge`, `validChallenge`, `dailyChallenge`, `createChallenge`, FNV-1a `checksum`, `encodeChallenge`, `decodeChallenge`, `challengeUrl`) and `tests/progression/challenges.test.ts` (7 blocks, including one `it.each` of 8 inputs)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` sections 4 (row 29), 5; `ctxt/acceptance_tests.md` AT-14, AT-15
- **Requirements:** FR-15.2, FR-15.3, FR-16.1–FR-16.7, NFR-2.6, NFR-2.7

### MANDATORY: Sandwich Requirement
- **Start:** Code grammar, bounds and checksum are copied exactly: regex `^RW1\.[0-9a-z]{1,7}\.[a-z][a-z0-9-]{0,63}\.[0-9a-z]{1,4}\.[0-9a-z]{1,7}$`, input ≤ 2048 chars, seed 0…0xffffffff, target 0…1 000 000, canonical base-36 round-trip, exactly one `challenge` URL parameter, http/https only.
- **End:** `tests/progression/challenges.test.ts` passes unchanged and `decode(encode(c))` `toEqual(c)` for the seed-3 example.

---

### 1. Capability Specification
- **Adds:** class #29 (`src/progression/ChallengeCodec.ts`), exported from `src/progression/index.ts`; `tests/progression/ChallengeCodec.test.ts`.
- **Changes:** `challenges.ts` functions become one-line delegates to a module-level `const codec = new ChallengeCodec()`; imports switch from `../engine/*` to `@model` (`Game`, `createGameConfig`).
- **Unchanged:** `FriendChallenge` shape, ruleset string, every error message.

### 2. Implementation Instructions
```ts
// src/progression/ChallengeCodec.ts   (imports: @model, ./profile)
/** Returns the pattern ids a seed offers; injected so tests can avoid building a Game. */
export type OfferedPatterns = (seed: number) => readonly string[]
export class ChallengeCodec {
  static readonly VERSION = 1
  static readonly PREFIX = 'RW1'
  static readonly RULESET = CHALLENGE_RULESET
  static readonly MAX_INPUT = 2048
  static readonly MAX_TARGET = 1_000_000
  readonly #offered: OfferedPatterns
  constructor(offered?: OfferedPatterns)     // default: seed => new Game(createGameConfig(seed)).offeredPatterns.map(p => p.id)
  create(input: { seed: number; patternId: string; targetScore: number }): FriendChallenge
  encode(challenge: FriendChallenge): string
  decode(input: string): FriendChallenge | null
  shareUrl(challenge: FriendChallenge, baseUrl: string): string
  daily(date: Date): { date: string; seed: number; patternId: string }   // dailySeed/dailyKey, first offered pattern
  isValid(challenge: FriendChallenge): boolean
  #checksum(text: string): string           // FNV-1a 32-bit, base 36 — typo detection only, NOT authentication
}
```
Rules:
- `create` and `encode` throw `Error('Invalid friend challenge')`; `shareUrl` throws `Error('An HTTP(S) URL is required')`; `daily` propagates `dailyKey`'s invalid-date error. Document each with `@throws`. `decode` never throws: any failure returns `null` (FR-16.4 — the view says so; AT-15 step 3).
- `decode` order (keep): type/length check → URL unwrapping (`challenge` param exactly once) → regex → checksum → canonical base-36 round-trip → `isValid` (model confirms the pattern is offered).
- `shareUrl` clears all other parameters and the hash (FR-16.7 carries only the code).
- TSDoc on all members; document at `#checksum` that it is deliberately not a signature. Add the file to the `jsdoc/require-jsdoc` list.

**Class test** `tests/progression/ChallengeCodec.test.ts` — **criterion: input-domain partitioning** of `decode` input (valid code, valid URL, each malformed partition) and branch coverage of `create`/`shareUrl`. Fresh codec per test; inject `offered = () => ['novice-rose', 'lancet']` except in D1 and D9.

| Id | Input | Expected |
|---|---|---|
| D1 | `encode(create({seed:3, patternId: <real offered>, targetScore:90}))` round trip (real model) | `toEqual` original |
| D2 | same code wrapped in `https://x.example/?challenge=<code>` with spaces around | equal |
| D3 | version `RW2…` | `null` |
| D4 | one changed checksum character | `null` |
| D5 | `'javascript:alert(1)'` | `null` |
| D6 | two `challenge` params | `null` |
| D7 | 2049-char input | `null` |
| D8 | pattern not offered (`offered` returns `['lancet']`) | `null` |
| D9 | `daily` at 00:00:00.000Z and 23:59:59.999Z same date (real model) | equal results |
| C1 | `create` target −1 / Infinity / seed 0x100000000 (`it.each`) | `toThrow('Invalid friend challenge')` |
| C2 | `shareUrl(c, 'javascript:alert(1)')` | `toThrow('HTTP(S)')` |
| C3 | `shareUrl(c, 'https://x.example/?seed=3#a')` | search is exactly `?challenge=…`, no hash |

### 3. Verification Protocol
```bash
pnpm vitest run tests/progression     # challenges.test.ts unchanged + 14 ChallengeCodec cases, 100 %
pnpm typecheck && pnpm lint && pnpm test && pnpm e2e
pnpm vitest run -t "golden"           # 156
pnpm check:classes                    # ≥ 36
grep -n "engine/" src/progression/*.ts   # 0
git commit -am "feat(progression): inc 57 ChallengeCodec" && git tag inc-57-green
```
- [ ] Tracking: typecheck 0, lint 0/0, unit 100 %, golden exact, e2e 100 %, classes ≥ 36

---

**CRITICAL: `ChallengeCodec` encodes, validates and decodes challenge codes exactly as the reference does, refuses every altered or unsupported code without throwing, and only reads the model to confirm the offered pattern. Golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
