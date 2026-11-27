/**
 * One itemized line of the final score (FR-8.2): the points one dealt objective earned.
 */
export interface ScoreLine {
  /** Identifier of the objective this line scores (e.g. `even-values`, `patron-blue`). */
  readonly objectiveId: string
  /** Display name of the objective, as shown on the final report. */
  readonly name: string
  /** Points the objective earned over the finished window. */
  readonly points: number
}

/** Award band against `GameConfig.tiers` (FR-8.4); `'none'` below bronze. */
export type Tier = 'none' | 'bronze' | 'silver' | 'gold'

/**
 * The itemized final score carried by `GameOverEvent` (FR-8.1 to FR-8.4): the objective lines,
 * the beam total, the grand total and the tier. Immutable value: the lines are copied into fresh
 * frozen objects, the array is frozen and the instance is frozen.
 *
 * It never computes objectives or tiers (that is `ScoreCalculator`'s job); it only stores the
 * lines, the beam total and the tier, and derives {@link ScoreReport.total} as the beam total
 * plus the sum of the line points (FR-8.3).
 *
 * Own enumerable properties are exactly `lines`, `beamTotal`, `total`, `tier` in that order (the
 * other members live on the prototype), so an instance deep-equals the legacy plain report.
 *
 * Exceptions: none — no member of this class throws.
 */
export class ScoreReport {
  /** Three public lines then the private line, in deal order (frozen copies). */
  readonly lines: readonly ScoreLine[]

  /** Sum of all round beam scores (equals `Game.totalScore` at game over). */
  readonly beamTotal: number

  /** `beamTotal` + Σ `lines.points` (FR-8.3); derived, never passed in. */
  readonly total: number

  /** Tier awarded by `ScoreCalculator` against the run's tier thresholds. */
  readonly tier: Tier

  /**
   * Creates the frozen report: copies and freezes each line and the array, derives the total.
   * @param lines - the objective lines, publics in deal order then the private line.
   * @param beamTotal - the sum of the round beam scores.
   * @param tier - the tier the calculator awarded for the derived total.
   */
  constructor(lines: readonly ScoreLine[], beamTotal: number, tier: Tier) {
    this.lines = Object.freeze(
      lines.map((line) =>
        Object.freeze({ objectiveId: line.objectiveId, name: line.name, points: line.points }),
      ),
    )
    this.beamTotal = beamTotal
    this.total = beamTotal + this.lines.reduce((sum, line) => sum + line.points, 0)
    this.tier = tier
    Object.freeze(this)
  }

  /**
   * Sum of the line points: the objectives' share of the total, without the beam total.
   * @returns Σ `lines.points`; 0 when there are no lines.
   */
  get objectiveTotal(): number {
    return this.lines.reduce((sum, line) => sum + line.points, 0)
  }

  /**
   * The line that scores one objective.
   * @param objectiveId - the objective's identifier.
   * @returns the first line with that id, or `null` when no line has it.
   */
  lineFor(objectiveId: string): ScoreLine | null {
    return this.lines.find((line) => line.objectiveId === objectiveId) ?? null
  }
}
