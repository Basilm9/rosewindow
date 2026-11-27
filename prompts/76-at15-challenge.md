# Prompt 76: AT-15 Challenge Another Player

**CRITICAL: Create `tests/e2e/acceptance/at15-challenge.spec.ts` proving Challenge on the final report copies a link that carries only the challenge code, that the link starts the same seed and pattern with the score to beat in a second browser without the first browser's profile, and that a one-character change to the code is refused with a message.**

---

### INCREMENT 76: AT-15 acceptance test
- **Status:** Standard
- **Dependencies:** Prompts 57 (ChallengeCodec), 56, 62 (harness), 58
- **Reference implementation:** `src/progression/ChallengeCodec.ts` (code `RW1.<seed36>.<patternId>.<target36>.<check>`, `?challenge=` parameter), `src/App.tsx` (`share`: `navigator.share` else clipboard + toast "Challenge link copied. Send it to a friend."; bad code toast "That challenge link is incomplete…"), `GameOverScreen.tsx` (`share-result`), `SetupScreen.tsx` (chip `Beat N`), `tests/e2e/mobile.spec.ts`
- **Context to attach:** `acceptance_tests.md` row AT-15, `mockups/11-challenge-share.png`, `mockups/01-setup.png`, `mockups/09-final-report.png`
- **Requirements:** FR-16.1 to 16.5, 16.7; FR-13.10, 13.11

### MANDATORY: Sandwich Requirement
- **Start:** A completed full run in browser 1 (`/?seed=3`, Novice Rose, replica moves; a `?round=` preview run has no Challenge button and must not be used). Browser 2 is a separately launched browser with a clean profile.
- **End:** Toast, challenged run and rejection each screenshotted and checked; `results.md` row.

### 1. Capability Specification
One acceptance spec; no production change. To make the clipboard path deterministic, browser 1's init script removes `navigator.share`; the context is granted `clipboard-read` and `clipboard-write`. (The share-sheet path is covered by `tests/e2e/mobile.spec.ts`.)

### 2. Implementation Instructions
```typescript
// tests/e2e/acceptance/at15-challenge.spec.ts
await context1.grantPermissions(['clipboard-read', 'clipboard-write']);
await page1.addInitScript(() => { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); });
const linkFrom = (text: string) => new URL(text.match(/https?:\/\/\S+/)![0]);
test.setTimeout(240_000);
```
1. **Press Challenge:** play the run with `playMoves(page1, replica, 'end')`; read `score = report.total` from `final-total`'s aria `final score N`. Click `share-result`. `app-toast` reads `Challenge link copied. Send it to a friend.` Shot `toast` → `MOCKUP.challenge`. Read the clipboard with `page1.evaluate(() => navigator.clipboard.readText())`; `url = linkFrom(text)`. Assert `[...url.searchParams.keys()]` equals `['challenge']` (only the code), the code matches `^RW1\.`, and decoding it with `ChallengeCodec` gives seed 3, `novice-rose`, target `score`.
2. **Open in browser 2:** `const second = await browser.browserType().launch()`; fresh context; `goto(url.pathname + url.search)`. Assert one `pattern-novice-rose` card, `Window #3`, chip `Beat <score>`; `localStorage['rose-window.profile.v1']` is absent or has `totalRuns: 0` (none of browser 1's profile); choose the card; `glass-board` aria `Glass window pattern: Novice Rose`; the draft labels equal those of a fresh seed-3 Novice Rose replica. Shot `challenged-run` → `MOCKUP.setup` (setup) and `challenged-board` → `MOCKUP.board`.
3. **Altered code:** change one character of the check segment (replace it with another base-36 character) and `goto` the altered link in a fresh browser-2 context. Assert `app-toast` contains `incomplete`, the URL no longer has `challenge=`, no `Beat` chip, no `Daily window`/`Friend challenge` mode, and no `glass-board` (no run has started; the player is left on the setup screen to choose). A fresh profile may show the first-launch tutorial card on that setup screen: note it, it is not a started run. Shot `rejected` → `MOCKUP.setup`.
4. `logResult` with the copied link (code included), the altered link and notes. Compare `11-challenge-share.png` (toast wording/position), `01-setup.png` (Beat chip) and `09-final-report.png` (Challenge button).

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm e2e:acceptance -g "AT-15" && pnpm e2e
```
- [ ] Link carries only `?challenge=<code>`; code decodes to seed 3 / novice-rose / score
- [ ] Browser 2 gets the same seed and pattern with "Beat N" and an empty profile
- [ ] Altered code refused with a message; no unrelated run
- [ ] `docs/acceptance/AT15/01-toast.png` … `04-rejected.png`
- [ ] Tracking matrix green; commit `test(e2e): inc 76 AT-15 challenge`, tag `inc-76-green`

---

**CRITICAL: Challenge links are code-only, reproduce seed and pattern exactly, never carry the profile, and reject tampered codes; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
