import { Direction } from './Direction'
import type { DirectionName } from './Direction'
import type { Position } from './Position'

/** Plain, serialisable form of an {@link EntryPoint}; the legacy engine shape. */
export interface EntryPointData {
  /** Edge cell where the beam is admitted. */
  readonly position: Position
  /** Compass name of the inward direction of travel. */
  readonly direction: DirectionName
}

/**
 * Where the beam enters: an edge cell plus the inward direction it travels (FR-5.1, FR-5.2).
 *
 * Immutable: the constructor copies `position` and freezes both the copy and the instance. The
 * constructor performs no grid validation; {@link EntryPoint.isInwardFor} reports whether an entry
 * is legal for a given grid, and the beam tracer rejects entries that are not.
 */
export class EntryPoint {
  /** Edge cell where the beam is admitted (a frozen copy of the constructor argument). */
  readonly position: Position

  /** Inward direction of travel on admission (FR-5.2). */
  readonly direction: Direction

  /**
   * Creates a frozen entry point; performs no grid validation (see {@link EntryPoint.isInwardFor}).
   * @param position - the edge cell; copied, so later mutation of the argument has no effect.
   * @param direction - the inward direction of travel.
   */
  constructor(position: Position, direction: Direction) {
    this.position = Object.freeze({ row: position.row, col: position.col })
    this.direction = direction
    Object.freeze(this)
  }

  /**
   * Every legal entry for an n×n grid, in the fixed reference order. Cells are scanned
   * row-major; for each cell the entries are pushed in this order: south if `row === 0`, west if
   * `col === last`, north if `row === last`, east if `col === 0`. Corners therefore admit two
   * entries; a 4×4 grid yields 16.
   *
   * The order is load-bearing: `Game` samples the round entries from this list with the seeded
   * RNG, so any reordering changes every entry sequence and the golden master. (The legacy TSDoc
   * on `allEntryPoints` said "N/E/S/W" and "20"; the code — S/W/N/E, 16 — is the oracle.)
   * @param gridSize - the side length n of the grid.
   * @returns a frozen array of new entry points.
   */
  static allFor(gridSize: number): readonly EntryPoint[] {
    const points: EntryPoint[] = []
    const last = gridSize - 1
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const position: Position = { row, col }
        if (row === 0) points.push(new EntryPoint(position, Direction.SOUTH))
        if (col === last) points.push(new EntryPoint(position, Direction.WEST))
        if (row === last) points.push(new EntryPoint(position, Direction.NORTH))
        if (col === 0) points.push(new EntryPoint(position, Direction.EAST))
      }
    }
    return Object.freeze(points)
  }

  /**
   * Whether this entry is one of {@link EntryPoint.allFor}(`gridSize`): an edge cell travelling
   * inward across that edge (south from row 0, west from the last column, north from the last
   * row, east from column 0).
   * @param gridSize - the side length n of the grid.
   * @returns true iff the cell lies in the grid on the edge that the direction crosses inward.
   */
  isInwardFor(gridSize: number): boolean {
    const { row, col } = this.position
    const last = gridSize - 1
    const inBounds =
      Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row <= last && col >= 0 && col <= last
    if (!inBounds) return false
    switch (this.direction) {
      case Direction.SOUTH:
        return row === 0
      case Direction.WEST:
        return col === last
      case Direction.NORTH:
        return row === last
      case Direction.EAST:
        return col === 0
      default:
        return false
    }
  }

  /**
   * Value equality: same row, column and direction.
   * @param other - the entry to compare with.
   * @returns true iff both entries denote the same cell and direction.
   */
  equals(other: EntryPoint): boolean {
    return (
      this.position.row === other.position.row &&
      this.position.col === other.position.col &&
      this.direction === other.direction
    )
  }

  /**
   * Rebuilds an entry from the plain shape.
   * @param data - `{ position, direction }` with a compass-name direction.
   * @returns a new frozen entry point.
   * @throws {GameError} `invalidArgument` for an unknown direction name (from {@link Direction.fromName}).
   */
  static fromData(data: EntryPointData): EntryPoint {
    return new EntryPoint(data.position, Direction.fromName(data.direction))
  }

  /**
   * The legacy plain shape used by the engine shims.
   * @returns a new `{ position, direction }` object with a fresh position copy and the compass name.
   */
  toData(): EntryPointData {
    return { position: { row: this.position.row, col: this.position.col }, direction: this.direction.name }
  }
}
