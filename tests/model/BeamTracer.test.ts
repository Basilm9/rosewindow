/**
 * Test-design criterion: BRANCH (EDGE) COVERAGE of BeamTracer.trace:
 *  bend branch (die && lockout===0 && not straight) T/F; lockout-decrement branch T/F;
 *  exit branch; cycle branch; guard branch (invalid entry).
 * Each SRS "one case per …" is honoured (FR-5.4 per colour, FR-5.7 at V=1, V=6, between).
 * Cases (expected tables copied from tests/engine/beamTracer.test.ts):
 *  X1 empty 4x4 from (0,0,E): 4 straight cells, total 0, exitedGrid          [exit, no-die]
 *  X2 IMMEDIATE EXIT: B2 at (0,1) bends E->N out of the grid: 2 segments, B2 scores 2
 *  C1 red  R2 bends clockwise (E->S); points [0,2,0,0,0], total 2            [FR-5.4 red]
 *  C2 yellow Y1 bends clockwise (new: single Y1 at (0,1), E->S)               [FR-5.4 yellow]
 *  C3 green G2 bends counter-clockwise (new: G2 at (0,1), E->N exit)          [FR-5.4 green]
 *  C4 blue  = X2                                                              [FR-5.4 blue]
 *  C5 purple P4 scores 4, never bends nor bumps multiplier                    [FR-5.4 purple]
 *  O1 SCORE-BEFORE-BEND: R3..B2 case, B2 scores 4 (2 x m2) then bends to m3   [FR-5.5]
 *  K1 VALUE-6 LOCKOUT: R6/Y3 -> Y3 scores 6, not bent, directions E,E,S,S,S, total 12
 *  K2 lockout measured in cells (R3, two empty cells, B2 bends again)         [V between]
 *  K3 value-1 S-curve R1/Y1: [0,1,2,0], total 3                               [V=1]
 *  M1 MULTIPLIER CAP: orbit R1 R1 / B1 R1 from (1,0,E): points 1,2,3,4,5 = 15
 *  M2 custom cap 3 on the same orbit: points 1,2,3,3,3 = 12
 *  M3 five-bend snake: total 15, last bend capped at 5
 *  Y1 CYCLE GUARD golden walk (9 segments, total 59, 'cycle'; repeated (0,0,N) not recorded)
 *  Y2 re-entry with a different direction is allowed (3x3, total 6, exitedGrid)
 *  S1 segment shape: empty grid -> every die null, every points 0 (ported)
 *  P1 tracer keeps its cap and resets state: cap 3 -> 12, default -> 15, cap 3 again -> 12
 *  E1 ERROR invalidArgument: entry (1,1,E) on 4x4 throws GameError (kind 'invalidArgument')
 *  E2 ERROR invalidArgument: empty grid []            (guard branch)
 *  E3 ERROR invalidArgument: 2x3 grid, not square     (guard branch; also 1x2, inc-35 T5)
 *  B1 NFR-1.4 bound: segments.length <= 4 * gridSize^2 on the golden walk
 *  B2 NFR-6.2 BEAM ALWAYS STOPS: 200 seeded random 4x4 windows x all 16 entries (3,200 traces):
 *     every path has length <= 64, repeats no (cell, direction) pair and ends 'exitedGrid' or 'cycle'
 *     (closing a loop needs a die that bends on one visit and is locked on the next, so random
 *     windows rarely cycle; the cycle branch is covered deterministically by Y1 and Y3)
 * Added for the inc-35 temporary checks and mutation check (expected tables computed by hand,
 * each derivation in the comment above its table):
 *  Y1d golden walk diffed with die and multiplier per segment                 [inc-35 T1]
 *  K4 lockout V=2 spent by ONE empty cell, B1 then bends: total 4             [mutation b]
 *  Y3 3x3 closed loop: empty cell spends R2 lockout, second R2 bends, locked B1 re-enters
 *     (0,0,N): 9 segments, total 29, 'cycle'                                  [mutations b, c, d]
 *  M4 six-bend snake at the default cap 5: 6th bend die and the purple after it score x5,
 *     total 25, peak multiplier 5                                             [mutation d]
 *  U1 purity: grid and entry deep-equal before and after a trace             [inc-35 T4]
 *  U2 purity: multiplierCap unchanged after a trace, tracer frozen            [inc-35 T4]
 * Error kinds: invalidArgument only (E1–E3), asserted with the objectContaining matcher.
 * Unchanged state on rejection: E1–E3 each assert the grid and tracer are unchanged after the throw.
 */
import { describe, expect, it } from 'vitest'
import type { BeamPath } from '../../src/model/BeamPath'
import { BeamTracer } from '../../src/model/BeamTracer'
import { DIE_COLORS, Die } from '../../src/model/Die'
import type { DirectionName } from '../../src/model/Direction'
import { EntryPoint } from '../../src/model/EntryPoint'
import { GameError } from '../../src/model/GameError'
import type { DieGrid } from '../../src/model/GlassWindow'
import { SeededRandom } from '../../src/model/SeededRandom'
import { parseGrid } from '../helpers/board'

/** One projected segment: row, column, entry direction, points. */
type Row = readonly [number, number, DirectionName, number]

/** Projects a path to plain `[row, col, direction, points]` rows. */
const rows = (p: BeamPath) =>
  p.segments.map((s) => [s.position.row, s.position.col, s.direction.name, s.points])

/** Projects a path to `[row, col, direction, die, multiplier, points]` rows; die as `"red 3"` or null. */
const detail = (p: BeamPath) =>
  p.segments.map((s) => [
    s.position.row,
    s.position.col,
    s.direction.name,
    s.die === null ? null : `${s.die.color} ${s.die.value}`,
    s.multiplier,
    s.points,
  ])

/** Builds an entry point from plain data. */
const entry = (row: number, col: number, direction: DirectionName): EntryPoint =>
  EntryPoint.fromData({ position: { row, col }, direction })

/** Matches a thrown error whose violation kind is `invalidArgument`. */
const invalidArgument = () =>
  expect.objectContaining({ violation: expect.objectContaining({ kind: 'invalidArgument' }) })

const EMPTY_4X4 = ['.. .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..'] as const
const ORBIT = ['R1 R1', 'B1 R1'] as const
const GOLDEN_GRID = ['R1 R3 B5 B5', 'B1 B1 B6 P6', '.. P1 Y4 G6', 'R6 Y1 G2 Y1'] as const

const GOLDEN_WALK = [
  [1, 0, 'east', 1],
  [0, 0, 'north', 2],
  [0, 1, 'east', 9],
  [1, 1, 'south', 4],
  [2, 1, 'south', 4],
  [3, 1, 'south', 4],
  [3, 0, 'west', 30],
  [2, 0, 'north', 0],
  [1, 0, 'north', 5],
] as const

/** Golden walk with die and multiplier (inc-35 T1); multipliers are the pre-bend values. */
const GOLDEN_WALK_DETAIL = [
  [1, 0, 'east', 'blue 1', 1, 1], // B1 bends east->north, m2
  [0, 0, 'north', 'red 1', 2, 2], // R1 bends north->east, m3
  [0, 1, 'east', 'red 3', 3, 9], // R3 bends east->south, m4, lockout 2
  [1, 1, 'south', 'blue 1', 4, 4], // locked, lockout 1
  [2, 1, 'south', 'purple 1', 4, 4], // locked, lockout 0
  [3, 1, 'south', 'yellow 1', 4, 4], // Y1 bends south->west, m5
  [3, 0, 'west', 'red 6', 5, 30], // R6 bends west->north, m stays 5 (cap), lockout 5
  [2, 0, 'north', null, 5, 0], // empty, lockout 4
  [1, 0, 'north', 'blue 1', 5, 5], // locked, lockout 3; next (0,0,north) repeats
] as const

/**
 * C1–C5: one case per colour (FR-5.4), each a single die at (0,1) entered from (0,0,east).
 * C2 by hand: Y1 at (0,1) scores 1x1, turns clockwise east->south, column 1 below is empty:
 *   [0,0,E,0],[0,1,E,1],[1,1,S,0],[2,1,S,0],[3,1,S,0], total 1, exitedGrid.
 * C3 by hand: G2 at (0,1) scores 2x1, turns counter-clockwise east->north, (−1,1) is off-grid:
 *   [0,0,E,0],[0,1,E,2], total 2, exitedGrid.
 */
const COLOUR_TABLE: readonly (readonly [string, string, string, readonly Row[], number])[] = [
  [
    'C1',
    'red',
    'R2',
    [
      [0, 0, 'east', 0],
      [0, 1, 'east', 2],
      [1, 1, 'south', 0],
      [2, 1, 'south', 0],
      [3, 1, 'south', 0],
    ],
    2,
  ],
  [
    'C2',
    'yellow',
    'Y1',
    [
      [0, 0, 'east', 0],
      [0, 1, 'east', 1],
      [1, 1, 'south', 0],
      [2, 1, 'south', 0],
      [3, 1, 'south', 0],
    ],
    1,
  ],
  [
    'C3',
    'green',
    'G2',
    [
      [0, 0, 'east', 0],
      [0, 1, 'east', 2],
    ],
    2,
  ],
  [
    'C4',
    'blue',
    'B2',
    [
      [0, 0, 'east', 0],
      [0, 1, 'east', 2],
    ],
    2,
  ],
  [
    'C5',
    'purple',
    'P4',
    [
      [0, 0, 'east', 0],
      [0, 1, 'east', 4],
      [0, 2, 'east', 0],
      [0, 3, 'east', 0],
    ],
    4,
  ],
]

/** Result of {@link beamStopAudit}. */
interface BeamStopAudit {
  /** Number of traces run. */
  readonly traces: number
  /** Longest path, in segments. */
  readonly longest: number
  /** Paths that recorded some (cell, direction) pair twice. */
  readonly repeats: number
  /** Paths whose termination is neither 'exitedGrid' nor 'cycle'. */
  readonly badEndings: number
}

/**
 * NFR-6.2 audit: builds `windows` random 4x4 grids from one `SeededRandom(1)` stream (each cell a
 * die with probability 0.8, colour and value uniform, else empty) and traces each from every
 * `EntryPoint.allFor(4)`.
 */
function beamStopAudit(windows: number): BeamStopAudit {
  const rng = new SeededRandom(1)
  const tracer = new BeamTracer()
  let traces = 0
  let longest = 0
  let repeats = 0
  let badEndings = 0
  for (let w = 0; w < windows; w++) {
    const grid: (Die | null)[][] = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () =>
        rng.next() < 0.8
          ? new Die(
              DIE_COLORS[Math.floor(rng.next() * DIE_COLORS.length)]!,
              1 + Math.floor(rng.next() * 6),
            )
          : null,
      ),
    )
    for (const start of EntryPoint.allFor(4)) {
      const path = tracer.trace(grid, start)
      traces++
      longest = Math.max(longest, path.length)
      const keys = path.segments.map(
        (s) => `${s.position.row}:${s.position.col}:${s.direction.name}`,
      )
      if (new Set(keys).size !== keys.length) repeats++
      if (path.termination !== 'exitedGrid' && path.termination !== 'cycle') badEndings++
    }
  }
  return { traces, longest, repeats, badEndings }
}

describe('BeamTracer — travel and termination', () => {
  it('X1 crosses an empty window in a straight line and exits with zero points (ported)', () => {
    const path = new BeamTracer().trace(parseGrid(EMPTY_4X4), entry(0, 0, 'east'))
    expect(rows(path)).toEqual([
      [0, 0, 'east', 0],
      [0, 1, 'east', 0],
      [0, 2, 'east', 0],
      [0, 3, 'east', 0],
    ])
    expect(path.totalScore).toBe(0)
    expect(path.termination).toBe('exitedGrid')
  })

  it('X2 IMMEDIATE EXIT: a cool die on the top edge bends the beam out of the grid (ported)', () => {
    const path = new BeamTracer().trace(
      parseGrid(['.. B2 .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']),
      entry(0, 0, 'east'),
    )
    expect(rows(path)).toEqual([
      [0, 0, 'east', 0],
      [0, 1, 'east', 2],
    ])
    expect(path.segments[1]!.die).toEqual({ color: 'blue', value: 2 })
    expect(path.totalScore).toBe(2)
    expect(path.termination).toBe('exitedGrid')
  })
})

describe('BeamTracer — refraction per colour (FR-5.4)', () => {
  it.each(COLOUR_TABLE)(
    '%s %s die %s at (0,1) refracts per its colour (C1, C5 ported)',
    (_id, _colour, token, expected, total) => {
      const path = new BeamTracer().trace(
        parseGrid([`.. ${token} .. ..`, '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']),
        entry(0, 0, 'east'),
      )
      expect(rows(path)).toEqual(expected)
      expect(path.totalScore).toBe(total)
      expect(path.termination).toBe('exitedGrid')
    },
  )
})

describe('BeamTracer — lockout (FR-5.5, FR-5.7)', () => {
  it('K1 VALUE-6 LOCKOUT: R6 locks 5 cells, Y3 is scored x2 but does not bend (ported)', () => {
    // R6 scores 6x1 (hand-computed; the reference asserts directions, Y3 points and total 12).
    const path = new BeamTracer().trace(
      parseGrid(['.. R6 .. ..', '.. Y3 .. ..', '.. .. .. ..', '.. .. .. ..']),
      entry(0, 0, 'east'),
    )
    expect(rows(path)).toEqual([
      [0, 0, 'east', 0],
      [0, 1, 'east', 6],
      [1, 1, 'south', 6],
      [2, 1, 'south', 0],
      [3, 1, 'south', 0],
    ])
    expect(path.segments[2]!.die).toEqual({ color: 'yellow', value: 3 })
    expect(path.segments[2]!.multiplier).toBe(2)
    expect(path.totalScore).toBe(12)
    expect(path.termination).toBe('exitedGrid')
  })

  it('K2 / O1 lockout is measured in cells, so empty cells consume it; B2 scores before its bend (ported)', () => {
    // R3 bends east->south, lockout 2; (1,1),(2,1) empty spend it; B2 at (3,1) scores 2x2, bends south->east.
    const path = new BeamTracer().trace(
      parseGrid(['.. R3 .. ..', '.. .. .. ..', '.. .. .. ..', '.. B2 .. ..']),
      entry(0, 0, 'east'),
    )
    expect(rows(path)).toEqual([
      [0, 0, 'east', 0],
      [0, 1, 'east', 3],
      [1, 1, 'south', 0],
      [2, 1, 'south', 0],
      [3, 1, 'south', 4],
      [3, 2, 'east', 0],
      [3, 3, 'east', 0],
    ])
    expect(path.totalScore).toBe(7)
    expect(path.termination).toBe('exitedGrid')
  })

  it('K3 a value-1 die permits an immediate second turn, the S-curve (ported)', () => {
    const path = new BeamTracer().trace(
      parseGrid(['.. R1 .. ..', '.. Y1 .. ..', '.. .. .. ..', '.. .. .. ..']),
      entry(0, 0, 'east'),
    )
    expect(rows(path)).toEqual([
      [0, 0, 'east', 0],
      [0, 1, 'east', 1],
      [1, 1, 'south', 2],
      [1, 0, 'west', 0],
    ])
    expect(path.totalScore).toBe(3)
    expect(path.termination).toBe('exitedGrid')
  })

  it('K4 a value-2 lockout is spent by one empty cell, so the next die bends', () => {
    // By hand: R2 at (0,1) scores 2x1, bends east->south, m2, lockout 1.
    // (1,1) empty spends it (lockout 0). B1 at (2,1) scores 1x2, bends south->east (ccw), m3.
    // (2,2), (2,3) empty; exit east. Total 4.
    const path = new BeamTracer().trace(
      parseGrid(['.. R2 .. ..', '.. .. .. ..', '.. B1 .. ..', '.. .. .. ..']),
      entry(0, 0, 'east'),
    )
    expect(rows(path)).toEqual([
      [0, 0, 'east', 0],
      [0, 1, 'east', 2],
      [1, 1, 'south', 0],
      [2, 1, 'south', 2],
      [2, 2, 'east', 0],
      [2, 3, 'east', 0],
    ])
    expect(path.totalScore).toBe(4)
    expect(path.termination).toBe('exitedGrid')
  })
})

describe('BeamTracer — multiplier (FR-5.6)', () => {
  it('M1 MULTIPLIER CAP: the 2x2 orbit climbs to x5 across five bends and exits (ported)', () => {
    const path = new BeamTracer().trace(parseGrid(ORBIT), entry(1, 0, 'east'))
    expect(rows(path)).toEqual([
      [1, 0, 'east', 1],
      [0, 0, 'north', 2],
      [0, 1, 'east', 3],
      [1, 1, 'south', 4],
      [1, 0, 'west', 5],
    ])
    expect(path.totalScore).toBe(15)
    expect(path.termination).toBe('exitedGrid')
  })

  it('M2 respects a custom multiplier cap of 3 on the same orbit (ported)', () => {
    const path = new BeamTracer(3).trace(parseGrid(ORBIT), entry(1, 0, 'east'))
    expect(rows(path)).toEqual([
      [1, 0, 'east', 1],
      [0, 0, 'north', 2],
      [0, 1, 'east', 3],
      [1, 1, 'south', 3],
      [1, 0, 'west', 3],
    ])
    expect(path.totalScore).toBe(12)
    expect(path.termination).toBe('exitedGrid')
  })

  it('M3 caps the multiplier at 5 on a five-bend snake (ported)', () => {
    const path = new BeamTracer().trace(
      parseGrid(['.. Y1 .. ..', '.. B1 .. Y1', '.. .. G1 R1', '.. .. .. ..']),
      entry(0, 0, 'east'),
    )
    expect(rows(path)).toEqual([
      [0, 0, 'east', 0],
      [0, 1, 'east', 1],
      [1, 1, 'south', 2],
      [1, 2, 'east', 0],
      [1, 3, 'east', 3],
      [2, 3, 'south', 4],
      [2, 2, 'west', 5],
      [3, 2, 'south', 0],
    ])
    expect(path.totalScore).toBe(15)
    expect(path.termination).toBe('exitedGrid')
  })

  it('M4 a sixth bend at the default cap 5 keeps the multiplier at 5', () => {
    // By hand (all value 1, so no lockout):
    //  (0,1) Y1 x1 E->S m2; (1,1) B1 x2 S->E m3; (1,2) R1 x3 E->S m4; (2,2) G1 x4 S->E m5;
    //  (2,3) R1 x5 E->S (5th bend, m stays 5); (3,3) R1 x5 S->W (6th bend, m stays 5);
    //  (3,2) P1 x5 straight; (3,1), (3,0) empty; exit west. Total 1+2+3+4+5+5+5 = 25.
    //  Uncapped it would be 1+2+3+4+5+6+7 = 28.
    const path = new BeamTracer().trace(
      parseGrid(['.. Y1 .. ..', '.. B1 R1 ..', '.. .. G1 R1', '.. .. P1 R1']),
      entry(0, 0, 'east'),
    )
    expect(rows(path)).toEqual([
      [0, 0, 'east', 0],
      [0, 1, 'east', 1],
      [1, 1, 'south', 2],
      [1, 2, 'east', 3],
      [2, 2, 'south', 4],
      [2, 3, 'east', 5],
      [3, 3, 'south', 5],
      [3, 2, 'west', 5],
      [3, 1, 'west', 0],
      [3, 0, 'west', 0],
    ])
    expect(path.totalScore).toBe(25)
    expect(path.peakMultiplier).toBe(5)
    expect(path.termination).toBe('exitedGrid')
  })
})

describe('BeamTracer — cycle guard (FR-5.9)', () => {
  it('Y1 CYCLE GUARD golden walk stops before the repeated (0,0,north) pair (ported)', () => {
    const path = new BeamTracer().trace(parseGrid(GOLDEN_GRID), entry(1, 0, 'east'))
    expect(rows(path)).toEqual(GOLDEN_WALK)
    expect(path.segments).toHaveLength(9)
    expect(path.totalScore).toBe(59)
    expect(path.termination).toBe('cycle')
  })

  it('Y1d golden walk matches segment by segment including die and multiplier', () => {
    const path = new BeamTracer().trace(parseGrid(GOLDEN_GRID), entry(1, 0, 'east'))
    expect(detail(path)).toEqual(GOLDEN_WALK_DETAIL)
  })

  it('Y2 allows re-entering a cell with a different direction (ported)', () => {
    const path = new BeamTracer().trace(
      parseGrid(['.. R1 ..', 'R1 R1 ..', '.. .. ..']),
      entry(0, 0, 'east'),
    )
    expect(rows(path)).toEqual([
      [0, 0, 'east', 0],
      [0, 1, 'east', 1],
      [1, 1, 'south', 2],
      [1, 0, 'west', 3],
      [0, 0, 'north', 0],
    ])
    expect(path.totalScore).toBe(6)
    expect(path.termination).toBe('exitedGrid')
  })

  it('Y3 a 3x3 closed loop: an empty cell spends the R2 lockout, a locked B1 re-enters (0,0,north)', () => {
    // By hand, from (1,0,east):
    //  (1,0) B1 1x1, E->N (ccw) m2;  (0,0) R1 1x2, N->E m3;  (0,1) empty;
    //  (0,2) R1 1x3, E->S m4;  (1,2) empty;  (2,2) R2 2x4, S->W m5, lockout 1;
    //  (2,1) empty, lockout 0;  (2,0) R2 2x5, W->N m stays 5, lockout 1;
    //  (1,0) B1 1x5 locked, straight north; next (0,0,north) was visited -> 'cycle', not recorded.
    //  Total 1+2+3+8+10+5 = 29.
    const path = new BeamTracer().trace(
      parseGrid(['R1 .. R1', 'B1 .. ..', 'R2 .. R2']),
      entry(1, 0, 'east'),
    )
    expect(rows(path)).toEqual([
      [1, 0, 'east', 1],
      [0, 0, 'north', 2],
      [0, 1, 'east', 0],
      [0, 2, 'east', 3],
      [1, 2, 'south', 0],
      [2, 2, 'south', 8],
      [2, 1, 'west', 0],
      [2, 0, 'west', 10],
      [1, 0, 'north', 5],
    ])
    expect(path.totalScore).toBe(29)
    expect(path.termination).toBe('cycle')
  })
})

describe('BeamTracer — segment shape and tracer state', () => {
  it('S1 records a null die and zero points for every empty cell (ported)', () => {
    const path = new BeamTracer().trace(parseGrid(EMPTY_4X4), entry(0, 0, 'east'))
    expect(path.segments.every((s) => s.die === null && s.points === 0)).toBe(true)
  })

  it('P1 keeps its cap per tracer and resets traversal state between traces (ported)', () => {
    const grid = parseGrid(ORBIT)
    const capped = new BeamTracer(3)
    expect(capped.trace(grid, entry(1, 0, 'east')).totalScore).toBe(12)
    expect(new BeamTracer().trace(grid, entry(1, 0, 'east')).totalScore).toBe(15)
    expect(capped.trace(grid, entry(1, 0, 'east')).totalScore).toBe(12)
  })

  it('U1 is pure: the grid and the entry are deep-equal before and after a trace', () => {
    const grid = parseGrid(GOLDEN_GRID)
    const before = structuredClone(grid)
    const start = entry(1, 0, 'east')
    new BeamTracer().trace(grid, start)
    expect(grid).toEqual(before)
    expect(start.toData()).toEqual({ position: { row: 1, col: 0 }, direction: 'east' })
  })

  it('U2 is pure: multiplierCap is unchanged after a trace and the tracer is frozen', () => {
    const tracer = new BeamTracer()
    tracer.trace(parseGrid(GOLDEN_GRID), entry(1, 0, 'east'))
    expect(tracer.multiplierCap).toBe(5)
    expect(Object.isFrozen(tracer)).toBe(true)
  })
})

describe('BeamTracer — invalid arguments', () => {
  it('E1 rejects an entry that is not inward, (1,1,east) on 4x4', () => {
    const tracer = new BeamTracer()
    const grid = parseGrid(EMPTY_4X4)
    const bad = entry(1, 1, 'east')
    expect(() => tracer.trace(grid, bad)).toThrow(GameError)
    expect(() => tracer.trace(grid, bad)).toThrow(/invalid argument: .*not inward/)
    expect(() => tracer.trace(grid, bad)).toThrow(invalidArgument())
  })

  it('E1 leaves the grid and the tracer unchanged after the rejection', () => {
    const tracer = new BeamTracer()
    const grid = parseGrid(EMPTY_4X4)
    const before = structuredClone(grid)
    expect(() => tracer.trace(grid, entry(1, 1, 'east'))).toThrow(GameError)
    expect(grid).toEqual(before)
    expect(tracer.multiplierCap).toBe(5)
  })

  it('E2 rejects an empty grid', () => {
    const tracer = new BeamTracer()
    const grid: DieGrid = []
    expect(() => tracer.trace(grid, entry(0, 0, 'east'))).toThrow(GameError)
    expect(() => tracer.trace(grid, entry(0, 0, 'east'))).toThrow(invalidArgument())
    expect(grid).toEqual([])
    expect(tracer.multiplierCap).toBe(5)
  })

  // parseGrid refuses non-square input, so these grids are built by hand.
  it.each([
    [
      '2x3',
      [
        [null, null, null],
        [null, null, null],
      ],
    ],
    ['1x2', [[null, null]]],
  ] as const)('E3 rejects a %s grid that is not square', (_shape, rowsOfGrid) => {
    const tracer = new BeamTracer()
    const grid: DieGrid = rowsOfGrid
    const before = structuredClone(grid)
    expect(() => tracer.trace(grid, entry(0, 0, 'east'))).toThrow(GameError)
    expect(() => tracer.trace(grid, entry(0, 0, 'east'))).toThrow(invalidArgument())
    expect(grid).toEqual(before)
    expect(tracer.multiplierCap).toBe(5)
  })
})

describe('BeamTracer — termination bounds (NFR-1.4, NFR-6.2)', () => {
  it('B1 the golden walk stays within 4 x gridSize^2 segments', () => {
    const path = new BeamTracer().trace(parseGrid(GOLDEN_GRID), entry(1, 0, 'east'))
    expect(path.segments.length).toBeLessThanOrEqual(4 * 4 * 4)
  })

  it('B2 BEAM ALWAYS STOPS over 200 seeded random windows x 16 entries', () => {
    const audit = beamStopAudit(200)
    expect(audit.traces).toBe(3200)
    expect(audit.repeats).toBe(0)
    expect(audit.badEndings).toBe(0)
    expect(audit.longest).toBeLessThanOrEqual(64)
  })
})
