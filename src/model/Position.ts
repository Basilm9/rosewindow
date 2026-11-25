/** Grid coordinates; row 0 = north edge, col 0 = west edge. */
export interface Position {
  /** Zero-based row index; 0 is the north (top) edge. */
  readonly row: number
  /** Zero-based column index; 0 is the west (left) edge. */
  readonly col: number
}
