import { DIAGONAL_DELTAS, DIE_COLORS } from './types'
import type { Die, DieColor, Position } from './types'
import type { TierThresholds } from './config'
import type { DealtObjectives, PrivateObjective, PublicObjective } from './objectives'

/** A single itemized line of the final score (pitch §8.2 `ScoreReport`). */
export interface ScoreLine {
  readonly objectiveId: string
  readonly name: string
  readonly points: number
}

export type Tier = 'none' | 'bronze' | 'silver' | 'gold'

export interface ScoreReport {
  /** Three public lines then the private line, in deal order. */
  readonly lines: readonly ScoreLine[]
  readonly beamTotal: number
  readonly total: number
  readonly tier: Tier
}

type Grid = readonly (readonly (Die | null)[])[]

function dieAt(grid: Grid, row: number, col: number): Die | null {
  return grid[row]?.[col] ?? null
}

function lineDice(grid: Grid, axis: 'row' | 'col', index: number): (Die | null)[] {
  return axis === 'row' ? [...grid[index]!] : grid.map((row) => row[index]!)
}

/** Counts dice of one color anywhere on the window. */
export function colorCount(grid: Grid, color: DieColor): number {
  return grid.flat().filter((d) => d !== null && d.color === color).length
}

/**
 * Scores one public objective over the window (pitch §11). All four strategy
 * families live here; the strategy variant selects the computation, so adding a
 * new objective is data, not code.
 */
export function scorePublicObjective(grid: Grid, objective: PublicObjective): number {
  const s = objective.strategy
  switch (s.kind) {
    case 'valueParity': {
      const want = s.parity === 'odd' ? 1 : 0
      return grid
        .flat()
        .filter((d) => d !== null && d.value % 2 === want)
        .length * s.pointsPerDie
    }
    case 'lineDiversity': {
      const size = grid.length
      let points = 0
      for (let index = 0; index < size; index++) {
        const line = lineDice(grid, s.axis, index)
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
          const die = dieAt(grid, row, col)
          if (die === null) continue
          const position: Position = { row, col }
          const sameDiagonal = DIAGONAL_DELTAS.some((delta) => {
            const neighbor = dieAt(grid, position.row + delta.row, position.col + delta.col)
            return neighbor !== null && neighbor.color === die.color
          })
          if (!sameDiagonal) points += s.pointsPerDie
        }
      }
      return points
    }
    case 'colorQuorum': {
      return DIE_COLORS.filter((color) => colorCount(grid, color) >= s.minPerColor).length * s.pointsPerColor
    }
  }
}

/** The private color objective: the sum of values of the patron color. */
export function scorePrivateObjective(grid: Grid, objective: PrivateObjective): number {
  return grid
    .flat()
    .filter((d) => d !== null && d.color === objective.color)
    .reduce((sum, d) => sum + d!.value, 0)
}

/** Maps a final total onto the bronze/silver/gold tiers (pitch §10). */
export function tierFor(total: number, tiers: TierThresholds): Tier {
  if (total >= tiers.gold) return 'gold'
  if (total >= tiers.silver) return 'silver'
  if (total >= tiers.bronze) return 'bronze'
  return 'none'
}

/** Pure final scoring over a finished window: objectives + beam totals (pitch §4). */
export function calculateScore(input: {
  grid: Grid
  objectives: DealtObjectives
  beamTotal: number
  tiers: TierThresholds
}): ScoreReport {
  const { grid, objectives, beamTotal, tiers } = input
  const lines: ScoreLine[] = objectives.publics.map((o) => ({
    objectiveId: o.id,
    name: o.name,
    points: scorePublicObjective(grid, o),
  }))
  const privateLine: ScoreLine = {
    objectiveId: objectives.privateObjective.id,
    name: objectives.privateObjective.name,
    points: scorePrivateObjective(grid, objectives.privateObjective),
  }
  lines.push(privateLine)
  const objectiveTotal = lines.reduce((sum, line) => sum + line.points, 0)
  const total = beamTotal + objectiveTotal
  return { lines, beamTotal, total, tier: tierFor(total, tiers) }
}
