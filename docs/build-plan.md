# Rose Window — AI-First Tech Stack & Build Plan

**Source pitch:** `~/Downloads/rose-window-pitch.md`
**Decision date:** 2026-09-01
**Working AI tools:** opencode + Claude Code

---

## 1. Executive summary

**Recommended stack: TypeScript + Vite + React (DOM/SVG rendering) + XState v5 + Vitest + Playwright, built with opencode/Claude Code via Playwright MCP.**

The single most important finding from the research: **AI agents are only as good as the feedback loops you give them.** A browser UI is the only target where an agent can *see its own work* (Playwright MCP: accessibility tree + screenshots), run its own tests, and iterate autonomously. JavaFX — the pitch's original assumption — has no mature equivalent (only one experimental community MCP), meaning the human would be the agent's eyes for every visual change.

Secondary finding: this game is a **turn-based, discrete-state board game** — exactly the category where research says DOM/CSS beats Canvas and game engines (Phaser/PixiJS). The beam animation is a step-by-step traversal, not a 60fps physics loop, so we get full agent visibility *and* simpler code by staying in DOM/SVG.

---

## 2. Research findings (the "why")

| Finding | Source |
|---|---|
| The agent-friendly stack consensus for 2026 is **TypeScript end-to-end**: type safety means the *compiler* corrects the agent, styles colocated with markup (Tailwind), an `AGENTS.md` treated as infrastructure, and lint/tests the agent runs itself | supastarter.dev "Best SaaS Stack for AI Coding Agents in 2026"; encore.dev |
| **Playwright MCP gives coding agents eyes**: agent drives a real browser, reads the accessibility tree, takes screenshots to check its own work. "Without it, an agent working on frontend is flying on instruments" — official Microsoft server, one-line setup, works with Claude Code, opencode, Codex, Cursor | argos-ci.com (Aug 2026), shiplight.ai, mcp.directory |
| Agents closed-loop on backend tasks fail silently on UI ("every test passes, page still broken") — the fix is a render→screenshot→read-own-output loop wired into the agent | dev.to yureki_lab (Aug 2026), agentic-coding-handbook |
| **DOM vs Canvas**: "Use DOM when your game has discrete states and the player drives every change — card games, board games, puzzles. Canvas when there's continuous motion." DOM gives CSS animations, accessibility, hit-testing free | cutedesk.app DOM-vs-Canvas analysis (Mar 2026) |
| Phaser/PixiJS are for continuous game loops, physics, scene management — none of which Rose Window uses (pitch §7 explicitly excludes frame-loop/physics). Adding them adds bundle and agent surface area for zero benefit | generalistprogrammer.com, pistack.xyz comparisons |
| **React has the "Matthew Effect"**: ~30M projects vs Svelte's ~500k → highest-quality AI code generation, fewest hallucinations; v0/Lovable/Bolt all default to React+TS+Vite+Tailwind | dev.to framework-AI analysis (Jan 2026), xbsoftware.com |
| **XState v5** is the standard for "logic with genuine modes" — checkout flows, games, turn management. There's an official tic-tac-toe example (XState v5 + React + Vite). Snapshot persistence (`getPersistedSnapshot`) gives save/load; Stately visualizer gives a live diagram of the machine | stately.ai docs/examples, noqta tutorial (Jul 2026) |

---

## 3. The stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | **TypeScript 5, `strict` mode** | Compiler is the agent's first oracle; illegal states caught before runtime |
| Build/dev | **Vite** | Instant HMR; the de-facto agent default; zero-config TS |
| UI framework | **React 19** | Largest training data → best agent output quality; huge ecosystem |
| Rendering | **DOM + CSS for cells/dice, SVG for the beam** | Board game = discrete states; a11y-tree visible to agent; CSS handles hover-ghost, shake, scale-down animations from pitch §13 natively; beam path is literally an SVG polyline animated step-by-step |
| Game logic | **Pure TS `engine/` module (no React imports)** | Preserves pitch §8's "model callable with no UI" — tests run without rendering |
| Orchestration | **XState v5** | Pitch §10 already has statecharts — XState *is* the statechart; `snapshot.can()` gives phase enforcement (`InvalidPhaseException` equivalent for free); persistence gives save/load |
| Styling | **Tailwind CSS v4** | Colocated utilities — no separate stylesheet for the agent to forget to update |
| RNG | **mulberry32 seeded PRNG in engine** (~15 lines, no dependency) | Pitch's "all randomness behind one injected seedable source"; golden-master tests |
| Unit tests | **Vitest** | Native TS/Vite, fast, agent runs it directly; golden-master tests with fixed seeds |
| E2E/visual | **Playwright** (+ **Playwright MCP** in dev) | Agent self-verification loop; deterministic screenshots |
| Storage | `localStorage` | Save/load serialized snapshot (XState persisted state) |
| Lint/format | ESLint (flat config) + Prettier | Mechanical guardrails the agent respects |
| CI | GitHub Actions: typecheck → lint → test → build | Same commands the agent runs locally |
| Conventions | `AGENTS.md` (+ `CLAUDE.md` symlink) | Both opencode and Claude Code read it every session |

**Deliberately NOT used:** Phaser/PixiJS (no game loop needed), Canvas (agent-blind), Zustand/Redux (XState covers it), backend/server of any kind (pitch §7: local only — pure static app, deployable to GitHub Pages/itch.io).

---

## 4. Architecture (pitch §8 mapped to web)

```
rosewindow/
├── AGENTS.md                  # commands, conventions, verification checklist
├── .mcp.json                  # Playwright MCP config (Claude Code + opencode)
├── src/
│   ├── engine/                # PURE TypeScript. Zero React/DOM imports.
│   │   ├── types.ts           #   Die, DieColor (w/ refraction dir), Direction, constraints
│   │   ├── rng.ts             #   seeded mulberry32 — sole randomness owner
│   │   ├── patterns.ts        #   6 hand-authored WindowPattern definitions
│   │   ├── objectives.ts      #   8 public + 5 private objective strategies
│   │   ├── placementValidator.ts
│   │   ├── beamTracer.ts      #   pure (grid, entry) -> BeamPath
│   │   ├── scoreCalculator.ts
│   │   ├── game.ts            #   phase orchestration, round clock, public API
│   │   └── errors.ts          #   typed PlacementError discriminated union (pitch §9)
│   ├── machine/
│   │   └── gameMachine.ts     # XState v5: SETUP→DRAFT→PLACE→REFRESH→ILLUMINATE→…→GAME_OVER
│   ├── view/                  # React components only. No rule logic.
│   │   ├── GlassBoard.tsx     #   4×4 grid, cells as rounded rects (lead came styling)
│   │   ├── Die.tsx            #   translucent fill, inner glow, lit/unlit states
│   │   ├── BeamLayer.tsx      #   SVG polyline overlay, step animation from BeamPath
│   │   ├── DraftPool.tsx, Objectives.tsx, EntryIndicator.tsx, ScorePanel.tsx
│   │   └── dialogs/           #   New game / Game over modals
│   ├── hooks/
│   │   └── useGameActor.ts    #   useMachine wiring, semantic-event → animation mapping
│   └── main.tsx
├── tests/
│   ├── engine/                #   Vitest: validator, beam, scoring, golden-master (seeded)
│   ├── machine/               #   phase/illegal-action tests
│   └── e2e/                   #   Playwright: full round walkthrough
└── docs/                      #   UML-ish diagrams, beam rule spec, statechart exports
```

### Key mappings from the pitch

- `ModelEvent` broadcast (§8.3) → XState raised events + `useGameActor` subscribes and queues animations (`DiePlacedEvent` → scale-down; `BeamTracedEvent` → SVG path animation; `PlacementRejectedEvent` → shake + red pulse, no dialog — exactly §13)
- Exception hierarchy (§9) → discriminated union `PlacementError` with tagged reasons; the validator returns/throws structured reasons so the view can outline *offending neighbors* for illegal hover previews
- Two statecharts (§10) → two XState machines (game machine + a `beamMachine` for TRAVELING/REFRACTING/LOCKED_STRAIGHT/TERMINATED), both exportable as diagrams from Stately
- `GameConfig` tunables → one typed `GameConfig` object; beam balance stays a data tweak

### Why the engine/machine split matters for AI

The hardest, most testable code (`BeamTracer`, `PlacementValidator`, scoring) lives in pure functions with zero UI — the agent closes the loop with Vitest alone, no screenshots needed. Screenshots are only needed for the view layer, which is the thinnest part.

---

## 5. The AI development workflow

### 5.1 Agent's eyes — Playwright MCP

`.mcp.json` in repo root (Claude Code reads it natively; opencode reads it too):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Agent session loop for any UI task: `pnpm dev` → `browser_navigate localhost:5173` → `browser_snapshot` (structured a11y tree — cheap, deterministic) → act → `browser_take_screenshot` (visual check) → fix → repeat.

### 5.2 Making the game deterministically inspectable (critical design decision)

1. **Seeded demo mode** — `?seed=42&round=3` boots the game into exactly that state (seed feeds the same injected RNG; a dev-only hook can fast-forward N rounds). Every screenshot the agent takes is reproducible.
2. **ARIA-first markup** — cells get `role="gridcell"` + `aria-label="row 2, column 3, red die, value 5"`, draft pool dice are buttons with labels, beam segments are an SVG with `aria-label` describing the path. The agent reads the a11y tree and *knows the board state as text* — screenshots only confirm what it already believes.
3. **`data-testid` everywhere** (cell-r2c3, draft-die-0, beam-layer) for Playwright e2e selectors.

### 5.3 `AGENTS.md`

Contents: project map (engine is pure / view is dumb / machine is the boss), commands (`pnpm typecheck && pnpm lint && pnpm test && pnpm build:e2e`), the rule "no UI change is done until Playwright screenshot reviewed," beam rule constants location, and the class-budget discipline from pitch §15. For Claude Code, `CLAUDE.md` is a symlink to `AGENTS.md`.

### 5.4 Division of labor between human and agents

- **Agents write ~90%**: engine + tests (test-first, oracle = Vitest), XState machine, React view, Playwright specs, docs.
- **Human owns**: beam-rule fun/balance judgment (agents can't answer "is this good?" — only "is this broken?", per research), playtesting, the pitch's milestone documents.

---

## 6. Milestones

| Phase | Deliverable | Agent verification |
|---|---|---|
| 0 | Scaffolding: Vite+React+TS strict, Tailwind, Vitest, Playwright, ESLint, CI, AGENTS.md, .mcp.json | `pnpm build` green in CI |
| 1 | Engine: types, seeded RNG, patterns, objectives (stubs) | unit tests |
| 2 | `PlacementValidator` + all 8 error reasons | exhaustive Vitest cases, one per exception path |
| 3 | `BeamTracer` + `Direction` | cell-by-cell hand-built path tests: value-6 lockout, multiplier cap, cycle guard, immediate exit |
| 4 | `DiceBag`/draft round loop + `Game` orchestration | **golden-master tests**: fixed seed → scripted draft/place sequence → exact score |
| 5 | `ScoreCalculator` + objectives; engine complete, playable from tests | full engine coverage; playtest via a CLI test harness |
| 6 | XState machines (game + beam), statechart exports for docs | machine tests incl. every illegal-phase call |
| 7 | Static view: board, draft pool, objectives, entry indicator | **Playwright MCP screenshots**, a11y-tree assertions |
| 8 | Input + rejection UX: hover ghost (legal/illegal tint, offending neighbor outline), shake/red pulse | agent drives clicks via MCP, screenshots reject states |
| 9 | Beam animation: SVG step traversal, die flare, rising score numbers, multiplier display | seeded URL → deterministic screenshot of mid-animation frame |
| 10 | Save/load (localStorage + persisted snapshot), game-over tiers, 3 SFX, polish pass | e2e: full 8-round game to GAME_OVER |
| 11 | Acceptance: fresh seed full-game e2e, visual regression baselines, docs (statechart diagrams + beam spec) | CI green + human playtest |

The pitch's sequencing wisdom is preserved: the game is fully playable and gradeable at end of phase 6, before any pixel exists.

---

## 7. Risks & tradeoffs

| Risk | Mitigation |
|---|---|
| Course deliverables — if Javadoc/UML/JUnit are graded artifacts | Milestones map 1:1; XState exports real statechart diagrams; TS declarations + TypeDoc can produce Javadoc-equivalent docs; confirm with instructor before phase 1 |
| Beam animation in CSS/SVG is less frame-precise than a game loop | It's a step-wise traversal (pitch §7 forbids frame loops anyway); requestAnimationFrame only inside BeamLayer if needed |
| React re-render noise during animation | BeamLayer animates via CSS classes/SVG attributes, not React state per frame |
| Two AI tools (opencode + Claude Code) drifting conventions | Single `AGENTS.md` symlinked as `CLAUDE.md`; both get identical context; both run the same verification commands |
| Agents over-engineering | Class/package budget from pitch §15 restated in AGENTS.md; engine stays ~15 modules |
