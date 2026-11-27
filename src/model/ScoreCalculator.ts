import { PROVISIONAL_TIERS } from './GameConfig'
import type { TierThresholds } from './GameConfig'
import type { DieGrid } from './GlassWindow'
import type { Objective } from './Objective'
import type { DealtObjectives } from './objectiveDeal'
import { ScoreReport } from './ScoreReport'
import type { ScoreLine, Tier } from './ScoreReport'

/** Inputs for final scoring; the grid is the finished window (`GlassWindow.dice`). */
export interface ScoreInput {
  /** The finished window: square die grid, row 0 north, column 0 west; `null` is an empty pane. */
  readonly grid: DieGrid
  /** The run's dealt objectives: three publics in deal order and the private one. */
  readonly objectives: DealtObjectives
  /** Sum of all round beam scores (equals the game's running total at game over). */
  readonly beamTotal: number
}

/**
 * Scores a finished window (FR-8.1): one line per dealt objective, the beam total and the tier
 * (FR-8.2 to FR-8.4). Every objective is scored through the {@link Objective} interface
 * (`objective.score(grid)`), never by inspecting its kind. Tier thresholds come only from the
 * frozen snapshot taken by the constructor (NFR-4.4); the calculator holds no run state between
 * calls, so one instance may score any number of windows.
 *
 * Exceptions: none — no member of this class throws.
 */
export class ScoreCalculator {
  /**
   * Frozen copy of the thresholds given to the constructor; later mutation of the caller's object
   * has no effect on this calculator.
   */
  readonly tiers: TierThresholds

  /**
   * Creates a calculator with a frozen snapshot of the tier thresholds.
   * @param tiers - bronze / silver / gold minimum totals; defaults to {@link PROVISIONAL_TIERS}
   *   (40 / 65 / 90). Copied and frozen.
   */
  constructor(tiers: TierThresholds = PROVISIONAL_TIERS) {
    this.tiers = Object.freeze({ bronze: tiers.bronze, silver: tiers.silver, gold: tiers.gold })
  }

  /**
   * Itemizes the three public lines in deal order then the private line, adds the beam total and
   * awards the tier for the grand total (FR-8.2 to FR-8.4). Pure: the grid and the objectives are
   * not mutated.
   * @param input - the finished window, the dealt objectives and the beam total.
   * @returns the frozen report; its total is `beamTotal` + Σ line points.
   */
  calculate(input: ScoreInput): ScoreReport {
    const { grid, objectives, beamTotal } = input
    const ordered: readonly Objective[] = [...objectives.publics, objectives.privateObjective]
    const lines: readonly ScoreLine[] = ordered.map((objective) => ({
      objectiveId: objective.id,
      name: objective.name,
      points: objective.score(grid),
    }))
    const total = beamTotal + lines.reduce((sum, line) => sum + line.points, 0)
    return new ScoreReport(lines, beamTotal, this.tierFor(total))
  }

  /**
   * Maps a grand total onto a tier. Every lower bound is inclusive (`>=`), compared from gold
   * downwards: `gold` if total ≥ gold; else `silver` if ≥ silver; else `bronze` if ≥ bronze; else
   * `'none'`. At the provisional thresholds: 39 → none, 40 → bronze, 64 → bronze, 65 → silver,
   * 89 → silver, 90 → gold.
   * @param total - the grand total (beam total plus all objective lines).
   * @returns the tier awarded against this calculator's {@link ScoreCalculator.tiers}.
   */
  tierFor(total: number): Tier {
    if (total >= this.tiers.gold) return 'gold'
    if (total >= this.tiers.silver) return 'silver'
    if (total >= this.tiers.bronze) return 'bronze'
    return 'none'
  }
}
