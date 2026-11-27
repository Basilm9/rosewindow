import { ColorConstraint, OpenConstraint, ValueConstraint } from './CellConstraint'
import type { CellConstraint } from './CellConstraint'
import type { DieColor } from './Die'
import { GameError } from './GameError'
import { DEFAULT_GRID_SIZE } from './GameConfig'
import type { Position } from './Position'
import { SeededRandom } from './SeededRandom'
import type { Rng } from './SeededRandom'

/** Grid letter → printed colour demand (`R Y B G P`). */
const COLOR_BY_LETTER: Readonly<Record<string, DieColor>> = Object.freeze({
  R: 'red',
  Y: 'yellow',
  B: 'blue',
  G: 'green',
  P: 'purple',
})

/**
 * Parses one hand-authored row: `.` is open, `1`–`6` are value demands, `R Y B G P` are
 * colour demands. Length is unchecked here; {@link WindowPattern.parseConstraints} enforces
 * the square shape.
 * @param row - one row of grid letters.
 * @returns one constraint per character.
 * @throws GameError `malformedPattern` on any other character.
 */
function parseConstraintRow(row: string): CellConstraint[] {
  return [...row].map((ch): CellConstraint => {
    if (ch === '.') return new OpenConstraint()
    if (ch >= '1' && ch <= '6') return new ValueConstraint(Number(ch))
    const color = COLOR_BY_LETTER[ch]
    if (!color) {
      throw new GameError({ kind: 'malformedPattern', reason: `invalid pattern character: "${ch}"` })
    }
    return new ColorConstraint(color)
  })
}

/**
 * A named square arrangement of printed demands; two are offered per run (FR-1.1, FR-1.2).
 *
 * Validation happens at construction (NFR-1.3), and the catalog {@link ALL_PATTERNS} is built
 * while this module loads, so a malformed hand-authored pattern fails at load time with a
 * `GameError` of kind `malformedPattern` — never during play. Instances and their grids are
 * deeply frozen. Own enumerable data is exactly `{ id, name, description, constraints }`, so a
 * pattern is structurally identical to the reference interface it replaces.
 */
export class WindowPattern {
  /** Stable machine identifier, e.g. `'novice-rose'`; used in links and recordings. */
  readonly id: string

  /** Player-facing name, e.g. `'Novice Rose'`. */
  readonly name: string

  /** Player-facing flavour text shown on the setup screen. */
  readonly description: string

  /** Row-major, deeply frozen grid of demands; `constraints[row][col]`. */
  readonly constraints: readonly (readonly CellConstraint[])[]

  /**
   * Validates and freezes a pattern. The grid is copied, so the caller's arrays are neither
   * retained nor frozen.
   * @param id - non-empty identifier.
   * @param name - player-facing name.
   * @param description - player-facing flavour text.
   * @param constraints - a non-empty square grid of demands, row-major.
   * @throws GameError `malformedPattern` if `id` is empty, or the grid is empty or not square.
   */
  constructor(
    id: string,
    name: string,
    description: string,
    constraints: readonly (readonly CellConstraint[])[],
  ) {
    if (id.length === 0) {
      throw new GameError({ kind: 'malformedPattern', reason: 'pattern id must not be empty' })
    }
    if (constraints.length === 0) {
      throw new GameError({ kind: 'malformedPattern', reason: 'constraint grid must not be empty' })
    }
    if (constraints.some((row) => row.length !== constraints.length)) {
      throw new GameError({ kind: 'malformedPattern', reason: 'constraint grid must be square' })
    }
    this.id = id
    this.name = name
    this.description = description
    this.constraints = Object.freeze(constraints.map((row) => Object.freeze([...row])))
    Object.freeze(this)
  }

  /**
   * Builds a pattern from hand-authored rows (see {@link WindowPattern.parseConstraints} for
   * the letters). The row count is checked before any row is parsed, as in the reference.
   * @param id - non-empty identifier.
   * @param name - player-facing name.
   * @param description - player-facing flavour text.
   * @param rows - exactly `gridSize` strings of `gridSize` grid letters each.
   * @param gridSize - required side length; defaults to {@link DEFAULT_GRID_SIZE} (4), the
   *   single source of the default window size.
   * @returns a validated, frozen pattern.
   * @throws GameError `malformedPattern` when the row count is not `gridSize`, a character is
   *   invalid, or the grid is not square.
   */
  static fromRows(
    id: string,
    name: string,
    description: string,
    rows: readonly string[],
    gridSize: number = DEFAULT_GRID_SIZE,
  ): WindowPattern {
    if (rows.length !== gridSize) {
      throw new GameError({
        kind: 'malformedPattern',
        reason: `pattern "${id}" must have ${gridSize} rows`,
      })
    }
    return new WindowPattern(id, name, description, WindowPattern.parseConstraints(rows))
  }

  /**
   * Parses hand-authored rows into a square grid of any size (tests use 2×2, 3×3, 5×5):
   * `.` → {@link OpenConstraint}, `1`–`6` → {@link ValueConstraint}, `R Y B G P` →
   * {@link ColorConstraint}. The square check runs after every row has been parsed.
   * @param rows - one string of grid letters per row.
   * @returns a fresh, unfrozen row-major grid.
   * @throws GameError `malformedPattern` on an invalid character (`invalid pattern character`)
   *   or a non-square layout (`constraint grid must be square`).
   */
  static parseConstraints(rows: readonly string[]): CellConstraint[][] {
    const grid = rows.map(parseConstraintRow)
    if (grid.some((row) => row.length !== rows.length)) {
      throw new GameError({ kind: 'malformedPattern', reason: 'constraint grid must be square' })
    }
    return grid
  }

  /**
   * Side length of the square grid.
   * @returns the number of rows (equal to the number of columns).
   */
  get gridSize(): number {
    return this.constraints.length
  }

  /**
   * Number of printed demands.
   * @returns how many cells are not open.
   */
  get demandCount(): number {
    return this.constraints.flat().filter((c) => c.kind !== 'open').length
  }

  /**
   * The printed demand at a cell.
   * @param position - integer coordinates inside the grid.
   * @returns the demand at `position`.
   * @throws GameError `outOfBounds` when `position` is not integer or lies outside the grid.
   */
  constraintAt(position: Position): CellConstraint {
    const { row, col } = position
    const inside = (n: number) => Number.isInteger(n) && n >= 0 && n < this.gridSize
    if (!inside(row) || !inside(col)) {
      throw new GameError({ kind: 'outOfBounds', target: position })
    }
    return this.constraints[row]![col]!
  }

  /**
   * Two distinct catalog patterns for a run (FR-1.1), drawn with
   * `SeededRandom.sample(ALL_PATTERNS, 2, rng)`; deterministic for a given rng state.
   * @param rng - the run's injected random source; advanced by the draw.
   * @returns the two offered patterns, in draw order.
   */
  static offer(rng: Rng): [WindowPattern, WindowPattern] {
    const [a, b] = SeededRandom.sample(ALL_PATTERNS, 2, rng)
    return [a!, b!]
  }

  /**
   * Looks up a catalog pattern.
   * @param id - the pattern id, e.g. `'novice-rose'`.
   * @returns the catalog pattern with that id.
   * @throws GameError `unknownPattern` when no catalog pattern has `id`.
   */
  static byId(id: string): WindowPattern {
    const pattern = ALL_PATTERNS.find((p) => p.id === id)
    if (!pattern) throw new GameError({ kind: 'unknownPattern', id })
    return pattern
  }
}

/**
 * The six hand-authored window patterns (pitch §6), in frozen catalog order. Rows and order are
 * golden-master data: changing either moves every seeded run. Built at module load, so any
 * malformed entry throws `GameError` `malformedPattern` on import (NFR-1.3).
 *
 * Correction (Prompt 17): novice-rose's description said "Four demands" while its rows hold 3;
 * only that text was changed.
 */
export const ALL_PATTERNS: readonly WindowPattern[] = Object.freeze([
  WindowPattern.fromRows(
    'novice-rose',
    'Novice Rose',
    'A sparse first commission. Three demands, mostly free panes.',
    ['..5.', '....', 'Y...', '.3..'],
  ),
  WindowPattern.fromRows(
    'lancet',
    'Lancet',
    'Tall pointed lights pull color to the corners, values to the middle.',
    ['B..P', '..4.', '.2..', 'G..R'],
  ),
  WindowPattern.fromRows(
    'quatrefoil',
    'Quatrefoil',
    'Fourfold symmetry: low values in the corners, warm glass at the heart.',
    ['1..6', '.YB.', '.BY.', '6..1'],
  ),
  WindowPattern.fromRows(
    'tracery',
    'Tracery',
    'Ten printed demands woven through the stone.',
    ['R.2Y', '.5.P', 'P.4.', 'B3.G'],
  ),
  WindowPattern.fromRows(
    'clerestory',
    'Clerestory',
    'The high row of a great church: dense demands, little mercy.',
    ['2GY5', '.B.6', '4.P1', '3.R.'],
  ),
  WindowPattern.fromRows(
    'rose-majestic',
    'Rose Majestic',
    'The centerpiece window. Fourteen demands; almost nothing is free.',
    ['1RY6', 'B5.P', 'P.2B', '3GR4'],
  ),
])
