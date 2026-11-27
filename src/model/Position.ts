/** Grid coordinates; row 0 = north edge, col 0 = west edge. */
export interface Position {
  /** Zero-based row index; 0 is the north (top) edge. */
  readonly row: number
  /** Zero-based column index; 0 is the west (left) edge. */
  readonly col: number
}

/**
 * The four orthogonal neighbour offsets, in N, S, W, E order — the adjacency law uses
 * only these. The order fixes the order of `adjacencyViolation.offendingNeighbors`; never
 * reorder it.
 */
export const ORTHOGONAL_DELTAS: readonly Position[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
]

/**
 * The four diagonal offsets, in NW, NE, SW, SE order — the connectivity law uses orthogonals
 * plus these.
 */
export const DIAGONAL_DELTAS: readonly Position[] = [
  { row: -1, col: -1 },
  { row: -1, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 1 },
]
