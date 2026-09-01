import {
  colorConstraint,
  openConstraint,
  valueConstraint,
} from './types'
import type { CellConstraint, DieColor, WindowPattern } from './types'
import { sample } from './sample'
import type { Rng } from './rng'

const COLOR_BY_LETTER: Readonly<Record<string, DieColor>> = {
  R: 'red',
  Y: 'yellow',
  B: 'blue',
  G: 'green',
  P: 'purple',
}

/**
 * Parses hand-authored constraint rows into a square grid: `R Y B G P` are color
 * demands, `1`–`6` are value demands, `.` is open. Grid size is inferred from the
 * row count (4 for the real game, larger in tests). Throws on any invalid character
 * or a non-square layout, so typos in hand-authored data fail loudly at load time
 * instead of at play time. Exported for tests and authoring tools.
 */
export function parseConstraints(rows: readonly string[]): CellConstraint[][] {
  const grid = rows.map(parseConstraintRow)
  if (grid.some((row) => row.length !== rows.length)) {
    throw new Error('constraint grid must be square')
  }
  return grid
}

/**
 * Parses one hand-authored row: `R Y B G P` are colors, `1`–`6` are values, `.`
 * is open. Length is unchecked here; `parseConstraints` enforces the square shape.
 */
function parseConstraintRow(row: string): CellConstraint[] {
  return [...row].map((ch) => {
    if (ch === '.') return openConstraint()
    if (ch >= '1' && ch <= '6') return valueConstraint(Number(ch))
    const color = COLOR_BY_LETTER[ch]
    if (!color) throw new Error(`invalid pattern character: "${ch}"`)
    return colorConstraint(color)
  })
}

function patternFromRows(
  id: string,
  name: string,
  description: string,
  rows: readonly string[],
): WindowPattern {
  if (rows.length !== 4) throw new Error(`pattern "${id}" must have 4 rows`)
  return { id, name, description, constraints: parseConstraints(rows) }
}

/** The six hand-authored window patterns (pitch §6); two are offered per run. */
export const ALL_PATTERNS: readonly WindowPattern[] = [
  patternFromRows(
    'novice-rose',
    'Novice Rose',
    'A sparse first commission. Four demands, mostly free panes.',
    ['..5.', '....', 'Y...', '.3..'],
  ),
  patternFromRows(
    'lancet',
    'Lancet',
    'Tall pointed lights pull color to the corners, values to the middle.',
    ['B..P', '..4.', '.2..', 'G..R'],
  ),
  patternFromRows(
    'quatrefoil',
    'Quatrefoil',
    'Fourfold symmetry: low values in the corners, warm glass at the heart.',
    ['1..6', '.YB.', '.BY.', '6..1'],
  ),
  patternFromRows(
    'tracery',
    'Tracery',
    'Ten printed demands woven through the stone.',
    ['R.2Y', '.5.P', 'P.4.', 'B3.G'],
  ),
  patternFromRows(
    'clerestory',
    'Clerestory',
    'The high row of a great church: dense demands, little mercy.',
    ['2GY5', '.B.6', '4.P1', '3.R.'],
  ),
  patternFromRows(
    'rose-majestic',
    'Rose Majestic',
    'The centerpiece window. Fourteen demands; almost nothing is free.',
    ['1RY6', 'B5.P', 'P.2B', '3GR4'],
  ),
]

/**
 * Offers two distinct patterns for a run, drawn from the seeded shuffle.
 * Deterministic for a given seed.
 */
export function offerPatterns(rng: Rng): [WindowPattern, WindowPattern] {
  const [a, b] = sample(ALL_PATTERNS, 2, rng)
  return [a!, b!]
}
