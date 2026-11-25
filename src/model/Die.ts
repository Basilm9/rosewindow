import { GameError } from './GameError'

/**
 * The five glass colors, in draft-pool display order.
 *
 * This order drives the dice-bag build (and therefore every seeded run and the golden master);
 * never reorder it.
 */
export const DIE_COLORS = ['red', 'yellow', 'blue', 'green', 'purple'] as const

/** One of the five glass colors in {@link DIE_COLORS}. */
export type DieColor = (typeof DIE_COLORS)[number]

/** Plain die data (e.g. parsed from a stored run); exactly what {@link Die.equals} compares. */
export interface DieData {
  /** Glass color. */
  readonly color: DieColor
  /** Printed face, 1–6. */
  readonly value: number
}

/**
 * An immutable colored die; `value` is the printed face, 1–6 (FR-3.2).
 *
 * Instances are frozen and their only own enumerable properties are `color` and `value`, so
 * `JSON.stringify(die)` is `{"color":…,"value":…}`. Equality is by color and value, never by
 * identity, so dice restored from JSON still match (FR-4.3). There is deliberately no instance
 * `equals`: it would stop plain `{color, value}` objects from being assignable to `Die`.
 * Always compare with the static {@link Die.equals}.
 */
export class Die implements DieData {
  /** Lowest printed face. */
  static readonly MIN_VALUE = 1

  /** Highest printed face. */
  static readonly MAX_VALUE = 6

  /** Glass color. */
  readonly color: DieColor

  /** Printed face, an integer from {@link Die.MIN_VALUE} to {@link Die.MAX_VALUE}. */
  readonly value: number

  /**
   * Validates the arguments, assigns them, then freezes the instance (NFR-2.6: restored data is
   * untrusted, so validation happens here rather than at each caller).
   * @param color - the glass color; must be one of {@link DIE_COLORS}.
   * @param value - the printed face; must be an integer 1–6.
   * @throws GameError `invalidArgument` if `color` is not in {@link DIE_COLORS} or `value` is
   *   not an integer from {@link Die.MIN_VALUE} to {@link Die.MAX_VALUE}.
   */
  constructor(color: DieColor, value: number) {
    if (!(DIE_COLORS as readonly string[]).includes(color)) {
      throw new GameError({ kind: 'invalidArgument', detail: `unknown die color "${color}"` })
    }
    if (!Number.isInteger(value) || value < Die.MIN_VALUE || value > Die.MAX_VALUE) {
      throw new GameError({
        kind: 'invalidArgument',
        detail: `die value ${value} is not an integer 1–6`,
      })
    }
    this.color = color
    this.value = value
    Object.freeze(this)
  }

  /**
   * Value equality: same color and same value. No `instanceof` check, so plain data restored
   * from a recording compares equal to a live die.
   * @param a - a die or plain die data.
   * @param b - a die or plain die data.
   * @returns `true` when both color and value match.
   */
  static equals(a: DieData, b: DieData): boolean {
    return a.color === b.color && a.value === b.value
  }

  /**
   * Rehydrates plain data (e.g. parsed JSON) into a validated, frozen die.
   * @param data - untrusted color/value data.
   * @returns a new {@link Die} with the same color and value.
   * @throws GameError `invalidArgument` if the data fails constructor validation.
   */
  static from(data: DieData): Die {
    return new Die(data.color, data.value)
  }

  /**
   * Short description such as `"red 3"`, used for ARIA labels; never parsed back.
   * @returns the color and value separated by a space.
   */
  toString(): string {
    return `${this.color} ${this.value}`
  }
}
