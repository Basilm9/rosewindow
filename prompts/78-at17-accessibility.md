# Prompt 78: AT-17 Accessibility

**CRITICAL: Create `tests/e2e/acceptance/at17-accessibility.spec.ts` that uses Playwright's accessibility snapshot and emulated reduced motion to prove the window is a grid of rows whose cells report row, column (from 1) and contents, every button has a descriptive name, values read as numerals without colour, and the beam result appears without non-essential animation.**

---

### INCREMENT 78: AT-17 acceptance test
- **Status:** Standard
- **Dependencies:** Prompts 58 (fixes F-03: `role="row"` elements, 1-based cell labels), 62 (harness)
- **Reference implementation:** `src/view/GlassBoard.tsx` (`role="grid"` `glass-board`, `role="gridcell"` with `aria-rowindex`/`aria-colindex` and label `row R, column C, …`), `src/view/Die.tsx` (`.glass-die__value` numeral), `src/index.css` (`@media (prefers-reduced-motion: reduce)` → 1 ms animations), `tests/e2e/phase7.spec.ts` (`?seed=3&round=3` mid-game)
- **Context to attach:** `acceptance_tests.md` row AT-17 and the known-faults note (F-03), `mockups/02-board-round1.png`, `mockups/05-beam.png`
- **Requirements:** NFR-5.3 to 5.6

### MANDATORY: Sandwich Requirement
- **Start:** Context created with `reducedMotion: 'reduce'`, viewport 1280×900; URL `/?seed=3&round=2` (round 2 with dice placed, built by the auto-player fast-forward).
- **End:** The accessibility tree excerpt is saved as a file and a screenshot, colour-blind views are captured, the reduced-motion beam is checked, and the row is in `docs/acceptance/results.md`.

### 1. Capability Specification
One acceptance spec; no production change. If the grid still lacks row elements or counts from 0, the result is **Fail F-03** (the open fault), not a new ID.

### 2. Implementation Instructions
```typescript
// tests/e2e/acceptance/at17-accessibility.spec.ts
test.use({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
const VISION = ['deuteranopia', 'protanopia', 'tritanopia', 'achromatopsia'] as const;
```
1. **Inspect the accessibility tree:** wait for `round-indicator` `ROUND 2/8`. `const tree = await page.getByTestId('glass-board').ariaSnapshot()`; write it to `docs/acceptance/AT17/a11y-tree.yml` and take shot `a11y-tree` → `MOCKUP.board`. Assert:
   - `getByRole('grid')` has 4 `getByRole('row')` children, each with 4 `gridcell`s.
   - For every cell at test id `cell-r<r>c<c>` (test ids stay 0-based): `aria-rowindex` = r+1, `aria-colindex` = c+1, and its accessible name starts `row <r+1>, column <c+1>,` and then names either `<color> <value> die` or `empty` plus its printed demand.
   - Every `getByRole('button')` has a non-empty accessible name that is not a bare symbol (≥ 3 letters); collect offenders and assert the list is empty.
2. **Colour-blindness simulation:** `const cdp = await page.context().newCDPSession(page)`; for each of `VISION` call `Emulation.setEmulatedVisionDeficiency({ type })` and take shot `vision-<type>` → `MOCKUP.board`. Assert for every placed die that `.glass-die__value` is visible and its text equals the value in the cell's label, so values read as numerals without colour. Reset with `type: 'none'`.
3. **Place a die and fire the beam:** with the replica `fastForward(3, 2)` place both round-2 dice from `bestPair` (clicked as in the harness `playMoves`). After the second placement, sample `document.getAnimations()` every 100 ms until `beam-layer` has `data-settled="true"`; record the longest running animation duration and the time to settle. Assert no CSS animation or transition runs longer than 1 ms and that `round-scores` shows the replica's round-2 score. Shot `reduced-motion-beam` → `MOCKUP.beam`. If the beam is still stepped by JavaScript timers, note the elapsed time for the reviewer to judge "non-essential animation".
4. `logResult` with URL `/?seed=3&round=2`, `reducedMotion: reduce`, the tree file path and the animation measurements. Compare with `02-board-round1.png` and `05-beam.png` (same layout; animation reduced, not content).

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm e2e:acceptance -g "AT-17" && pnpm e2e
```
- [ ] Grid → 4 rows → 16 cells; labels and indexes count from 1 (F-03 closed)
- [ ] All buttons named; numerals visible under each simulated deficiency
- [ ] No animation > 1 ms under reduced motion; round-2 score matches replica
- [ ] `docs/acceptance/AT17/a11y-tree.yml`, `01-a11y-tree.png`, `02…05-vision-*.png`, `06-reduced-motion-beam.png`
- [ ] Tracking matrix green; commit `test(e2e): inc 78 AT-17 accessibility`, tag `inc-78-green`

---

**CRITICAL: The window is an accessible grid of rows with 1-based cell labels, every control is named, values never rely on colour, and reduced motion is honoured; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
