import { AbstractModel } from '@mvc'
import { BeamTracer } from './BeamTracer'
import { DiceBag } from './DiceBag'
import type { Die, DieData } from './Die'
import { DraftPool } from './DraftPool'
import { EntryPoint } from './EntryPoint'
import {
  BeamTracedEvent,
  DiePlacedEvent,
  DraftPoolRefreshedEvent,
  GameOverEvent,
  PlacementRejectedEvent,
  RoundForfeitedEvent,
  RoundScoredEvent,
} from './events'
import type { GameEvent } from './events'
import type { GameConfig } from './GameConfig'
import { GameError, PlacementError } from './GameError'
import { GlassWindow } from './GlassWindow'
import { dealObjectives } from './objectiveDeal'
import type { DealtObjectives } from './objectiveDeal'
import { PlacementValidator } from './PlacementValidator'
import type { Position } from './Position'
import { ScoreCalculator } from './ScoreCalculator'
import type { ScoreReport } from './ScoreReport'
import { SeededRandom } from './SeededRandom'
import { WindowPattern } from './WindowPattern'

/** The game's phases (pitch §10, compressed for the headless model). */
export type GamePhase = 'patternSelection' | 'draft' | 'place' | 'gameOver'

/**
 * The model facade (MVC_RoseWindow.md §4, class 22): round clock, phase orchestration and the
 * semantic event stream. Every rule is delegated to a model service (`PlacementValidator`,
 * `BeamTracer`, `ScoreCalculator`, `DraftPool`, `DiceBag`); this class only sequences them and
 * publishes one event class instance per state change through
 * {@link AbstractModel.notifyChanged | notifyChanged}, the only publication path. Playable with
 * no view attached.
 *
 * Round flow (pitch §4): draw `draftSize` dice → select one → place → repeat until
 * `placementsPerRound` are placed → unselected dice return to the bag → illuminate (trace the
 * beam from the announced entry, score it) → announce the next entry and draw the next pool;
 * after the last round the window is scored against the objectives.
 *
 * Event order per completed round: `diePlaced` × placements, `beamTraced`, `roundScored`, then
 * the next round's `draftPoolRefreshed` or, after the last round, `gameOver`. A forfeited round
 * publishes `roundForfeited` before its `beamTraced`. A rejected placement publishes
 * `placementRejected` and then rethrows.
 *
 * All mutable state is held in `#private` fields, so it is never enumerable.
 */
export class Game extends AbstractModel<GameEvent> {
  /** The immutable run parameters this game was built from. */
  readonly config: GameConfig

  /** The two window patterns offered for this seed (FR-1.3). */
  readonly offeredPatterns: readonly [WindowPattern, WindowPattern]

  /** The three public objectives and the private objective dealt for this seed (FR-2.1, FR-2.2). */
  readonly objectives: DealtObjectives

  /** The beam entry announced for each round, one per round in round order (FR-5.1). */
  readonly entrySequence: readonly EntryPoint[]

  /** Current phase; every mutator checks it first (NFR-2.3). */
  #phase: GamePhase = 'patternSelection'

  /** Current round, 1-based; stays at `config.rounds` after game over. */
  #round = 1

  /** The player's window; `null` until a pattern is chosen. */
  #window: GlassWindow | null = null

  /** Dice visible for selection this round. */
  #draftPool = new DraftPool([])

  /** The selected die, out of the pool; at most one (FR-3.3). */
  #hand: Die | null = null

  /** Dice committed so far in the current round. */
  #placementsThisRound = 0

  /** Recasts left this run (one, FR-3.6). */
  #refreshesRemaining = 1

  /** Beam score of each finished round, in round order. */
  readonly #roundScores: number[] = []

  /** Running beam total; always the sum of {@link Game.roundScores} (SRS §4.6). */
  #totalScore = 0

  /** The final itemized report; `null` until game over. */
  #report: ScoreReport | null = null

  /** The run's seeded dice bag. */
  readonly #bag: DiceBag

  /** Stateless checker of the six placement laws. */
  readonly #validator = new PlacementValidator()

  /** Beam traversal with the configured multiplier cap. */
  readonly #beamTracer: BeamTracer

  /** Final scoring with the configured tier thresholds. */
  readonly #scoreCalculator: ScoreCalculator

  /**
   * Builds a seeded game in `patternSelection`. The construction order is load-bearing: one
   * seeded stream feeds, in this order, the dice-bag shuffle, the pattern offer, the objective
   * deal and the entry sample; changing it changes every seeded run and the golden master.
   * @param config - the run parameters (seed, rounds, grid size, …).
   * @throws {GameError} `invalidArgument` if `config.rounds` exceeds the number of entry points
   *   for `config.gridSize` (from {@link SeededRandom.sample}); cannot happen with the defaults.
   */
  constructor(config: GameConfig) {
    super()
    this.config = config
    const rng = new SeededRandom(config.seed).next
    this.#beamTracer = new BeamTracer(config.multiplierCap)
    this.#scoreCalculator = new ScoreCalculator(config.tiers)
    this.#bag = new DiceBag(config, rng)
    this.offeredPatterns = WindowPattern.offer(rng)
    this.objectives = dealObjectives(rng)
    this.entrySequence = SeededRandom.sample(EntryPoint.allFor(config.gridSize), config.rounds, rng)
  }

  /**
   * Legacy adapter: registers a plain callback as a {@link ModelListener}. Each call registers a
   * new listener object, so the same function subscribed twice receives every event twice.
   * @deprecated Use {@link AbstractModel.addModelListener}; removed in prompt 59.
   * @param fn - called with every published event.
   * @returns the unsubscribe function from {@link AbstractModel.addModelListener}.
   */
  subscribe(fn: (e: GameEvent) => void): () => void {
    return this.addModelListener({ modelChanged: fn })
  }

  /**
   * The current phase.
   * @returns `patternSelection`, `draft`, `place` or `gameOver`.
   */
  get phase(): GamePhase {
    return this.#phase
  }

  /**
   * The current round, 1-based.
   * @returns the round number (stays at the last round after game over).
   */
  get round(): number {
    return this.#round
  }

  /**
   * The player's stained-glass window, once chosen.
   * @returns the live window, or `null` before a pattern is chosen.
   */
  get window(): GlassWindow | null {
    return this.#window
  }

  /**
   * The dice visible this round.
   * @returns the live draft pool.
   */
  get draftPool(): DraftPool {
    return this.#draftPool
  }

  /**
   * The selected die.
   * @returns the held die, or `null` when nothing is selected.
   */
  get hand(): Die | null {
    return this.#hand
  }

  /**
   * One optional seeded recast is available each run (FR-3.6).
   * @returns 1 before the recast is used, 0 after.
   */
  get refreshesRemaining(): number {
    return this.#refreshesRemaining
  }

  /**
   * Placements left before the current round illuminates.
   * @returns `placementsPerRound` minus the dice committed this round.
   */
  get placementsRemaining(): number {
    return this.config.placementsPerRound - this.#placementsThisRound
  }

  /**
   * The entry point announced for the current round (FR-5.1).
   * @returns `entrySequence[round - 1]`.
   */
  get currentEntry(): EntryPoint {
    return this.entrySequence[this.#round - 1]!
  }

  /**
   * Beam score of each finished round.
   * @returns the scores in round order (read-only view of the live list).
   */
  get roundScores(): readonly number[] {
    return this.#roundScores
  }

  /**
   * The running beam total.
   * @returns the sum of {@link Game.roundScores}.
   */
  get totalScore(): number {
    return this.#totalScore
  }

  /**
   * The itemized final score once the game is over. `totalScore` remains the running beam
   * total; the final score is `report.total` = beam total + objective lines (pitch §4).
   * @returns the report, or `null` during play.
   */
  get report(): ScoreReport | null {
    return this.#report
  }

  /**
   * Guards a mutator on one phase.
   * @param phase - the required phase.
   * @throws {GameError} `invalidPhase` when the game is in any other phase.
   */
  #requirePhase(phase: GamePhase): void {
    if (this.#phase !== phase) {
      throw new GameError({ kind: 'invalidPhase' })
    }
  }

  /**
   * Guards a mutator on active play (`draft` or `place`).
   * @throws {GameError} `invalidPhase` in `patternSelection` or `gameOver`.
   */
  #requirePlay(): void {
    if (this.#phase !== 'draft' && this.#phase !== 'place') {
      throw new GameError({ kind: 'invalidPhase' })
    }
  }

  /**
   * Commits the window choice and draws the opening draft pool; publishes `draftPoolRefreshed`.
   * @param id - the id of one of {@link Game.offeredPatterns}.
   * @throws {GameError} `invalidPhase` outside `patternSelection`; `unknownPattern` when `id` is
   *   not one of the offered patterns (message `unknown pattern id: "<id>"`). The game is
   *   unchanged after either.
   */
  choosePattern(id: string): void {
    this.#requirePhase('patternSelection')
    const chosen = this.offeredPatterns.find((p) => p.id === id)
    if (!chosen) throw new GameError({ kind: 'unknownPattern', id })
    this.#window = GlassWindow.fromPattern(chosen)
    this.#beginRoundDraft()
  }

  /**
   * Takes a visible die into the hand (it leaves the pool). Legal while the round is being
   * placed (`draft` or `place`); selecting again returns the held die to the end of the pool
   * first, so the hand always holds at most one (FR-3.3). Publishes no event.
   * @param die - the die to take; plain data is allowed, matched by colour and value (FR-4.3).
   * @throws {GameError} `invalidPhase` outside `draft`/`place`.
   * @throws {PlacementError} `dieNotInPool` when no visible die matches; hand and pool unchanged.
   */
  selectDie(die: DieData): void {
    this.#requirePlay()
    // Take first so a rejected selection cannot discard or reorder the hand.
    const selected = this.#draftPool.take(die)
    if (this.#hand !== null) {
      this.#draftPool.putBack([this.#hand])
    }
    this.#hand = selected
    this.#phase = 'place'
  }

  /**
   * Returns the selected die to the visible pool without consuming a turn. Publishes no event.
   * @throws {GameError} `invalidPhase` outside `place`.
   */
  cancelSelection(): void {
    this.#requirePhase('place')
    if (this.#hand !== null) this.#draftPool.putBack([this.#hand])
    this.#hand = null
    this.#phase = 'draft'
  }

  /**
   * Recasts the unplaced draft once per run (FR-3.6), from the same seeded bag. The held die
   * returns too. A partial round keeps its placements and draws only its existing number of
   * unplaced dice; this never adds turns or score. Publishes `draftPoolRefreshed`.
   * @throws {GameError} `invalidPhase` outside `draft`/`place`; `refreshSpent` when the recast is
   *   used. The game is unchanged after either.
   */
  refreshDraft(): void {
    this.#requirePlay()
    if (this.#refreshesRemaining === 0) throw new GameError({ kind: 'refreshSpent' })
    const unplaced = [...this.#draftPool.dice, ...(this.#hand === null ? [] : [this.#hand])]
    this.#bag.return(unplaced)
    this.#draftPool = new DraftPool(this.#bag.draw(unplaced.length))
    this.#hand = null
    this.#refreshesRemaining -= 1
    this.#phase = 'draft'
    this.notifyChanged(new DraftPoolRefreshedEvent(this, this.#draftPool.dice))
  }

  /**
   * Places the held die at the target and publishes `diePlaced`; the last placement of a round
   * then returns the unplaced dice, illuminates and advances (see {@link Game}). A placement that
   * breaks a law publishes `placementRejected` and then rethrows; window, hand and pool are
   * unchanged (NFR-2.1). Only a {@link PlacementError} is published: `outOfBounds` is a caller
   * defect, not a placement law, and is rethrown silently.
   * @param position - the target cell.
   * @throws {PlacementError} for the first broken law of the six (FR-4.9).
   * @throws {GameError} `invalidPhase` outside `place` or with an empty hand; `outOfBounds` for a
   *   target outside the grid.
   */
  placeDie(position: Position): void {
    this.#requirePhase('place')
    const die = this.#hand
    if (die === null) throw new GameError({ kind: 'invalidPhase' })
    const glass = this.#window!
    try {
      this.#validator.assertValid({
        grid: glass.dice,
        constraints: glass.constraints,
        pool: [die],
        die,
        target: position,
      })
    } catch (error) {
      if (error instanceof PlacementError) {
        this.notifyChanged(new PlacementRejectedEvent(this, position, error.violation))
      }
      throw error
    }

    glass.place(die, position)
    this.#hand = null
    this.#placementsThisRound += 1
    this.#phase = 'draft'
    this.notifyChanged(new DiePlacedEvent(this, position, die))

    if (this.#placementsThisRound === this.config.placementsPerRound) {
      this.#endRound()
    }
  }

  /**
   * Deadlock escape (FR-6.2): when no visible or held die has any legal placement, the round is
   * forfeited — the unplaced dice return to the bag and the beam still illuminates and scores the
   * existing glass, exactly as a played round would. Publishes `roundForfeited`, then the round's
   * `beamTraced`, `roundScored` and next `draftPoolRefreshed` (or `gameOver`).
   * @throws {GameError} `invalidPhase` outside `draft`/`place`; `legalMovesRemain` while any die
   *   fits. The game is unchanged after either.
   */
  forfeitRound(): void {
    this.#requirePlay()
    if (this.hasLegalMove()) throw new GameError({ kind: 'legalMovesRemain' })
    if (this.#hand !== null) {
      this.#draftPool.putBack([this.#hand])
      this.#hand = null
    }
    this.#bag.return(this.#draftPool.dice)
    this.#draftPool.clear()
    this.#phase = 'draft'
    this.notifyChanged(new RoundForfeitedEvent(this, this.#round))
    this.#illuminateAndAdvance()
  }

  /**
   * All legal cells for an available (visible or held) die; asks the validator per cell.
   * @param die - the die to test; plain data is allowed, matched by colour and value.
   * @returns the legal cells in row-major order; empty outside active play or for a die that is
   *   neither visible nor held.
   */
  legalPlacementsFor(die: DieData): readonly Position[] {
    const glass = this.#window
    if (glass === null || (this.#phase !== 'draft' && this.#phase !== 'place')) return []
    const available = [...this.#draftPool.dice, ...(this.#hand === null ? [] : [this.#hand])]
    if (!DraftPool.contains(available, die)) return []
    const positions: Position[] = []
    const grid = glass.dice
    for (let row = 0; row < glass.gridSize; row++) {
      for (let col = 0; col < glass.gridSize; col++) {
        const target: Position = { row, col }
        if (
          this.#validator.findViolation({
            grid,
            constraints: glass.constraints,
            pool: [die],
            die,
            target,
          }) === null
        ) {
          positions.push(target)
        }
      }
    }
    return positions
  }

  /**
   * Whether any visible or held die fits somewhere; selecting the last legal die cannot forfeit it.
   * @returns `true` when {@link Game.legalPlacementsFor} is non-empty for some available die.
   */
  hasLegalMove(): boolean {
    const available = [...this.#draftPool.dice, ...(this.#hand === null ? [] : [this.#hand])]
    return available.some((die) => this.legalPlacementsFor(die).length > 0)
  }

  /** Draws the round's pool, resets the round's placements and publishes `draftPoolRefreshed`. */
  #beginRoundDraft(): void {
    this.#draftPool = new DraftPool(this.#bag.draw(this.config.draftSize))
    this.#placementsThisRound = 0
    this.#phase = 'draft'
    this.notifyChanged(new DraftPoolRefreshedEvent(this, this.#draftPool.dice))
  }

  /** End of a played round: the unselected dice return to the bag, then illuminate. */
  #endRound(): void {
    this.#bag.return(this.#draftPool.dice)
    this.#draftPool.clear()
    this.#illuminateAndAdvance()
  }

  /**
   * Traces the beam from the announced entry, publishes `beamTraced` and `roundScored`, then
   * either scores the finished window and publishes `gameOver` (last round) or advances the
   * round and draws its pool.
   */
  #illuminateAndAdvance(): void {
    const glass = this.#window!
    const path = this.#beamTracer.trace(glass.dice, this.currentEntry)
    this.notifyChanged(new BeamTracedEvent(this, path))
    this.#roundScores.push(path.totalScore)
    this.#totalScore += path.totalScore
    this.notifyChanged(new RoundScoredEvent(this, this.#round, path.totalScore))

    if (this.#round === this.config.rounds) {
      // Final scoring: objectives over the finished window + beam totals (pitch §4).
      this.#report = this.#scoreCalculator.calculate({
        grid: glass.dice,
        objectives: this.objectives,
        beamTotal: this.#totalScore,
      })
      this.#phase = 'gameOver'
      this.notifyChanged(new GameOverEvent(this, this.#report))
      return
    }

    this.#round += 1
    this.#beginRoundDraft()
  }
}
