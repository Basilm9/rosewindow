# Rose Window — Agent Instructions

Single-player stained-glass puzzle game: draft seeded dice, place them into a 4x4 window under color/value adjacency laws, then a light beam refracts through the placed dice and scores its path. Full ruleset: see `docs/build-plan.md` and the original pitch (§5 beam rules are law — do not reinterpret them).

## Stack

Vite + React 19 + TypeScript (strict) + Tailwind CSS v4 + XState v5. Vitest for unit tests, Playwright for e2e. Node >= 22, pnpm.

## Commands

| Command | Purpose |
|---|---|
| `pnpm typecheck` | `tsc --noEmit` — run after every change |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest, single run |
| `pnpm dev` | Vite dev server on `localhost:5173` |
| `pnpm e2e` | Playwright e2e (starts dev server itself) |
| `pnpm build` | typecheck + production build |
| `pnpm format` | Prettier write |

**Definition of done for any change:** `pnpm typecheck && pnpm lint && pnpm test` green; UI changes additionally verified visually (see Verification protocol).

## Architecture rules

- `src/engine/` is **pure TypeScript**: zero React, zero DOM, zero side effects. All game rules live here.
- `src/machine/` (XState) orchestrates phases; the machine calls the engine. `snapshot.can()` is the phase-enforcement mechanism — no ad-hoc boolean flags.
- `src/view/` is dumb: it renders state and maps events to CSS/SVG animations. **No game rule is ever evaluated in the view.**
- All randomness goes through the injected seeded RNG (`src/engine/rng.ts`). Never call `Math.random()`.
- Beam behavior constants (turn colors, lockout formula `V-1`, multiplier cap 5) live in a single `GameConfig`-style constants module — tunable data, not scattered literals.
- Budget discipline: the engine stays ~15 modules. Do not add a module without a matching deletion or a stated reason.

## Verification protocol (UI changes)

This project uses **Playwright MCP** (configured in `.mcp.json`). For any visual change:

1. Start `pnpm dev`.
2. `browser_navigate` to `localhost:5173` (use `?seed=<n>` once seeded mode exists — every visual state must be reproducible).
3. Read `browser_snapshot` (a11y tree) to confirm semantic state.
4. `browser_take_screenshot` to confirm visual state.
5. Fix and repeat until correct. A UI change is not "done" until a screenshot has been reviewed.

Markup rules that make this possible:
- ARIA-first: board is `role="grid"`, cells are `role="gridcell"` with `aria-label="row R, column C, <die description>"`, draft dice are labeled buttons.
- `data-testid` on every interactive element (`cell-r{r}c{c}`, `draft-die-{i}`, `beam-layer`).

## Testing conventions

- Engine code is **test-first**: write the failing Vitest case, then implement.
- Golden-master tests: fixed seed + scripted draft/place sequence must produce an exact score. Any intentional rule/scoring change updates the golden values explicitly in the PR summary.
- One test per error reason in placement validation (there are 8 — see pitch §9).
- Beam tests assert the path cell-by-cell: value-6 lockout, multiplier cap, cycle guard, immediate exit are all mandatory cases.

## Git

- Conventional commits, concise: `feat(engine): ...`, `fix(view): ...`, `test(beam): ...`, `docs: ...`.
- Never commit secrets; never force-push `main`.
