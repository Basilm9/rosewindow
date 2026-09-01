import type { GameConfig } from './config'
import { DiceBag } from './diceBag'
import { DraftPool } from './draftPool'
import { GameError } from './errors'
import type { PlacementError, PlacementViolation } from './errors'
import type { GameEvent, GameListener } from './events'
import { GlassWindow } from './glassWindow'
import { assertPlacementValid } from './placementValidator'
import { mulberry32 } from './rng'
import { offerPatterns } from './patterns'
import { sample } from './sample'
import { traceBeam } from './beamTracer'
import { allEntryPoints } from './types'
import { dealObjectives } from './objectives'
import type { DealtObjectives } from './objectives'
import { calculateScore } from './scoreCalculator'
import type { ScoreReport } from './scoreCalculator'
import type { Die, EntryPoint, WindowPattern } from './types'

/** The game's phases (pitch §10, compressed for the headless model). */
export type GamePhase = 'patternSelection' | 'draft' | 'place' | 'gameOver'

/**
 * The model's public API (pitch §8.2 `Game`): round clock, phase orchestration,
 * and the semantic event stream. Every rule is delegated to the pure engine
 * functions; this class only sequences them. Playable with no view attached.
 *
 * Round flow (pitch §4): draw `draftSize` dice -> select one -> place -> repeat
 * until `placementsPerRound` are placed -> refresh (unselected dice return) ->
 * illuminate (trace the beam from the announced entry, score it) -> announce the
 * next entry and draw the next pool.
 */
export class Game {
  readonly config: GameConfig
  readonly offeredPatterns: readonly [WindowPattern, WindowPattern]
  readonly objectives: DealtObjectives
  readonly entrySequence: readonly EntryPoint[]

  #phase: GamePhase = 'patternSelection'
  #round = 1
  #window: GlassWindow | null = null
  #draftPool = new DraftPool([])
  #hand: Die | null = null
  #placementsThisRound = 0
  #roundScores: number[] = []
  #totalScore = 0
  #report: ScoreReport | null = null
  #bag: DiceBag
  #listeners = new Set<GameListener>()

  constructor(config: GameConfig) {
    this.config = config
    const rng = mulberry32(config.seed)
    this.#bag = new DiceBag(config, rng)
    this.offeredPatterns = offerPatterns(rng)
    this.objectives = dealObjectives(rng)
    this.entrySequence = sample(allEntryPoints(config.gridSize), config.rounds, rng)
  }

  subscribe(listener: GameListener): () => void {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  #emit(event: GameEvent): void {
    for (const listener of this.#listeners) listener(event)
  }

  get phase(): GamePhase {
    return this.#phase
  }

  get round(): number {
    return this.#round
  }

  get window(): GlassWindow | null {
    return this.#window
  }

  get draftPool(): DraftPool {
    return this.#draftPool
  }

  get hand(): Die | null {
    return this.#hand
  }

  /** The entry point announced for the current round. */
  get currentEntry(): EntryPoint {
    return this.entrySequence[this.#round - 1]!
  }

  get roundScores(): readonly number[] {
    return this.#roundScores
  }

  get totalScore(): number {
    return this.#totalScore
  }

  /**
   * The itemized final score once the game is over (null during play).
   * `totalScore` remains the running beam total; the final score is
   * `report.total` = beam totals + objectives (pitch §4).
   */
  get report(): ScoreReport | null {
    return this.#report
  }

  #requirePhase(phase: GamePhase): void {
    if (this.#phase !== phase) {
      throw new GameError({ kind: 'invalidPhase' })
    }
  }

  /** Commits the window choice and draws the opening draft pool. */
  choosePattern(id: string): void {
    this.#requirePhase('patternSelection')
    const chosen = this.offeredPatterns.find((p) => p.id === id)
    if (!chosen) throw new Error(`unknown pattern id: "${id}"`)
    this.#window = GlassWindow.fromPattern(chosen)
    this.#beginRoundDraft()
  }

  /**
   * Takes a visible die into the hand (it leaves the pool). Legal while the
   * round is being placed (`draft` or `place`); selecting again returns the
   * held die to the pool first, so the hand always holds at most one.
   */
  selectDie(die: Die): void {
    if (this.#phase !== 'draft' && this.#phase !== 'place') {
      throw new GameError({ kind: 'invalidPhase' })
    }
    if (this.#hand !== null) {
      this.#draftPool.putBack([this.#hand])
      this.#hand = null
    }
    this.#hand = this.#draftPool.take(die)
    this.#phase = 'place'
  }

  /**
   * Places the held die at the target. Illegal placements throw `PlacementError`
   * (and emit `placementRejected`); the die stays in hand, unconsumed.
   */
  placeDie(position: { readonly row: number; readonly col: number }): void {
    this.#requirePhase('place')
    const die = this.#hand
    if (die === null) throw new GameError({ kind: 'invalidPhase' })
    try {
      assertPlacementValid({
        grid: this.#window!.dice,
        constraints: this.#window!.constraints,
        pool: [die],
        die,
        target: position,
      })
    } catch (error) {
      const placementError = error as PlacementError
      if (placementError instanceof GameError && 'violation' in placementError) {
        this.#emit({
          kind: 'placementRejected',
          position,
          violation: placementError.violation as PlacementViolation,
        })
      }
      throw error
    }

    this.#window!.place(die, position)
    this.#hand = null
    this.#placementsThisRound += 1
    this.#phase = 'draft'
    this.#emit({ kind: 'diePlaced', position, die })

    if (this.#placementsThisRound === this.config.placementsPerRound) {
      this.#endRound()
    }
  }

  #beginRoundDraft(): void {
    this.#draftPool = new DraftPool(this.#bag.draw(this.config.draftSize))
    this.#placementsThisRound = 0
    this.#phase = 'draft'
    this.#emit({ kind: 'draftPoolRefreshed', dice: this.#draftPool.dice })
  }

  #endRound(): void {
    // Refresh: unselected dice return to the bag.
    this.#bag.return(this.#draftPool.dice)
    this.#draftPool.clear()

    // Illuminate: trace the beam from the announced entry and score the path.
    const path = traceBeam(this.#window!.dice, this.currentEntry, this.config.multiplierCap)
    this.#emit({ kind: 'beamTraced', path })
    this.#roundScores.push(path.totalScore)
    this.#totalScore += path.totalScore
    this.#emit({ kind: 'roundScored', round: this.#round, delta: path.totalScore })

    if (this.#round === this.config.rounds) {
      // Final scoring: objectives over the finished window + beam totals (pitch §4).
      this.#report = calculateScore({
        grid: this.#window!.dice,
        objectives: this.objectives,
        beamTotal: this.#totalScore,
        tiers: this.config.tiers,
      })
      this.#phase = 'gameOver'
      this.#emit({ kind: 'gameOver', report: this.#report })
      return
    }

    this.#round += 1
    this.#beginRoundDraft()
  }
}
