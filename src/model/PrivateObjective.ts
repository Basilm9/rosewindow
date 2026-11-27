import { DIE_COLORS } from './Die'
import type { DieColor } from './Die'
import type { DieGrid } from './GlassWindow'
import type { Objective } from './Objective'

/**
 * The private colour objective (FR-2.2, FR-2.5): the sum of the values of the patron colour's
 * dice. One of the five is dealt per run, after the three publics. Instances are frozen.
 *
 * Own enumerable properties are `kind`, `id`, `name`, `description`, `color` in that order, so an
 * instance serializes exactly as the legacy plain objective did (the view reads these fields).
 *
 * Exceptions: none — no member of this class throws.
 */
export class PrivateObjective implements Objective {
  /** Always `'private'`: this is the run's single secret objective. */
  readonly kind = 'private' as const

  /** Stable identifier `patron-<color>` (e.g. `patron-blue`); score lines refer to it. */
  readonly id: string

  /** Display name `Patron of <Color>` (e.g. `Patron of Blue`). */
  readonly name: string

  /** Rule text `Score the sum of values of your <color> dice.` */
  readonly description: string

  /** The patron colour whose dice score their values. */
  readonly color: DieColor

  /**
   * Creates the frozen private objective of one colour; id, name and description derive from it.
   * @param color - the patron colour.
   */
  constructor(color: DieColor) {
    this.id = `patron-${color}`
    this.name = `Patron of ${color[0]!.toUpperCase()}${color.slice(1)}`
    this.description = `Score the sum of values of your ${color} dice.`
    this.color = color
    Object.freeze(this)
  }

  /**
   * The five objectives, one per colour, in {@link DIE_COLORS} order (red, yellow, blue, green,
   * purple). The order is part of the seeded deal (it samples by index); never reorder it.
   */
  static readonly ALL: readonly PrivateObjective[] = Object.freeze(
    DIE_COLORS.map((color) => new PrivateObjective(color)),
  )

  /**
   * Wraps legacy plain data `{ color, … }`; only `color` is read, so id, name and description are
   * always the canonical ones for that colour. An instance is returned as it is.
   * @param data - an object carrying the patron colour.
   * @returns a frozen {@link PrivateObjective} for that colour.
   */
  static from(data: {
    /** The patron colour; any other field of the legacy data is ignored. */
    readonly color: DieColor
  }): PrivateObjective {
    if (data instanceof PrivateObjective) return data
    return new PrivateObjective(data.color)
  }

  /**
   * Sum of the values of the dice whose colour is {@link PrivateObjective.color}; empty panes and
   * other colours count nothing. Reference arithmetic (`scorePrivateObjective`). Pure: the grid is
   * not mutated.
   * @param grid - square die grid, row 0 north, column 0 west; `null` is an empty pane.
   * @returns the points; 0 when no die has the patron colour.
   */
  score(grid: DieGrid): number {
    return grid
      .flat()
      .filter((d) => d !== null && d.color === this.color)
      .reduce((sum, d) => sum + d!.value, 0)
  }
}
