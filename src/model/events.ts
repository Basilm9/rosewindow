import { ModelEvent } from '@mvc'
import type { AbstractModel } from '@mvc'
import type { BeamPath, LegacyBeamPathData } from './BeamPath'
import type { Die } from './Die'
import type { PlacementViolation } from './GameError'
import type { Position } from './Position'
import type { ScoreReport } from './ScoreReport'

/**
 * The seven semantic events `Game` publishes (MVC_RoseWindow.md §3). Each is an immutable
 * {@link ModelEvent} subclass whose `kind` literal and payload field names are exactly those of
 * the legacy `GameEvent` union in `src/engine/events.ts`, so consumers that narrow on
 * `event.kind` keep working unchanged when `Game` switches to these classes (prompt 47).
 *
 * `source` is inherited from {@link ModelEvent} as a non-enumerable property, so it never takes
 * part in `Object.keys`, spreading or `toEqual`. Every constructor copies its array/position
 * arguments and freezes the instance. No class here raises an exception.
 *
 * Every class offers `toData()`, returning the legacy plain union member (`kind` + payload, no
 * `source`); the `*Data` types below spell out those plain shapes inside the model package
 * (the model may not import `src/engine`).
 * @packageDocumentation
 */

/** Freezes a fresh copy of a grid position. */
function copyPosition(position: Position): Position {
  return Object.freeze({ row: position.row, col: position.col })
}

/** Freezes a copy of a violation, including a copy of any offending-neighbour list. */
function copyViolation(violation: PlacementViolation): PlacementViolation {
  if (violation.kind === 'adjacencyViolation') {
    return Object.freeze({
      kind: violation.kind,
      offendingNeighbors: Object.freeze(violation.offendingNeighbors.map(copyPosition)),
    })
  }
  return Object.freeze({ ...violation })
}

/** Legacy plain form of a {@link DiePlacedEvent}. */
export interface DiePlacedEventData {
  /** Discriminator. */
  readonly kind: 'diePlaced'
  /** Cell the die was committed to. */
  readonly position: Position
  /** The committed die. */
  readonly die: Die
}

/** Legacy plain form of a {@link PlacementRejectedEvent}. */
export interface PlacementRejectedEventData {
  /** Discriminator. */
  readonly kind: 'placementRejected'
  /** Cell the rejected placement targeted. */
  readonly position: Position
  /** The first broken law. */
  readonly violation: PlacementViolation
}

/** Legacy plain form of a {@link DraftPoolRefreshedEvent}. */
export interface DraftPoolRefreshedEventData {
  /** Discriminator. */
  readonly kind: 'draftPoolRefreshed'
  /** The dice now visible in the draft. */
  readonly dice: readonly Die[]
}

/** Legacy plain form of a {@link BeamTracedEvent}; `path` is in its plain form. */
export interface BeamTracedEventData {
  /** Discriminator. */
  readonly kind: 'beamTraced'
  /** The traced path as {@link BeamPath.toData} returns it. */
  readonly path: LegacyBeamPathData
}

/** Legacy plain form of a {@link RoundScoredEvent}. */
export interface RoundScoredEventData {
  /** Discriminator. */
  readonly kind: 'roundScored'
  /** The round that was scored (1-based). */
  readonly round: number
  /** Beam points added to the running total. */
  readonly delta: number
}

/** Legacy plain form of a {@link RoundForfeitedEvent}. */
export interface RoundForfeitedEventData {
  /** Discriminator. */
  readonly kind: 'roundForfeited'
  /** The forfeited round (1-based). */
  readonly round: number
}

/** Legacy plain form of a {@link GameOverEvent}. */
export interface GameOverEventData {
  /** Discriminator. */
  readonly kind: 'gameOver'
  /** The final itemized report. */
  readonly report: ScoreReport
}

/** Plain form of any {@link GameEvent}; structurally the legacy engine union. */
export type GameEventData =
  | DiePlacedEventData
  | PlacementRejectedEventData
  | DraftPoolRefreshedEventData
  | BeamTracedEventData
  | RoundScoredEventData
  | RoundForfeitedEventData
  | GameOverEventData

/**
 * A die was committed to a cell (FR-4.1).
 * View reaction: placement slam animation.
 */
export class DiePlacedEvent extends ModelEvent {
  /** Discriminator, identical to the legacy union. */
  readonly kind = 'diePlaced' as const

  /** Cell the die was committed to; a frozen copy of the argument. */
  readonly position: Position

  /** The committed die (immutable value object). */
  readonly die: Die

  /**
   * Copies the position and freezes the event.
   * @param source - the publishing model.
   * @param position - the target cell; copied.
   * @param die - the committed die.
   */
  constructor(source: AbstractModel<GameEvent>, position: Position, die: Die) {
    super(source)
    this.position = copyPosition(position)
    this.die = die
    Object.freeze(this)
  }

  /**
   * The legacy plain union member.
   * @returns a new `{ kind, position, die }` object without `source`.
   */
  toData(): DiePlacedEventData {
    return { kind: this.kind, position: this.position, die: this.die }
  }
}

/**
 * A placement broke a law (FR-4.10, FR-4.11); `violation` carries the law's kind and, for the
 * adjacency law, the offending neighbours.
 * View reaction: shake, red pulse, toast naming the law, outline the offending neighbours.
 */
export class PlacementRejectedEvent extends ModelEvent {
  /** Discriminator, identical to the legacy union. */
  readonly kind = 'placementRejected' as const

  /** Cell the rejected placement targeted; a frozen copy of the argument. */
  readonly position: Position

  /** The first broken law; a frozen copy (neighbour list copied too). */
  readonly violation: PlacementViolation

  /**
   * Copies the position and violation and freezes the event.
   * @param source - the publishing model.
   * @param position - the targeted cell; copied.
   * @param violation - the first broken law; copied.
   */
  constructor(source: AbstractModel<GameEvent>, position: Position, violation: PlacementViolation) {
    super(source)
    this.position = copyPosition(position)
    this.violation = copyViolation(violation)
    Object.freeze(this)
  }

  /**
   * The legacy plain union member.
   * @returns a new `{ kind, position, violation }` object without `source`.
   */
  toData(): PlacementRejectedEventData {
    return { kind: this.kind, position: this.position, violation: this.violation }
  }
}

/**
 * A fresh or recast draft is visible.
 * View reaction: deal-in animation of the tray.
 */
export class DraftPoolRefreshedEvent extends ModelEvent {
  /** Discriminator, identical to the legacy union. */
  readonly kind = 'draftPoolRefreshed' as const

  /** The dice now in the draft, in tray order; a frozen copy of the argument. */
  readonly dice: readonly Die[]

  /**
   * Copies the dice array and freezes the event.
   * @param source - the publishing model.
   * @param dice - the visible draft; copied, so later mutation of the argument has no effect.
   */
  constructor(source: AbstractModel<GameEvent>, dice: readonly Die[]) {
    super(source)
    this.dice = Object.freeze([...dice])
    Object.freeze(this)
  }

  /**
   * The legacy plain union member.
   * @returns a new `{ kind, dice }` object without `source`.
   */
  toData(): DraftPoolRefreshedEventData {
    return { kind: this.kind, dice: this.dice }
  }
}

/**
 * The round's beam was traced (FR-5.10).
 * View reaction: beam animation paced by the beam statechart.
 */
export class BeamTracedEvent extends ModelEvent {
  /** Discriminator, identical to the legacy union. */
  readonly kind = 'beamTraced' as const

  /** The traced path (already immutable). */
  readonly path: BeamPath

  /**
   * Stores the path and freezes the event.
   * @param source - the publishing model.
   * @param path - the traced beam path.
   */
  constructor(source: AbstractModel<GameEvent>, path: BeamPath) {
    super(source)
    this.path = path
    Object.freeze(this)
  }

  /**
   * The legacy plain union member, with the path in plain form.
   * @returns a new `{ kind, path: path.toData() }` object without `source`.
   */
  toData(): BeamTracedEventData {
    return { kind: this.kind, path: this.path.toData() }
  }
}

/**
 * Beam points were added to the running total (FR-5.11).
 * View reaction: score count-up and round pip.
 */
export class RoundScoredEvent extends ModelEvent {
  /** Discriminator, identical to the legacy union. */
  readonly kind = 'roundScored' as const

  /** The scored round (1-based). */
  readonly round: number

  /** Beam points added to the running total. */
  readonly delta: number

  /**
   * Stores the payload and freezes the event.
   * @param source - the publishing model.
   * @param round - the scored round (1-based).
   * @param delta - the beam points added.
   */
  constructor(source: AbstractModel<GameEvent>, round: number, delta: number) {
    super(source)
    this.round = round
    this.delta = delta
    Object.freeze(this)
  }

  /**
   * The legacy plain union member.
   * @returns a new `{ kind, round, delta }` object without `source`.
   */
  toData(): RoundScoredEventData {
    return { kind: this.kind, round: this.round, delta: this.delta }
  }
}

/**
 * A deadlocked round was forfeited (FR-6.2, FR-6.5).
 * View reaction: forfeit banner.
 */
export class RoundForfeitedEvent extends ModelEvent {
  /** Discriminator, identical to the legacy union. */
  readonly kind = 'roundForfeited' as const

  /** The forfeited round (1-based). */
  readonly round: number

  /**
   * Stores the round and freezes the event.
   * @param source - the publishing model.
   * @param round - the forfeited round (1-based).
   */
  constructor(source: AbstractModel<GameEvent>, round: number) {
    super(source)
    this.round = round
    Object.freeze(this)
  }

  /**
   * The legacy plain union member.
   * @returns a new `{ kind, round }` object without `source`.
   */
  toData(): RoundForfeitedEventData {
    return { kind: this.kind, round: this.round }
  }
}

/**
 * The final report after round 8 (FR-8.1).
 * View reaction: results screen.
 */
export class GameOverEvent extends ModelEvent {
  /** Discriminator, identical to the legacy union. */
  readonly kind = 'gameOver' as const

  /** The final itemized report (already immutable). */
  readonly report: ScoreReport

  /**
   * Stores the report and freezes the event.
   * @param source - the publishing model.
   * @param report - the final score report.
   */
  constructor(source: AbstractModel<GameEvent>, report: ScoreReport) {
    super(source)
    this.report = report
    Object.freeze(this)
  }

  /**
   * The legacy plain union member.
   * @returns a new `{ kind, report }` object without `source`.
   */
  toData(): GameOverEventData {
    return { kind: this.kind, report: this.report }
  }
}

/** Every event `Game` publishes; narrow on `kind`. */
export type GameEvent =
  | DiePlacedEvent
  | PlacementRejectedEvent
  | DraftPoolRefreshedEvent
  | BeamTracedEvent
  | RoundScoredEvent
  | RoundForfeitedEvent
  | GameOverEvent
