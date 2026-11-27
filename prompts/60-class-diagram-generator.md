# Prompt 60: Class Diagram Generator with Import-Rule Report

**CRITICAL: Extend the existing deterministic `scripts/generate-uml.mjs` (TypeScript compiler API, runs inside `pnpm typecheck`) — do NOT replace it — so the generated UML class diagram shows packages, classes (concrete and abstract), interfaces, attributes, operations, generalization, realization, association and dependency in a Visual-Paradigm-like style, and reports every import that breaks `MVC_RoseWindow.md` section 5, exiting non-zero when there is one. No LLM draws the diagram. Golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**

---

### INCREMENT 60: UML class diagram generator
- **Status:** CRITICAL checkpoint
- **Dependencies:** Prompts 01, 02, 59
- **Reference implementation:** `scripts/generate-uml.mjs` (Mermaid `classDiagram` in `docs/uml-class-diagram.md`, `referencedClasses`, `visibility`, `typeLabel`, `operation`, `has`/`uses` edges, write-only-if-changed) and `tests/architecture/uml.test.ts` (3 tests, temp-project harness `withProject`)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` sections 2, 4, 5; `package.json` (`typecheck`, `uml` scripts)
- **Requirements:** NFR-4.1, NFR-4.2, NFR-4.3, NFR-4.5

### MANDATORY: Sandwich Requirement
- **Start:** Keep every existing behaviour the 3 tests pin: member formatting (`+string color`, `+equals(a, b) boolean$`, `-Grid dice`), `Window --> Die : has`, `Game ..> SeededRandom : uses`, `DomainError <|-- PlacementError`, `Item_2["Item"]` disambiguation, source links, the `**N concrete production classes**` sentence (still concrete-only), no rewrite of identical output.
- **End:** `pnpm typecheck` regenerates the diagram and prints `Import-rule violations: 0`.

---

### 1. Capability Specification
- **Adds:** abstract classes (`<<abstract>>`), exported interfaces (`<<interface>>`, property signatures as attributes, method signatures as operations), packages as Mermaid `namespace` blocks, realization edges, VP-like theme, an "Import-rule violations" section, exit code 1 on any violation.
- **Changes:** the one existing assertion `not.toContain('class AbstractBase')` is replaced by `toContain('<<abstract>>')` for `AbstractBase` (now in scope). Ambient, local, `.d.ts` and `tests/` classes stay excluded.

### 2. Implementation Instructions
1. **Inventory:** collect exported `ClassDeclaration`s (concrete and abstract) and `InterfaceDeclaration`s from `src/**/*.ts(x)`. Package = first folder under `src/` (`mvc`, `model`, `controller`, `view`, `progression`, `util`); files directly in `src/` have no package. Order: packages in that fixed order, then path, then name.
2. **Relationships** (one edge per pair, strongest wins: generalization > realization > association > dependency):
```
Parent <|-- Child            class extends class, interface extends interface   (generalization)
Interface <|.. Class          class implements interface                         (realization)
A --> B : has                 field / parameter-property / accessor type refers to B (existing referencedClasses, now also interfaces)
A ..> B : uses                any other reference in A's code or types (existing visit)
```
   Generic arguments count (`AbstractController<Game>` gives `GameController --> Game : has` via `model`).
3. **Styling (Visual Paradigm look):** first line inside the block
```
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#FFFFC0','primaryBorderColor':'#A0522D','primaryTextColor':'#000000','lineColor':'#404040','fontFamily':'Arial','fontSize':'12px'}}}%%
```
   plus `classDef abstract font-style:italic` and `classDef interface fill:#FFFFE8` applied with `class X:::abstract`; stereotypes `<<abstract>>` / `<<interface>>` inside the box; packages as `namespace model { … }` (Mermaid renders them as titled frames).
4. **Import-rule check** (section 5), for every import/export-from in `src/`: resolve with `ts.resolveModuleName(spec, file, parsed.options, ts.sys)` (honours path aliases), classify source and target package, and test against:
```js
const ALLOWED = {
  mvc: ['mvc'], model: ['model', 'mvc'], controller: ['controller', 'model', 'mvc'],
  view: ['view', 'controller', 'mvc', 'util', 'model:type'], progression: ['progression', 'model', 'mvc'],
  util: ['util', 'model'] }
const FORBIDDEN_EXTERNAL = { model: ['react', 'react-dom', 'xstate', '@xstate/react'], controller: ['react', 'react-dom', '@xstate/react'], progression: ['react', 'react-dom', 'xstate'] }
```
   `model:type` = allowed only when the import is `import type` or every specifier is `type`. `src/mvc/react/*` may import `react`. Also flag in `src/model` any identifier reference to `window`, `document`, `localStorage` and the call `Math.random`. Unpackaged files (`App.tsx`, `main.tsx`) are exempt.
5. **Output:** append to the markdown a section `## Import-rule violations` listing `- src/model/X.ts:12 model → view (import '../view/Y')`, sorted, or `None.`; print `Import-rule violations: N` to stdout; `process.exitCode = N > 0 ? 1 : 0`. Output stays byte-identical across runs (sort every set before printing).
6. Update the "How to read it" legend for the new arrow kinds, stereotypes and packages.

**Tests** — add to `tests/architecture/uml.test.ts` (same `withProject` harness; criterion: one case per relationship kind and per §5 rule partition): (U4) `src/mvc/AbstractModel.ts` abstract + `src/model/Game.ts extends` → `AbstractModel <|-- Game`, `<<abstract>>`, `namespace model`; (U5) `export interface Listener` + `class L implements Listener` → `Listener <|.. L`, `<<interface>>`; (U6) `src/model/bad.ts` importing `react` and `../view/v` → exit status 1, stdout `Import-rule violations: 2`, both lines listed; (U7) `src/view/v.tsx` with `import type { G } from '../model/g'` → 0 violations, and a value import → 1; (U8) `src/model/r.ts` using `Math.random()` → 1. Allow `status 1` in a second harness helper; keep the existing three tests.

### 3. Verification Protocol
```bash
pnpm vitest run tests/architecture/uml.test.ts   # 3 existing + 5 new = 8, 100 %
pnpm typecheck                                   # regenerates; prints "Import-rule violations: 0"
node scripts/generate-uml.mjs && git diff --exit-code docs/uml-class-diagram.md   # deterministic: no diff on 2nd run
pnpm lint && pnpm test && pnpm e2e && pnpm vitest run -t "golden"   # 156
git commit -am "feat(tooling): inc 60 UML generator with packages and import rules" && git tag inc-60-green
```
- [ ] Diagram shows 6 namespaces, ≥ 36 concrete classes, `AbstractModel`, `AbstractController`, `ModelEvent` as abstract, `ModelListener`, `View`, `CellConstraint`, `Objective` as interfaces
- [ ] Edges present: `AbstractModel <|-- Game`, `AbstractController <|-- GameController`, `ModelEvent <|-- BeamTracedEvent`, `CellConstraint <|.. ColorConstraint`, `GameController --> Game : has`
- [ ] Tracking: typecheck 0, lint 0/0, unit 100 %, golden exact, e2e 100 %, classes ≥ 36, **import-rule violations 0**

### 4. CRITICAL Checkpoint
- **Risk:** a tooling change inside `pnpm typecheck` can turn every later increment red, or silently miss violations. **Failure indicators:** typecheck fails with a generator stack trace; output differs between two runs; alias imports reported as "unresolved"; U6 passes with 0 violations.
- **Isolation testing protocol:**
  1. Simplified config: run the generator on the 3 existing fixtures only — output identical to before apart from the legend.
  2. Components separately: inventory + namespaces; then each edge kind; then the import checker alone on U6–U8 fixtures.
  3. Interaction effects: run on the real `src/`, inspect the rendered Mermaid on GitHub/VS Code preview, then full suite.
- **Rollback procedure:** `git reset --hard inc-59-green`; land diagram features and the checker in separate commits so the checker can be reverted alone.

---

**CRITICAL: `scripts/generate-uml.mjs` deterministically renders packages, classes, interfaces, members and all four relationship kinds in VP style and fails `pnpm typecheck` on any section 5 import violation. Golden master 5,5,31,16,2,7,53,37 / 156 unchanged.**
