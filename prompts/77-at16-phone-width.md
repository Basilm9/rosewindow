# Prompt 77: AT-16 Play a Round at Phone Width

**CRITICAL: Create `tests/e2e/acceptance/at16-phone-width.spec.ts` that plays one round by tapping at 360×640 with touch and again at 1920×1080, proving there is no scrolling, everything needed is in view and usable with single taps, every control is at least 24×24 px at 360 px, and the beam and menus fit on screen.**

---

### INCREMENT 77: AT-16 acceptance test
- **Status:** Standard
- **Dependencies:** Prompts 58 (views, mockups authoritative), 62 (harness)
- **Reference implementation:** `tests/e2e/mobile.spec.ts` (`hasTouch`, no-scroll check, `draft-pool` bottom), `src/view/*` test ids (`objectives`, `goals-sheet`, `close-dialog`, `game-menu`, `pause-menu`, `menu-resume`, `beam-total`, `round-indicator`, `draft-pool`, `refresh-dice`, `sound-toggle`)
- **Context to attach:** `acceptance_tests.md` row AT-16, `mockups/02-board-round1.png`, `mockups/03-legal-preview.png`, `mockups/05-beam.png`, `mockups/06-goal-sheet.png`, `mockups/07-pause-menu.png` (all captured at phone width)
- **Requirements:** NFR-5.7, NFR-5.10 to 5.13

### MANDATORY: Sandwich Requirement
- **Start:** Two Playwright projects or `test.use` blocks: `{ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true }` and `{ viewport: { width: 1920, height: 1080 } }`; every interaction at 360 px uses `locator.tap()`, never `click()`.
- **End:** Each step screenshotted at 360 px and the board at 1920 px; layout checks pass at both sizes; `results.md` row per size.

### 1. Capability Specification
One acceptance spec with one parameterised test per size; no production change.

### 2. Implementation Instructions
```typescript
// tests/e2e/acceptance/at16-phone-width.spec.ts
const SIZES = [{ name: '360', viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true },
               { name: '1920', viewport: { width: 1920, height: 1080 } }] as const;
const MUST_SEE = ['glass-board', 'draft-pool', 'beam-total', 'round-indicator', 'game-menu',
                  'sound-toggle', 'refresh-dice', 'objectives'] as const;
async function noScroll(page: Page): Promise<boolean>;         // scrollHeight<=innerHeight+1 && scrollWidth<=innerWidth+1
async function inView(page: Page, id: string): Promise<boolean>; // bounding box fully inside the viewport
async function smallControls(page: Page): Promise<string[]>;   // buttons / [role=gridcell] visible with width or height < 24
```
For each size, URL `/?seed=3`, Novice Rose; after every step assert `noScroll`, and on the board assert every `MUST_SEE` id is `inView` plus the `N left to place this round` label. At 360 px also assert `smallControls(page)` is empty (list offenders in the failure message).

1. **Start:** tap `pattern-novice-rose` (360) / click (1920). Shot `board` → `MOCKUP.board`.
2. **Goal sheet:** tap `objectives`; `goals-sheet` fully in view; tap `close-dialog`. Shot `goals` → `MOCKUP.goals`.
3. **Draft and place two dice by tapping:** for each `bestPair(replica)` move, tap `select <color> <value>` then tap the cell, each exactly once; assert each tap took effect (held die appears, then `die-r…c…` appears). Shot after the first tap `holding` → `MOCKUP.legal`.
4. **Watch the beam:** `beam-layer` bounding box inside the viewport; wait for `data-settled="true"`; `round-scores` shows `round 1 scored 5`. Shot `beam` → `MOCKUP.beam`.
5. **Pause menu:** tap `game-menu`; `pause-menu` fully in view and `menu-resume` `inView`; tap `menu-resume`. Shot `pause` → `MOCKUP.pause`.
6. At 1920 px take only the `board` shot (plus any failing step) with filenames prefixed `1920-`; at 360 px prefix `360-`.
7. `logResult` once per size (`AT-16 360×640 touch`, `AT-16 1920×1080`) with URL `/?seed=3`; notes list any small controls or off-screen elements. Compare the 360 px shots with the mockups (they are phone-width captures: same layout, wording, spacing).

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm e2e:acceptance -g "AT-16" && pnpm e2e
```
- [ ] No scrolling at 360×640 or 1920×1080
- [ ] All `MUST_SEE` elements in view; single taps work
- [ ] No control under 24×24 px at 360 px
- [ ] `docs/acceptance/AT16/01-360-board.png` … and `NN-1920-board.png`
- [ ] Tracking matrix green; commit `test(e2e): inc 77 AT-16 phone width`, tag `inc-77-green`

---

**CRITICAL: One screen, no scrolling, single taps, ≥ 24×24 px controls from 360 to 1920 px; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
