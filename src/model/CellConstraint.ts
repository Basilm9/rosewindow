/** Provisional; Prompt 15 narrows `accepts` to `(die: DieData) => boolean`. */
export interface CellConstraint {
  /** Which family of printed demand this is: none, a colour, or a value. */
  readonly kind: 'open' | 'color' | 'value'
  /** Whether a die with this colour and value satisfies the printed demand. */
  accepts(die: {
    /** The die's glass colour. */
    readonly color: string
    /** The die's printed face, 1–6. */
    readonly value: number
  }): boolean
}
