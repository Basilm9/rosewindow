# Prompt 02: Dependencies and Import-Boundary Rules

**CRITICAL: Pin the toolchain (pnpm, Vite, TypeScript strict, React 19, XState v5, Vitest, Playwright, ESLint 9 flat config, Prettier) and encode the package dependency rules of `MVC_RoseWindow.md` section 5 as ESLint errors, without breaking any existing test or the golden master (5,5,31,16,2,7,53,37 / 156).**

---

### INCREMENT 02: Toolchain and enforced import rules
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompt 01
- **Reference implementation:** `package.json` (scripts and versions), `AGENTS.md` (Commands table, Architecture rules), existing ESLint flat config at the repo root
- **Context to attach:** `ctxt/MVC_RoseWindow.md` section 5, `package.json`, `AGENTS.md`
- **Requirements:** NFR-4.1, NFR-4.2, NFR-4.3, NFR-4.5

### MANDATORY: Sandwich Requirement
- **Start:** Keep every script in `package.json` working exactly as `AGENTS.md` documents it (`typecheck` = `tsc --noEmit && pnpm uml`; `test` = `pnpm check:classes && vitest run`).
- **End:** `pnpm lint` reports 0 errors and 0 warnings on the current tree, and a fixture test proves each section 5 rule fires.

---

### 1. Capability Specification
- **Adds:** `eslint-plugin-jsdoc` (TSDoc presence) and `@vitest/coverage-v8` (branch coverage for the test prompts; `pnpm add -D eslint-plugin-jsdoc @vitest/coverage-v8@^3`) as the only new devDependencies; per-package rule blocks in `eslint.config.js`; `.prettierrc.json` if absent; `tests/architecture/importRules.test.ts`.
- **Unchanged:** runtime dependencies (`react`, `react-dom`, `xstate`, `@xstate/react`); all versions already in `package.json` (Vite 7, Vitest 3, Playwright 1.54, TS 5.8, typescript-eslint 8); legacy folders `src/engine|machine|hooks|dev` are **not** restricted yet (they disappear in 59).

### 2. Implementation Instructions
1. `pnpm install` with `packageManager: pnpm@9.7.1`, `engines.node >= 22`. Confirm `tsconfig` has `"strict": true`, `"noUncheckedIndexedAccess": true`, `"verbatimModuleSyntax": true` (needed so `import type` is distinguishable for the view rule).
2. `.prettierrc.json` matching the existing code: `{ "semi": false, "singleQuote": true, "printWidth": 100, "trailingComma": "all" }`.
3. In `eslint.config.js` add one block per package. Use `@typescript-eslint/no-restricted-imports` (supports `allowTypeImports`) — no extra boundary plugin:

```js
const legacy = ['**/engine/*', '**/machine/*', '**/hooks/*', '**/dev/*']
{ files: ['src/model/**/*.ts'],
  rules: {
    '@typescript-eslint/no-restricted-imports': ['error', { patterns: [
      { group: ['react', 'react-dom', 'react/*', 'xstate', '@xstate/*'], message: 'Model is UI- and XState-free (§5).' },
      { group: ['@controller', '@controller/*', '@view/*', '@progression', '@progression/*', '@util', '@util/*', '@mvc/react/*', '../controller/*', '../view/*', '../progression/*', '../util/*', ...legacy], message: 'Model imports only @mvc and itself (§5).' } ] }],
    'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'sessionStorage', 'navigator'],
    'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'Use SeededRandom.' }],
    'no-restricted-syntax': ['error', { selector: "ThrowStatement > NewExpression[callee.name='Error']", message: 'Throw GameError or a subclass.' }] } },
{ files: ['src/controller/**/*.ts'],   // model, mvc, xstate only
  rules: { '@typescript-eslint/no-restricted-imports': ['error', { patterns: [
    { group: ['react', 'react-dom', '@xstate/react', '@view/*', '../view/*', '@progression', '@progression/*', '@mvc/react/*'] } ] }] } },
{ files: ['src/progression/**/*.ts'],  // model (and mvc); never view/controller
  rules: { '@typescript-eslint/no-restricted-imports': ['error', { patterns: [
    { group: ['react', 'react-dom', '@view/*', '@controller', '@controller/*', 'xstate', '@xstate/*'] } ] }] } },
{ files: ['src/view/**/*.{ts,tsx}'],   // controller, mvc, util; model TYPES only
  rules: { '@typescript-eslint/no-restricted-imports': ['error', { patterns: [
    { group: ['@model', '@model/*'], allowTypeImports: true, message: 'Views use model types only (§5).' } ] }] } },
{ files: ['src/mvc/*.ts'],             // mvc core is framework-free; React hook lives in src/mvc/react/
  rules: { '@typescript-eslint/no-restricted-imports': ['error', { patterns: [{ group: ['react', 'react-dom', 'xstate', '@*/*', '../*'] }] }] } },
```
`no-restricted-properties` for `Math.random` applies to **all** of `src/**`. The view block tolerates legacy paths until prompt 58 tightens it.

4. TSDoc presence (course: API docs at every visibility) for new packages only — `files: ['src/mvc/**', 'src/model/**', 'src/controller/**']`:
```js
'jsdoc/require-jsdoc': ['error', { publicOnly: false, require: { ClassDeclaration: true, MethodDefinition: true },
  contexts: ['PropertyDefinition', 'TSInterfaceDeclaration', 'TSPropertySignature', 'TSMethodSignature', 'TSTypeAliasDeclaration'] }]
```
5. `tests/architecture/importRules.test.ts` — **test-design criterion: input-domain partitioning** (one partition per §5 rule, one allowed case per package). Use `new ESLint()` and `lintText(code, { filePath })`; assert `messages.length` against constants:

| Case | filePath | code | expected errors |
|---|---|---|---|
| 1 | `src/model/X.ts` | `import { useState } from 'react'` | 1 |
| 2 | `src/model/X.ts` | `import { createActor } from 'xstate'` | 1 |
| 3 | `src/model/X.ts` | `export const k = localStorage` | 1 |
| 4 | `src/model/X.ts` | `export const r = Math.random()` | 1 |
| 5 | `src/model/X.ts` | `import { a } from '@progression'` | 1 |
| 6 | `src/view/X.tsx` | `import { Game } from '@model'` | 1 |
| 7 | `src/view/X.tsx` | `import type { Game } from '@model'` | 0 |
| 8 | `src/controller/X.ts` | `import { useState } from 'react'` | 1 |
| 9 | `src/progression/X.ts` | `import { GameController } from '@controller'` | 1 |
| 10 | `src/progression/X.ts` | `import type { Game } from '@model'` | 0 |

Filter messages by `ruleId` of the boundary rules so unrelated rules (unused vars) do not change the counts.

### 3. Verification Protocol
```bash
pnpm install --frozen-lockfile=false && pnpm typecheck && pnpm lint && pnpm test
pnpm vitest run tests/architecture/importRules.test.ts   # 10/10
pnpm vitest run -t "golden master"                       # 156
pnpm format --check   # or: pnpm prettier --check .  — 0 files to fix in src/mvc|model|controller
git commit -am "build(deps): inc 02 toolchain and import rules" && git tag inc-02-green
```
- [ ] lint 0 errors / 0 warnings on the current tree; 10 fixture cases pass
- [ ] No new runtime dependency; only `eslint-plugin-jsdoc` and `@vitest/coverage-v8` (same major as Vitest, for the branch-coverage checks in the test prompts) added to devDependencies
- [ ] Tracking: typecheck 0, unit 100 %, golden exact, classes ≥ 15

### 4. CRITICAL Checkpoint
- **Risk:** rules too broad (legacy code turns red) or too narrow (violations pass silently). **Failure indicators:** lint errors in `src/engine` or `src/view` today; case 6 passes with 0 errors; case 7 reports an error (type import not recognised → check `verbatimModuleSyntax`).
- **Isolation testing protocol:**
  1. Simplified config: enable only the model block; run cases 1–5.
  2. Components separately: enable each remaining block alone and run its cases.
  3. Interaction effects: all blocks on, `pnpm lint` on the whole tree, then full `pnpm test`.
- **Rollback procedure:** `git reset --hard inc-01-green`; re-add one block at a time.

---

**CRITICAL: Section 5 import rules are now machine-checked by ESLint; existing code still lints clean; all tests and the golden master (5,5,31,16,2,7,53,37 / 156) stay green.**
