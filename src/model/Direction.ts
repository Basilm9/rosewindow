import { GameError } from './GameError'
import type { Position } from './Position'

/** The four compass names, in clockwise order starting north. */
export const DIRECTION_NAMES = ['north', 'east', 'south', 'west'] as const

/** One of the four compass names in {@link DIRECTION_NAMES}. */
export type DirectionName = (typeof DIRECTION_NAMES)[number]

/**
 * A compass direction of beam travel (FR-5.2); exactly four instances exist.
 *
 * The constructor is private and every instance is frozen, so {@link Direction.NORTH},
 * {@link Direction.EAST}, {@link Direction.SOUTH} and {@link Direction.WEST} are the only
 * directions there will ever be, and identity (`===`) is valid equality. Grid convention:
 * north DECREASES the row, east INCREASES the column.
 */
export class Direction {
  /** Toward row 0 (the top edge): row −1, column 0. */
  static readonly NORTH = new Direction('north', -1, 0)

  /** Toward the last column (the right edge): row 0, column +1. */
  static readonly EAST = new Direction('east', 0, 1)

  /** Toward the last row (the bottom edge): row +1, column 0. */
  static readonly SOUTH = new Direction('south', 1, 0)

  /** Toward column 0 (the left edge): row 0, column −1. */
  static readonly WEST = new Direction('west', 0, -1)

  /**
   * All four, clockwise from {@link Direction.NORTH}. Declared after the four instances so they
   * exist when this array is built; rotation indexes into this order.
   */
  static readonly ALL: readonly Direction[] = Object.freeze([
    Direction.NORTH,
    Direction.EAST,
    Direction.SOUTH,
    Direction.WEST,
  ])

  /** The compass name, e.g. `"east"`; what the legacy string API and the view use. */
  readonly name: DirectionName

  /** Row change for one step: −1 north, +1 south, 0 east/west. */
  readonly rowDelta: number

  /** Column change for one step: +1 east, −1 west, 0 north/south. */
  readonly colDelta: number

  /**
   * Private: only the four static instances are ever created. Assigns the fields, then freezes
   * the instance.
   * @param name - the compass name.
   * @param rowDelta - row change for one step in this direction.
   * @param colDelta - column change for one step in this direction.
   */
  private constructor(name: DirectionName, rowDelta: number, colDelta: number) {
    this.name = name
    this.rowDelta = rowDelta
    this.colDelta = colDelta
    Object.freeze(this)
  }

  /**
   * The unit step as a position offset.
   * @returns a new `{ row: rowDelta, col: colDelta }` object.
   */
  get delta(): Position {
    return { row: this.rowDelta, col: this.colDelta }
  }

  /**
   * 90° clockwise: N→E→S→W→N (warm glass, FR-5.4).
   * @returns the next instance in {@link Direction.ALL} order.
   */
  clockwise(): Direction {
    return Direction.ALL[(Direction.ALL.indexOf(this) + 1) % 4]!
  }

  /**
   * 90° counter-clockwise: N→W→S→E→N (cool glass, FR-5.4).
   * @returns the previous instance in {@link Direction.ALL} order.
   */
  counterClockwise(): Direction {
    return Direction.ALL[(Direction.ALL.indexOf(this) + 3) % 4]!
  }

  /**
   * The neighbouring position one step from `from` in this direction. No bounds check: the
   * result may lie outside the grid (that is how the beam detects leaving the window).
   * @param from - the starting position.
   * @returns a new position offset by {@link Direction.delta}.
   */
  step(from: Position): Position {
    return { row: from.row + this.rowDelta, col: from.col + this.colDelta }
  }

  /**
   * Looks up an instance by its compass name.
   * @param name - one of {@link DIRECTION_NAMES}.
   * @returns the matching static instance (identity-comparable).
   * @throws GameError `invalidArgument` for any other name, e.g. `"up"`.
   */
  static fromName(name: string): Direction {
    const found = Direction.ALL.find((direction) => direction.name === name)
    if (!found) {
      throw new GameError({ kind: 'invalidArgument', detail: `unknown direction "${name}"` })
    }
    return found
  }

  /**
   * The compass name.
   * @returns the name, e.g. `"east"`.
   */
  toString(): string {
    return this.name
  }
}
