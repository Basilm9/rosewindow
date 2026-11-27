# Prompt 59: Utilities and Legacy Removal

**CRITICAL: Move `sfx` and the auto-player into `src/util`, move the two view-only hooks into `src/view/hooks`, then delete the strangler shims in `src/engine`, `src/machine`, `src/hooks`, `src/dev` and their old test folders — only after every old test has a ported counterpart. No behaviour change; golden master 5,5,31,16,2,7,53,37 / 156 unchanged and `pnpm check:classes` still ≥ 36.**

---

### INCREMENT 59: Util package and legacy shim removal
- **Status:** Standard
- **Dependencies:** Prompts 01–58 (all green)
- **Reference implementation:** `src/dev/sfx.ts`, `src/dev/autoPlayer.ts` (`legalPairs`, `bestPair`, `autoPlace`, `autoPlay`, `fastForward`), `src/hooks/useCountUp.ts`, `src/hooks/useTutorial.ts`; tests `tests/helpers/autoPlayer.ts`, `tests/e2e/beam-resume.spec.ts` (imports the auto-player)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` sections 4 (Utility), 5
- **Requirements:** NFR-4.1, NFR-4.2, NFR-4.5, FR-10.1–FR-10.4

### MANDATORY: Sandwich Requirement
- **Start:** Inventory first: record the current test count and list every `it`/`test` in `tests/engine`, `tests/machine`, `tests/hooks` with the file/test in `tests/model`, `tests/controller`, `tests/progression` that ports it.
- **End:** `src/` contains only `mvc`, `model`, `controller`, `view`, `progression`, `util`, `App.tsx`, `main.tsx`, CSS; nothing imports a deleted path.

---

### 1. Capability Specification
- **Moves:** `src/dev/sfx.ts` → `src/util/sfx.ts`; `src/dev/autoPlayer.ts` → `src/util/autoPlayer.ts` (imports `@model` only); `src/hooks/useCountUp.ts`, `useTutorial.ts` → `src/view/hooks/`.
- **Deletes:** `src/engine/*` (re-export shims, including `sample.ts` once its helpers live in `src/model`), `src/machine/*`, `src/hooks/useGame.ts`, `src/hooks/runSession.ts`, `src/dev/`; the deprecated `Game.subscribe` adapter (prompt 47) once nothing calls it; `tests/engine`, `tests/machine`, `tests/hooks` after the inventory is complete.
- **Unchanged:** sound design, the max-flex auto-player's choice order (it defines the golden master), all class names.

### 2. Implementation Instructions
1. `git mv` the four files; update imports to aliases (`@util/sfx`, `@util/autoPlayer`, `@view/hooks/useTutorial`). `src/util/index.ts` re-exports both util modules. `tests/helpers/autoPlayer.ts` re-exports from `@util/autoPlayer`; `beam-resume.spec.ts` imports from `../../src/util/autoPlayer`.
2. Util rules: `src/util` may import `@model`; model, controller and progression never import `@util` (add to ESLint). `autoPlayer.ts` keeps `fastForward(seed, targetRound)` used by `App` for `?round=N` demo mode.
3. Make sure every legacy symbol has a new home before deleting (examples: `ALL_PATTERNS` → model pattern catalogue, `statePath` → `@controller`, `RunSession` → `@progression`). Use:
```bash
grep -rnE "src/(engine|machine|dev)/|src/hooks/(useGame|runSession)|\.\./(engine|machine|dev)/" src tests scripts | wc -l   # must reach 0 before deleting
```
4. Port any test from the inventory that still lacks a counterpart (e.g. the 10 `runSession` blocks added to `tests/progression/RunRecorder.test.ts`, the 15 `gameMachine` blocks are already in `GameController.test.ts`), then `git rm -r src/engine src/machine src/dev src/hooks tests/engine tests/machine tests/hooks`.
5. Tighten ESLint: drop the legacy-tolerance list; restrict `src/view` to `@controller`, `@mvc`, `@util`, `@view`, type-only `@model`.
6. Update every test import that still points at a deleted path: `tests/helpers/board.ts`, `tests/progression/challenges.test.ts` and `tests/e2e/beam-resume.spec.ts` as well as the ported suites. `autoPlay` in `src/util/autoPlayer.ts` switches from `game.subscribe(…)` to `game.addModelListener({ modelChanged: … })` before the adapter goes. Plain-data interfaces kept for the old tests (prompts 37, 39) leave with `src/engine/objectives.ts`.
7. Update the documents that still describe the old layout, because every agent session loads them: `AGENTS.md` (the architecture rules name `src/engine`, `src/machine` and `src/engine/rng.ts`, and its "engine stays ~15 modules" budget no longer applies), `docs/class-structure.md` (links to `src/engine/*`) and any path in `README.md`.
8. Move the TSDoc rule to cover `src/util/**` and `src/view/hooks/**`; add missing TSDoc.

### 3. Verification Protocol
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm e2e
pnpm vitest run -t "golden"        # 5,5,31,16,2,7,53,37 / 156
pnpm check:classes                 # ≥ 36 (old engine duplicates disappear; distinct names unchanged)
ls src                              # App.tsx controller index.css main.tsx model mvc progression util view
git commit -am "refactor(util): inc 59 util package and legacy removal" && git tag inc-59-green
```
- [ ] Test count after ≥ test count before minus deleted duplicates; the inventory table (old test → new test) is pasted into the commit message body
- [ ] `grep -rn "Math.random" src` → 0; `grep -rn "subscribe(" src/model` → 0
- [ ] UML (`docs/uml-class-diagram.md`) lists no file under `src/engine`; `grep -rnE "src/(engine|machine|dev)" AGENTS.md README.md docs/class-structure.md` → 0
- [ ] Tracking: typecheck 0, lint 0/0, unit 100 %, golden exact, e2e 100 %, classes ≥ 36

---

**CRITICAL: Utilities live in `src/util`, view hooks in `src/view/hooks`, and every legacy shim and old test folder is gone with all its tests ported. Golden master 5,5,31,16,2,7,53,37 / 156 and ≥ 36 classes unchanged.**
