# Prompt 70: AT-09 Recast the Draft

**CRITICAL: Create `tests/e2e/acceptance/at09-recast.spec.ts` proving one recast per run returns the showing dice and the held die to the bag, deals fresh dice, keeps the round and the placements left, and refuses a second recast.**

---

### INCREMENT 70: AT-09 acceptance test
- **Status:** Standard
- **Dependencies:** Prompts 25 (DraftPool), 47 (`Game.refreshDraft`), 62 (harness), 58
- **Reference implementation:** `src/view/DraftPool.tsx` (`refresh-dice`, aria `Reroll dice, N left`, badge `.tray__badge`, `held-die`, `draft-die-<i>`), `src/model/Game.ts` (`refreshDraft`, `refreshesRemaining`, violation `refreshSpent`)
- **Context to attach:** `acceptance_tests.md` row AT-09, `mockups/02-board-round1.png`, `mockups/03-legal-preview.png`
- **Requirements:** FR-11.1, 11.3, 11.5, 11.6, 11.8; NFR-6.4

### MANDATORY: Sandwich Requirement
- **Start:** Fresh run `/?seed=3`, Novice Rose, start of round 1, recast unused; the expected fresh dice come from a replica given the same actions.
- **End:** Counts 4/1 → 3+1 → 1 left → 4 fresh, 0 in hand → 0 left and refused; three screenshots; `results.md` row.

### 1. Capability Specification
One acceptance spec; no production change. NFR-6.4 (dice conservation) is checked through the replica: the bag plus draft plus hand plus window still holds every die.

### 2. Implementation Instructions
```typescript
// tests/e2e/acceptance/at09-recast.spec.ts
const replica = fastForward(3, 1); replica.choosePattern('novice-rose');
const draftLabels = (page: Page) => page.locator('button[data-testid^="draft-die-"]')
  .evaluateAll((b) => b.map((e) => e.getAttribute('aria-label')!).sort());
```
**URL:** `/?seed=3` → `pattern-novice-rose`.

1. **Place a die:** take `bestPair(replica)`, perform it in UI and replica. Assert 4 `draft-die-*`, label `1 left to place this round`.
2. **Hold a second die:** click `draft-die-0`; parse its aria-label `select <color> <value>` and mirror with `replica.selectDie`. Assert 3 `draft-die-*`, `held-die` visible. Shot `before` → `MOCKUP.legal`.
3. **Check the recast control:** `refresh-dice` enabled, aria `Reroll dice, 1 left`, badge `1`.
4. **Recast:** click `refresh-dice`; call `replica.refreshDraft()`. Assert: `held-die` count 0; 4 `draft-die-*`; `draftLabels(page)` equals the sorted labels of `replica.draftPool.dice`; `round-indicator` `ROUND 1/8`; label `1 left to place this round`; the placed die from step 1 is still on its cell. Replica check (NFR-6.4): bag + draft + window dice count equals the starting total. Shot `after-recast` → `MOCKUP.board`.
5. **Check and try again:** aria `Reroll dice, 0 left`, badge `0`, `refresh-dice` disabled. Snapshot `draftLabels` and the 16 `gridcell` labels, then `click({ force: true })` on `refresh-dice`; assert both snapshots unchanged and `expect(() => replica.refreshDraft()).toThrow(GameError)` (violation `refreshSpent`). Shot `refused` → `MOCKUP.board`.
6. `logResult` with URL `/?seed=3`; notes list the dice before and after. Compare PNGs with `02-board-round1.png` (recast button with count badge in the tray) and `03-legal-preview.png`.

**Note:** the row describes the second recast as "refused"; the build shows this as a disabled control without a message. Record that observation in the notes; it is a Pass unless a recast actually happens.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm e2e:acceptance -g "AT-09" && pnpm e2e
```
- [ ] Draft/hand counts match the row at every step
- [ ] UI dice after recast = replica dice; die conservation holds
- [ ] `docs/acceptance/AT09/01-before.png`, `02-after-recast.png`, `03-refused.png`
- [ ] Tracking matrix green; commit `test(e2e): inc 70 AT-09 recast`, tag `inc-70-green`

---

**CRITICAL: One recast per run, held die returned, round and placements unchanged, second recast refused; golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
