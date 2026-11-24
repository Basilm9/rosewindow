# Prompt 74: AT-13 Audio Control

**CRITICAL: Create `tests/e2e/acceptance/at13-audio.spec.ts` whose automated part checks the sound calls (none before the first interaction, distinct sounds for select, place and beam strike, none while muted, mute kept after reload); a human then confirms the sounds audibly.**

---

### INCREMENT 74: AT-13 acceptance test
- **Status:** Standard
- **Dependencies:** Prompts 59 (`src/util/sfx.ts`), 62 (harness), 58
- **Reference implementation:** `src/util/sfx.ts` (WebAudio, unlocked on first `pointerdown`/`keydown`; `pickup` 620/930 Hz triangle, `place` 260/120/1760/2637 Hz, `strike` sine from 523.25 Hz; mute stored as `rosewindow-muted`), `src/view/ScorePanel.tsx` (`sound-toggle`, aria `mute sounds` / `unmute sounds`), `tests/e2e/phase9.spec.ts` ("sound toggle persists")
- **Context to attach:** `acceptance_tests.md` row AT-13, `mockups/02-board-round1.png`
- **Requirements:** FR-10.1 to 10.4

### MANDATORY: Sandwich Requirement
- **Start:** Fresh page load in a clean context; the app has no test hook for sound, so the spec observes the WebAudio calls by wrapping `AudioContext` in `page.addInitScript` (test-only, no production change).
- **End:** Automated assertions pass, two screenshots of the audio control, and a `results.md` row marked "automated Pass, audible check pending" until a human confirms.

### 1. Capability Specification
One acceptance spec plus a manual checklist in the results row. No production change.

### 2. Implementation Instructions
```typescript
// tests/e2e/acceptance/at13-audio.spec.ts
await page.addInitScript(() => {
  const log: { t: number; type: string; freq: number }[] = [];
  (window as any).__sfx = log;
  const Native = window.AudioContext;
  window.AudioContext = class extends Native {
    createOscillator() {
      const osc = super.createOscillator();
      const set = osc.frequency.setValueAtTime.bind(osc.frequency);
      osc.frequency.setValueAtTime = (v: number, t: number) => { log.push({ t: performance.now(), type: osc.type, freq: Math.round(v) }); return set(v, t); };
      return osc;
    }
  } as typeof AudioContext;
});
const sfxSince = (page: Page, mark: number) => page.evaluate((m) => (window as any).__sfx.slice(m), mark);
```
**URL:** `/?seed=3` (sound-call checks are seed-independent; the seed keeps the beam deterministic).

1. **Load and wait:** `goto('/?seed=3')`, wait 2 s; `__sfx` is empty (no sound before the first interaction).
2. **Select, place, beam:** click `pattern-novice-rose` (first gesture), then mark and, with the replica's `bestPair`, click the die → expect frequencies 620 and 930 (`pickup`); click the cell → expect 260 and 2637 (`place`); place the second die and wait for `beam-layer` `data-settled="true"` → expect at least one sine starting at 523 (`strike`). Assert the three sets are pairwise different (distinct sounds). Shot `audio-on` → `MOCKUP.board` with `sound-toggle` aria `mute sounds`.
3. **Mute:** click `sound-toggle`; aria `unmute sounds`. Shot `audio-off` → `MOCKUP.board`.
4. **Reload and repeat 2:** `page.goto('/?seed=3')` (fresh run, same storage); after choosing the pattern `sound-toggle` still reads `unmute sounds`; mark, repeat select/place/beam; `sfxSince(mark)` is empty. Also assert `localStorage['rosewindow-muted'] === '1'`.
5. `logResult({ at: 'AT-13', result: 'Pass (automated); audible check pending', … })` and add to notes a manual checklist: "On a device with speakers: no sound on load; select, place and beam strike sound different; muted stays silent after reload. Tester / date / result." A human replaces "pending" with Pass or Fail F-nn. Compare the shots with the HUD of `02-board-round1.png` (♪ control top right).

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm e2e:acceptance -g "AT-13" && pnpm e2e
```
- [ ] Zero sound calls before the first gesture and while muted
- [ ] Select, place and strike frequencies distinct
- [ ] Mute persists across reload
- [ ] `docs/acceptance/AT13/01-audio-on.png`, `02-audio-off.png`; manual check listed in `results.md`
- [ ] Tracking matrix green; commit `test(e2e): inc 74 AT-13 audio`, tag `inc-74-green`

---

**CRITICAL: Automated checks prove the sound calls; a human confirms audibly; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
