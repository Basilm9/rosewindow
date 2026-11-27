# Push MVC for Rose Window (TypeScript + React + XState)

This document adapts the John Hunt calculator MVC (see `MVC_JohnHunt.md`) to Rose Window. It sets the target architecture that the Module of Thought prompts must build. Where the current code differs, this document wins. The current code is the **reference implementation**: its tests and golden-master values are the acceptance oracle for every increment.

## 1. The style in one paragraph

The **model** owns all state and every game rule. It knows nothing about views or controllers. When its state changes it **pushes** a semantic `ModelEvent` to every registered `ModelListener`. A **view** renders model state, registers as a listener, and forwards user gestures to its **controller**. A controller turns those gestures into model calls, catches model exceptions, and asks the view to show feedback. Communication: User → View → Controller → Model → (event) → View.

Two kinds of connector, as in lecture: **method invocation** (view → controller → model) and **event notification** (model → view). The event notification is what lets a view be replaced without touching the model.

## 2. Infrastructure (package `src/mvc/`), mirroring John Hunt

```
«interface»                 «abstract»                    «abstract»
ModelListener<E>            ModelEvent                    AbstractModel<E extends ModelEvent>
+ modelChanged(e: E): void  + kind: string                - listeners: ModelListener<E>[]
                            + source: AbstractModel        + addModelListener(l): () => void
                                                           + removeModelListener(l): void
                                                           # notifyChanged(e: E): void   // loops over listeners

«abstract»                                    «interface»
AbstractController<M extends AbstractModel>   View
# model: M                                    + modelChanged(e) via a listener hook
# view: View | null
+ setView(v: View): void
```

- `notifyChanged` is the loop over listeners that the professor calls out: it sends the event to each registered listener in registration order.
- **React mapping:** views are function components, so "registering as a listener" is done by one hook, `useModelEvents(model, onEvent)`, which calls `addModelListener` on mount and the returned unsubscribe on unmount. That hook is the `ModelListener` implementation; it is the only place a view touches the model directly, and only to read state and listen.
- **Phase control:** the controller owns the XState v5 actor for the game statechart. `snapshot.can(event)` decides whether a user action is allowed in the current phase; the controller calls the model only when it is. The model also enforces phase internally and throws `invalidPhase` if called wrongly (defense in depth, NFR-2.3).

## 3. Event catalogue (published by `Game`)

| Event class | Payload | View reaction |
|---|---|---|
| `DiePlacedEvent` | position, die | placement slam animation |
| `PlacementRejectedEvent` | position, violation (kind + offending neighbors) | shake, red pulse, toast naming the law, outline neighbors |
| `DraftPoolRefreshedEvent` | dice | deal-in animation of the tray |
| `BeamTracedEvent` | BeamPath | beam animation paced by the beam statechart |
| `RoundScoredEvent` | round, delta | score count-up, round pip |
| `RoundForfeitedEvent` | round | forfeit banner |
| `GameOverEvent` | ScoreReport | results screen |

All extend `ModelEvent`. The current code has these as a discriminated union in `src/engine/events.ts`; keep the same names and payloads.

## 4. Target class list

Classes count toward the course's 15-class minimum; interfaces and type aliases do not. Target: **about 25 classes**. "From" names the current module whose logic and tests the class takes over; reuse that logic rather than rewriting it.

### Model (`src/model/`)
| # | Class | Responsibility | From |
|---|---|---|---|
| 1 | `GameConfig` | Immutable run parameters: seed, rounds, grid size, draft size, placements per round, copies per die, multiplier cap, tier thresholds | `engine/config.ts` |
| 2 | `SeededRandom` | Sole randomness source (mulberry32); seed normalization | `engine/rng.ts` |
| 3 | `Die` | Immutable color + value; equality | `engine/types.ts` |
| 4 | `Direction` | Four static instances; `clockwise()`, `counterClockwise()`, row/col delta | `engine/types.ts` |
| 5 | `ColorConstraint` | Printed demand for a color (implements `CellConstraint`) | `engine/types.ts` |
| 6 | `ValueConstraint` | Printed demand for a value (implements `CellConstraint`) | `engine/types.ts` |
| 7 | `OpenConstraint` | No demand (implements `CellConstraint`) | `engine/types.ts` |
| 8 | `WindowPattern` | Named 4x4 arrangement of constraints; validates its data on load | `engine/patterns.ts` |
| 9 | `WindowCell` | Zero-or-one die plus its constraint | `engine/glassWindow.ts` |
| 10 | `GlassWindow` | Grid of cells; bounds and occupancy queries | `engine/glassWindow.ts` |
| 11 | `DiceBag` | 90 dice; draws and returns through `SeededRandom` | `engine/diceBag.ts` |
| 12 | `DraftPool` | Dice visible this round; hand selection | `engine/draftPool.ts` |
| 13 | `PlacementValidator` | Checks the six laws in fixed order; returns or throws the first violation | `engine/placementValidator.ts` |
| 14 | `EntryPoint` | Edge cell plus inward `Direction` | `engine/types.ts` |
| 15 | `BeamSegment` | One visited cell: position, direction, die, multiplier, points | `engine/beamTracer.ts` |
| 16 | `BeamPath` | Ordered segments plus total | `engine/beamTracer.ts` |
| 17 | `BeamTracer` | Pure traversal: refraction, lockout, multiplier cap, cycle guard | `engine/beamTracer.ts` |
| 18 | `PublicObjective` | One of eight public scoring rules (implements `Objective`) | `engine/objectives.ts` |
| 19 | `PrivateObjective` | Sum of one color's values (implements `Objective`) | `engine/objectives.ts` |
| 20 | `ScoreReport` | Itemized lines, beam total, grand total, tier | `engine/scoreCalculator.ts` |
| 21 | `ScoreCalculator` | Scores a finished window against the objectives | `engine/scoreCalculator.ts` |
| 22 | `Game` | Extends `AbstractModel<GameEvent>`; round loop, phases, public API, publishes events | `engine/game.ts` |
| 23 | `GameError` | Base exception with a machine-readable `violation` | `engine/errors.ts` |
| 24 | `PlacementError` | Placement-family exception (extends `GameError`) | `engine/errors.ts` |
| — | 7 event classes | See section 3 (extend `ModelEvent`) | `engine/events.ts` |

### Controller (`src/controller/`)
| # | Class | Responsibility | From |
|---|---|---|---|
| 25 | `GameController` | Extends `AbstractController<Game>`; owns the game statechart actor; maps gestures to model calls; catches `GameError` and asks the view for feedback | `machine/gameMachine.ts`, `hooks/useGame.ts` |
| 26 | `BeamAnimationController` | Owns the beam statechart; paces `BeamTracedEvent` playback for the view | `machine/beamMachine.ts` |

### Progression and persistence (`src/progression/`), must never affect rules or scores
| # | Class | Responsibility | From |
|---|---|---|---|
| 27 | `RunRecorder` | Records actions; restores a run by replaying them through `Game`; validates stored records | `hooks/runSession.ts` |
| 28 | `PlayerProfile` | XP, level, shards, bests, achievements, daily progress; validated storage | `progression/profile.ts` |
| 29 | `ChallengeCodec` | Encode/decode versioned challenge codes with check value | `progression/challenges.ts` |

### View (`src/view/`)
React function components (not counted as classes): `GameScreen`, `GlassBoard`, `Die`, `DraftPool`, `BeamLayer`, `Objectives`, `ScorePanel`, `SetupScreen`, `GameOverScreen`, `Menus`, `TutorialOverlay`, `Fx`, `Icon`, `RoseArt`. Keep them; change only how they receive state (through `GameController` and `useModelEvents`) so no view calls a model mutator directly.

### Utility (`src/util/`)
`sfx.ts` (sound), `autoPlayer.ts` (dev/test automatic player). Not required to be classes.

## 5. Dependency rules (enforced, checked by the class-diagram generator)

```
view ──► controller ──► model ◄── progression
  │                       ▲
  └──── mvc ◄─────────────┘   (model and controller extend mvc base classes)
```

- `src/model/` imports only `src/mvc/` and itself. No React, DOM, `window`, `localStorage`, or XState.
- `src/controller/` imports `model`, `mvc` and XState. No React components.
- `src/view/` imports `controller`, `mvc`, `util`, model **types** and progression **types** (for example the run-session and reward shapes it receives as props). It never imports a model or progression value and never calls a model mutator.
- `src/progression/` imports `model`; the model never imports `progression`.

## 6. Statecharts

**Game statechart** (owned by `GameController`):
```
setup ──choosePattern──► round
round: draft ⇄ place  (2 placements; held die may be returned; recast once)
       place ──2 placed──► illuminate ──beam done──► next round or finalScoring
       draft/place ──no legal move──► forfeit ──► illuminate
any in-run state ──pause──► paused ──resume──► (same state)
finalScoring ──► gameOver (final)
```
**Beam statechart** (owned by `BeamAnimationController`): `traveling → refracting → lockedStraight → … → terminated`, with dwell states for animation pacing and immediate completion when reduced motion is requested.

Export both as diagrams for the final deliverable ("system statechart diagrams").
