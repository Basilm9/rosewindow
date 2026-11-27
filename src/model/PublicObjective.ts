import { DIE_COLORS } from './Die'
import type { Die, DieColor } from './Die'
import type { DieGrid } from './GlassWindow'
import type { Objective } from './Objective'
import { DIAGONAL_DELTAS } from './Position'

/**
 * Public objective strategies (pitch §11 families). Each variant carries its own scoring
 * parameters, so {@link PublicObjective.score} executes any of them without special cases and
 * adding an objective is data, not code. Point values are provisional until the playtest.
 */
export type PublicObjectiveStrategy =
  | {
      /** Family: count dice by the parity of their value. */
      readonly kind: 'valueParity'
      /** Which parity scores. */
      readonly parity: 'odd' | 'even'
      /** Points for each die of that parity. */
      readonly pointsPerDie: number
    }
  | {
      /** Family: full rows or columns whose dice all differ in one trait. */
      readonly kind: 'lineDiversity'
      /** Rows (`'row'`) or columns (`'col'`). */
      readonly axis: 'row' | 'col'
      /** The trait that must differ along the line. */
      readonly trait: 'color' | 'value'
      /** Points for each qualifying line. */
      readonly pointsPerLine: number
    }
  | {
      /** Family: dice sharing their colour with none of their diagonal neighbours. */
      readonly kind: 'diagonalDiversity'
      /** The compared trait (colour only). */
      readonly trait: 'color'
      /** Points for each qualifying die. */
      readonly pointsPerDie: number
    }
  | {
      /** Family: colours present at least a minimum number of times. */
      readonly kind: 'colorQuorum'
      /** Dice of one colour needed for that colour to count. */
      readonly minPerColor: number
      /** Points for each colour that meets the quorum. */
      readonly pointsPerColor: number
    }

/**
 * One of the eight public objectives (FR-2.1); three are dealt per run. The rule is strategy
 * data ({@link PublicObjective.strategy}); {@link PublicObjective.score} switches on
 * `strategy.kind` only. Instances (and their strategies) are frozen.
 *
 * Own enumerable properties are `kind`, `id`, `name`, `description`, `strategy` in that order,
 * so an instance serializes exactly as the legacy plain objective did.
 *
 * Exceptions: none — no member of this class throws.
 */
export class PublicObjective implements Objective {
  /** Always `'public'`: this is one of the shared objectives. */
  readonly kind = 'public' as const

  /** Stable identifier (e.g. `odd-values`); score lines and stored runs refer to it. */
  readonly id: string

  /** Display name shown on the objective card and the score report. */
  readonly name: string

  /** One-sentence rule text shown to the player. */
  readonly description: string

  /** The scoring family and its parameters (frozen copy of the value given). */
  readonly strategy: PublicObjectiveStrategy

  /**
   * Creates a frozen public objective.
   * @param id - stable identifier.
   * @param name - display name.
   * @param description - rule text.
   * @param strategy - scoring family and parameters; copied and frozen.
   */
  constructor(id: string, name: string, description: string, strategy: PublicObjectiveStrategy) {
    this.id = id
    this.name = name
    this.description = description
    this.strategy = Object.freeze({ ...strategy })
    Object.freeze(this)
  }

  /**
   * The eight objectives, in reference order (odd-values … balanced-palette). The order is part
   * of the seeded deal (it samples by index); never reorder it.
   */
  static readonly ALL: readonly PublicObjective[] = Object.freeze([
    new PublicObjective('odd-values', 'Odd Values', 'Score 1 point per die with an odd value.', {
      kind: 'valueParity',
      parity: 'odd',
      pointsPerDie: 1,
    }),
    new PublicObjective('even-values', 'Even Values', 'Score 1 point per die with an even value.', {
      kind: 'valueParity',
      parity: 'even',
      pointsPerDie: 1,
    }),
    new PublicObjective(
      'row-color-variety',
      'Row Color Variety',
      'Score 5 points for each row whose four dice all differ in color.',
      { kind: 'lineDiversity', axis: 'row', trait: 'color', pointsPerLine: 5 },
    ),
    new PublicObjective(
      'column-color-variety',
      'Column Color Variety',
      'Score 5 points for each column whose four dice all differ in color.',
      { kind: 'lineDiversity', axis: 'col', trait: 'color', pointsPerLine: 5 },
    ),
    new PublicObjective(
      'row-value-variety',
      'Row Value Variety',
      'Score 4 points for each row whose four dice all differ in value.',
      { kind: 'lineDiversity', axis: 'row', trait: 'value', pointsPerLine: 4 },
    ),
    new PublicObjective(
      'column-value-variety',
      'Column Value Variety',
      'Score 4 points for each column whose four dice all differ in value.',
      { kind: 'lineDiversity', axis: 'col', trait: 'value', pointsPerLine: 4 },
    ),
    new PublicObjective(
      'diagonal-color-variety',
      'Diagonal Color Variety',
      'Score 1 point for each die that shares its color with none of its diagonal neighbors.',
      { kind: 'diagonalDiversity', trait: 'color', pointsPerDie: 1 },
    ),
    new PublicObjective(
      'balanced-palette',
      'Balanced Palette',
      'Score 3 points for each color of which at least 2 dice are placed.',
      { kind: 'colorQuorum', minPerColor: 2, pointsPerColor: 3 },
    ),
  ])

  /**
   * Wraps plain legacy data `{ id, name, description, strategy }` (any extra fields, such as a
   * legacy `kind`, are ignored). An instance is returned as it is.
   * @param data - the objective's identity and strategy.
   * @returns a frozen {@link PublicObjective} with the same id, name, description and strategy.
   */
  static from(data: Omit<PublicObjective, 'kind' | 'score'>): PublicObjective {
    if (data instanceof PublicObjective) return data
    return new PublicObjective(data.id, data.name, data.description, data.strategy)
  }

  /**
   * Dice of one colour anywhere on the grid (used by colorQuorum and the view).
   * @param grid - die grid; `null` cells are empty panes.
   * @param color - the colour to count.
   * @returns the number of dice of that colour.
   */
  static colorCount(grid: DieGrid, color: DieColor): number {
    return grid.flat().filter((d) => d !== null && d.color === color).length
  }

  /**
   * The die at a cell, or `null` for an empty pane or a position off the grid.
   * @param grid - die grid.
   * @param row - zero-based row.
   * @param col - zero-based column.
   * @returns the die, or `null`.
   */
  static #dieAt(grid: DieGrid, row: number, col: number): Die | null {
    return grid[row]?.[col] ?? null
  }

  /**
   * The cells of one row or column, in order.
   * @param grid - square die grid.
   * @param axis - `'row'` for a row, `'col'` for a column.
   * @param index - zero-based row or column index.
   * @returns the line's cells (`null` for empty panes).
   */
  static #lineDice(grid: DieGrid, axis: 'row' | 'col', index: number): (Die | null)[] {
    return axis === 'row' ? [...grid[index]!] : grid.map((row) => row[index]!)
  }

  /**
   * Scores the grid; empty cells never count. Arithmetic is the reference scorer's
   * (`scorePublicObjective`), family by family:
   * - `valueParity`: dice with an odd (or even) value × `pointsPerDie`;
   * - `lineDiversity`: each full row/column whose trait (colour or value) set size equals the
   *   line length earns `pointsPerLine`; a line with an empty cell is skipped;
   * - `diagonalDiversity`: each die whose four diagonal neighbours share no colour with it earns
   *   `pointsPerDie` (a lone die counts);
   * - `colorQuorum`: colours with at least `minPerColor` dice × `pointsPerColor`.
   *
   * Pure: the grid is not mutated.
   * @param grid - square die grid, row 0 north, column 0 west; `null` is an empty pane.
   * @returns the points, never negative.
   */
  score(grid: DieGrid): number {
    const s = this.strategy
    switch (s.kind) {
      case 'valueParity': {
        const want = s.parity === 'odd' ? 1 : 0
        return grid.flat().filter((d) => d !== null && d.value % 2 === want).length * s.pointsPerDie
      }
      case 'lineDiversity': {
        const size = grid.length
        let points = 0
        for (let index = 0; index < size; index++) {
          const line = PublicObjective.#lineDice(grid, s.axis, index)
          if (line.some((d) => d === null)) continue
          const traits = line.map((d) => (s.trait === 'color' ? d!.color : d!.value))
          if (new Set(traits).size === line.length) points += s.pointsPerLine
        }
        return points
      }
      case 'diagonalDiversity': {
        let points = 0
        for (let row = 0; row < grid.length; row++) {
          for (let col = 0; col < grid.length; col++) {
            const die = PublicObjective.#dieAt(grid, row, col)
            if (die === null) continue
            const sameDiagonal = DIAGONAL_DELTAS.some((delta) => {
              const neighbor = PublicObjective.#dieAt(grid, row + delta.row, col + delta.col)
              return neighbor !== null && neighbor.color === die.color
            })
            if (!sameDiagonal) points += s.pointsPerDie
          }
        }
        return points
      }
      case 'colorQuorum': {
        return (
          DIE_COLORS.filter((color) => PublicObjective.colorCount(grid, color) >= s.minPerColor)
            .length * s.pointsPerColor
        )
      }
    }
  }
}
