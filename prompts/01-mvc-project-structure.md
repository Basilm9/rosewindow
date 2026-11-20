# Prompt 01: MVC Project Structure

**CRITICAL: Create the six MVC package folders (`src/mvc`, `src/model`, `src/controller`, `src/view`, `src/progression`, `src/util`), their mirrored `tests/` folders, path aliases and empty barrel files WITHOUT moving or changing any existing module: every existing test and the golden master (seed 3, novice-rose, max-flex auto-player, rounds 5,5,31,16,2,7,53,37, beam total 156) must still pass.**

---

### INCREMENT 01: MVC package skeleton
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompt 00 (master context)
- **Reference implementation:** current layout `src/engine`, `src/machine`, `src/hooks`, `src/dev`, `src/view`, `src/progression`; `scripts/generate-uml.mjs` (reads root `tsconfig.json`)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` (sections 4, 5), `AGENTS.md`, `package.json`
- **Requirements:** NFR-4.1, NFR-4.2, NFR-4.5

### MANDATORY: Sandwich Requirement
- **Start:** Structure only. No class, rule or import is moved in this increment; `src/engine`, `src/machine`, `src/hooks`, `src/dev` stay exactly as they are (strangler migration: they are removed only in prompt 59).
- **End:** `pnpm typecheck && pnpm lint && pnpm test` green, golden master unchanged, `pnpm check:classes` reports **≥ 15** classes.

---

### 1. Capability Specification
- **Adds:** the package folders of `MVC_RoseWindow.md` section 4, the matching test folders, one alias per package, and a package-level barrel `index.ts` in each new package.
- **Changes:** `tsconfig.json` (and the app tsconfig it references, if any), `vite.config.ts` (Vitest reads the same config).
- **Unchanged:** every file under `src/` and `tests/` that exists today; `src/progression/index.ts` keeps its two `export *` lines; `src/App.tsx` and `src/main.tsx` stay at `src/` (composition root, exempt from package rules).

### 2. Implementation Instructions
**MANDATORY** folders (create only those that do not exist):

```
src/mvc/  src/model/  src/controller/  src/view/(exists)  src/progression/(exists)  src/util/
tests/mvc/ tests/model/ tests/controller/ tests/view/ tests/progression/(exists) tests/util/
tests/architecture/(exists)  tests/e2e/(exists)
```

Put a `.gitkeep` in every empty test folder. Create `src/mvc/index.ts`, `src/model/index.ts`, `src/controller/index.ts`, `src/util/index.ts` with only a TSDoc package comment and `export {}`:

```ts
/**
 * Package `model`: all game state and every game rule (MVC_RoseWindow.md §4).
 * Imports only `@mvc` and itself — no React, DOM, `window`, `localStorage`, XState (§5).
 * @packageDocumentation
 */
export {}
```

Do **not** add `src/view/index.ts` (views are imported file by file).

**Path aliases** — add to `compilerOptions.paths` in the **root `tsconfig.json`** (the UML generator parses that file with `ts.parseJsonConfigFileContent`, so aliases must resolve there) and mirror them in the app tsconfig if the root one uses project references:

```jsonc
"baseUrl": ".",
"paths": {
  "@mvc": ["src/mvc/index.ts"],               "@mvc/*": ["src/mvc/*"],
  "@model": ["src/model/index.ts"],           "@model/*": ["src/model/*"],
  "@controller": ["src/controller/index.ts"], "@controller/*": ["src/controller/*"],
  "@view/*": ["src/view/*"],
  "@progression": ["src/progression/index.ts"], "@progression/*": ["src/progression/*"],
  "@util": ["src/util/index.ts"],             "@util/*": ["src/util/*"]
}
```

Mirror the same map in `vite.config.ts` → `resolve.alias` (use `fileURLToPath(new URL('./src/model', import.meta.url))` etc.) so Vite, Vitest and Playwright's dev server resolve them identically.

**Architecture test** `tests/architecture/packages.test.ts`: assert with `existsSync` that each of the 6 `src` packages and 6 `tests` folders exists (12 cases via `it.each`, criterion: one case per required folder) and that `import('@model')` resolves.

TSDoc: the package comment in each barrel is mandatory (it becomes the package description in generated API docs).

### 3. Verification Protocol
```bash
pnpm typecheck        # 0 errors; UML regenerates (class count unchanged)
pnpm lint             # 0 errors, 0 warnings
pnpm test             # 100 % pass, includes packages.test.ts (12 + 1 cases)
pnpm vitest run -t "golden master"   # 5,5,31,16,2,7,53,37 / 156
pnpm check:classes    # ≥ 15
git add -A && git commit -m "refactor(structure): inc 01 mvc package skeleton" && git tag inc-01-green
```
- [ ] 6 source packages and 6 test folders exist; barrels compile
- [ ] `git diff --stat` shows **no** modified file under `src/engine`, `src/machine`, `src/hooks`, `src/dev`
- [ ] Aliases resolve in `tsc`, Vitest and `node scripts/generate-uml.mjs`
- [ ] Tracking matrix: typecheck 0, lint 0/0, unit 100 %, golden exact, classes ≥ 15

### 4. CRITICAL Checkpoint
- **Risk:** architectural transition — alias configuration diverges between `tsc`, Vite/Vitest and the UML generator. **Failure indicators:** `Cannot find module '@model'` in only one tool; UML generator throws on tsconfig parse; test count drops (Vitest `include` accidentally narrowed).
- **Isolation testing protocol:**
  1. Simplified config: add only `@model` alias; run `pnpm typecheck` then `pnpm vitest run tests/architecture/packages.test.ts`.
  2. Components separately: `node scripts/generate-uml.mjs` alone; `pnpm vitest run tests/engine` alone (same test count as before: record it first).
  3. Interaction effects: add the remaining aliases, run the full `pnpm test` and `pnpm e2e` smoke spec (`pnpm e2e tests/e2e/smoke.spec.ts`).
- **Rollback procedure:** `git reset --hard inc-00-green` (or the initial commit if 00 has no tag), re-apply folders first, aliases second, re-verify after each.

---

**CRITICAL: This increment adds folders, aliases and empty barrels only — zero behaviour change. All existing tests, the golden master (5,5,31,16,2,7,53,37 / 156) and ≥ 15 classes must remain green.**
