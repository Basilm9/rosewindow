# Rose Window class requirement

Updated 2026-10-21: the assignment requires at least **15 distinct classes**.
The implementation has **15 concrete production classes** within the existing
15 engine modules. Each class is instantiated or called by the running game.
Interfaces, type aliases, React function components, and test fixtures do not
contribute to the class count.

The six existing classes are retained. Nine responsibilities previously expressed
as interfaces, data literals, or functions now have class implementations:

1. `GameConfig` — immutable run settings and canonical seed; snapshots tier
   overrides. [config.ts](../src/engine/config.ts)
2. `SeededRandom` — mulberry32 state and a bound callback for injection; preserves
   the original random stream. [rng.ts](../src/engine/rng.ts)
3. `Die` — immutable color/value data with structural equality, including data
   restored from JSON. DiceBag constructs these dice. [types.ts](../src/engine/types.ts)
4. `OpenConstraint` — accepts every die on an open pane. [types.ts](../src/engine/types.ts)
5. `ColorConstraint` — accepts dice of the demanded color. [types.ts](../src/engine/types.ts)
6. `ValueConstraint` — accepts dice of the demanded value. [types.ts](../src/engine/types.ts)
7. `PlacementValidator` — evaluates the existing placement laws in their fixed
   order and throws structured placement errors. [placementValidator.ts](../src/engine/placementValidator.ts)
8. `BeamTracer` — traces and scores the beam with the run's multiplier ceiling;
   keeps traversal state local to each trace. [beamTracer.ts](../src/engine/beamTracer.ts)
9. `ScoreCalculator` — produces objective lines, beam total, final total, and tier
   using the run's tier settings. [scoreCalculator.ts](../src/engine/scoreCalculator.ts)
10. `GlassWindow` — owns the board and exposes cell and occupancy queries.
    [glassWindow.ts](../src/engine/glassWindow.ts)
11. `DiceBag` — builds, shuffles, draws, and returns the run's dice using injected
    randomness. [diceBag.ts](../src/engine/diceBag.ts)
12. `DraftPool` — owns the visible dice and handles taking and returning dice.
    [draftPool.ts](../src/engine/draftPool.ts)
13. `Game` — sequences rounds, owns the model state, calls validation/tracing/scoring
    services, and broadcasts semantic events. [game.ts](../src/engine/game.ts)
14. `GameError` — carries a machine-readable rule violation.
    [errors.ts](../src/engine/errors.ts)
15. `PlacementError` — specializes GameError for placement-law violations.
    [errors.ts](../src/engine/errors.ts)

The model remains pure TypeScript in `src/engine/`; XState controls interaction
phases in `src/machine/`, and React components render in `src/view/`. Game directly
uses the new RNG, validator, tracer, and calculator classes. Pattern parsing
constructs constraint objects whose `accepts` methods are called by validation.
Existing function entry points delegate to the class implementations so existing
callers and regression tests continue to exercise the same rules.

Run `pnpm check:classes` to print the inventory with source locations. The script
parses `src/` with the TypeScript compiler API and requires at least 15 unique
exported, named, concrete class declarations. It excludes abstract and ambient
declarations. `pnpm test` runs this check before Vitest, so the existing CI test
step enforces the minimum too.

The golden master remains seed **3**, pattern **novice-rose**, max-flex auto-player:
round scores **5, 5, 31, 16, 2, 7, 53, 37**, beam total **156**. Beam score timing,
V−1 lockout, multiplier cap, cycle guard, draw order, and objective scoring retain
their existing tests and values.

The supplied co-author documents were reviewed as design references:

- `MVC_RoseWindow.md` defines a 15-class minimum and proposes a larger push-MVC
  migration with model, controller, event, and infrastructure classes. The nine
  promoted responsibilities above also appear in that proposed class list.
- `RoseWindowReqPrompt.txt` describes gameplay, determinism, architecture, and
  acceptance criteria. Its rules help constrain this refactor.
- `GUI_mockupsRoseWindow.md` supplies screen references for future view work.
- `promptForPromptGenRoseWindow.txt` describes a separate prompt-generation
  workflow for the larger MVC proposal. The requested change here implements
  the class minimum in the current project; the full MVC migration and prompt
  pack remain proposed work.
