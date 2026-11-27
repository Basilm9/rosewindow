import { Die, DIE_COLORS } from './Die'
import type { DieColor, DieData } from './Die'
import { GameError } from './GameError'

/** Discriminator of a printed demand; also its serialized tag. */
export type ConstraintKind = 'open' | 'color' | 'value'

/**
 * The printed demand on a window cell (FR-4.4, FR-4.5). Callers declare variables as this
 * interface and check a die polymorphically with {@link CellConstraint.accepts}; they never
 * switch on the concrete class to decide acceptance.
 */
export interface CellConstraint {
  /** Discriminator; also the serialized tag. */
  readonly kind: ConstraintKind
  /**
   * Whether `die` satisfies this printed demand (FR-4.4/4.5).
   * @param die - a {@link Die} or plain die data (e.g. restored from a recording).
   * @returns `true` when the die may be placed under this demand.
   */
  accepts(die: DieData): boolean
  /**
   * Player-facing text for rejection toasts (FR-4.11), e.g. "must be yellow", "must show 4",
   * "open".
   * @returns a short English description of the demand.
   */
  describe(): string
}

/**
 * A pane without a printed demand; it accepts every die. Its only own enumerable property is
 * `kind`, so it compares `toEqual({ kind: 'open' })` and serializes as `{"kind":"open"}`.
 */
export class OpenConstraint implements CellConstraint {
  /** Always `'open'`. */
  readonly kind = 'open'

  /** Creates and freezes an open demand. */
  constructor() {
    Object.freeze(this)
  }

  /**
   * Open panes impose no color or value restriction.
   * @param die - not inspected; declared so the signature matches {@link CellConstraint.accepts}.
   * @returns always `true`.
   */
  accepts(die: DieData): boolean {
    void die
    return true
  }

  /**
   * Describes the absence of a demand.
   * @returns `'open'`.
   */
  describe(): string {
    return 'open'
  }
}

/**
 * A printed color demand, independent of the die's value. Own enumerable data is exactly
 * `{ kind, color }`.
 */
export class ColorConstraint implements CellConstraint {
  /** Always `'color'`. */
  readonly kind = 'color'

  /** The glass color a die must have to be placed here. */
  readonly color: DieColor

  /**
   * Validates the color, assigns it, then freezes the instance.
   * @param color - the demanded glass color; must be one of {@link DIE_COLORS}.
   * @throws GameError `invalidArgument` if `color` is not in {@link DIE_COLORS}.
   */
  constructor(color: DieColor) {
    if (!(DIE_COLORS as readonly string[]).includes(color)) {
      throw new GameError({
        kind: 'invalidArgument',
        detail: `unknown constraint color "${String(color)}"`,
      })
    }
    this.color = color
    Object.freeze(this)
  }

  /**
   * Whether the die has the demanded color; its value is ignored.
   * @param die - a die or plain die data.
   * @returns `true` when `die.color` equals {@link ColorConstraint.color}.
   */
  accepts(die: DieData): boolean {
    return die.color === this.color
  }

  /**
   * Describes the color demand.
   * @returns e.g. `'must be yellow'`.
   */
  describe(): string {
    return `must be ${this.color}`
  }
}

/**
 * A printed value demand, independent of the die's color. Own enumerable data is exactly
 * `{ kind, value }`.
 */
export class ValueConstraint implements CellConstraint {
  /** Always `'value'`. */
  readonly kind = 'value'

  /** The face value, {@link Die.MIN_VALUE}–{@link Die.MAX_VALUE}, a die must show to be placed here. */
  readonly value: number

  /**
   * Validates the value, assigns it, then freezes the instance.
   * @param value - the demanded face; must be an integer from {@link Die.MIN_VALUE} to
   *   {@link Die.MAX_VALUE}.
   * @throws GameError `invalidArgument` unless `value` is an integer from {@link Die.MIN_VALUE}
   *   to {@link Die.MAX_VALUE}.
   */
  constructor(value: number) {
    if (!Number.isInteger(value) || value < Die.MIN_VALUE || value > Die.MAX_VALUE) {
      throw new GameError({
        kind: 'invalidArgument',
        detail: `constraint value ${value} is not an integer ${Die.MIN_VALUE}–${Die.MAX_VALUE}`,
      })
    }
    this.value = value
    Object.freeze(this)
  }

  /**
   * Whether the die shows the demanded value; its color is ignored.
   * @param die - a die or plain die data.
   * @returns `true` when `die.value` equals {@link ValueConstraint.value}.
   */
  accepts(die: DieData): boolean {
    return die.value === this.value
  }

  /**
   * Describes the value demand.
   * @returns e.g. `'must show 4'`.
   */
  describe(): string {
    return `must show ${this.value}`
  }
}
