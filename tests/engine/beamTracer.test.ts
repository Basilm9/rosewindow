import { describe, expect, it } from 'vitest'
import { traceBeam } from '../../src/engine/beamTracer'
import { parseGrid } from '../helpers/board'
import type { EntryPoint } from '../../src/engine/types'

const entry = (row: number, col: number, direction: EntryPoint['direction']): EntryPoint => ({
  position: { row, col },
  direction,
})

describe('traceBeam — travel and termination', () => {
  it('crosses an empty window in a straight line and exits with zero points', () => {
    const path = traceBeam(parseGrid(['.. .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']), entry(0, 0, 'east'))
    expect(path.segments.map((s) => [s.position.row, s.position.col, s.direction])).toEqual([
      [0, 0, 'east'],
      [0, 1, 'east'],
      [0, 2, 'east'],
      [0, 3, 'east'],
    ])
    expect(path.totalScore).toBe(0)
    expect(path.termination).toBe('exitedGrid')
  })

  it('a cool die on the top edge bends the beam out of the grid immediately', () => {
    const path = traceBeam(
      parseGrid(['.. B2 .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']),
      entry(0, 0, 'east'),
    )
    expect(path.segments).toHaveLength(2)
    expect(path.segments[1]).toMatchObject({ position: { row: 0, col: 1 }, die: { color: 'blue', value: 2 }, points: 2 })
    expect(path.termination).toBe('exitedGrid')
  })
})

describe('traceBeam — refraction directions', () => {
  it('a warm die turns the beam clockwise and bumps the multiplier for the next die', () => {
    const path = traceBeam(
      parseGrid(['.. R2 .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']),
      entry(0, 0, 'east'),
    )
    expect(path.segments.map((s) => [s.position.row, s.position.col, s.direction, s.points])).toEqual([
      [0, 0, 'east', 0],
      [0, 1, 'east', 2],
      [1, 1, 'south', 0],
      [2, 1, 'south', 0],
      [3, 1, 'south', 0],
    ])
    expect(path.totalScore).toBe(2)
  })

  it('a purple die scores but never bends and never bumps the multiplier', () => {
    const path = traceBeam(
      parseGrid(['.. P4 .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']),
      entry(0, 0, 'east'),
    )
    expect(path.segments.map((s) => [s.position.row, s.position.col, s.direction, s.points])).toEqual([
      [0, 0, 'east', 0],
      [0, 1, 'east', 4],
      [0, 2, 'east', 0],
      [0, 3, 'east', 0],
    ])
    expect(path.totalScore).toBe(4)
  })
})

describe('traceBeam — lockout', () => {
  it('a value-6 turn locks the next 5 cells: dice are scored but do not bend', () => {
    const path = traceBeam(
      parseGrid(['.. R6 .. ..', '.. Y3 .. ..', '.. .. .. ..', '.. .. .. ..']),
      entry(0, 0, 'east'),
    )
    const y3 = path.segments[2]!
    expect(y3.die).toEqual({ color: 'yellow', value: 3 })
    expect(y3.points).toBe(6) // 3 x multiplier 2
    expect(y3.direction).toBe('south') // not bent by the yellow
    expect(path.segments.map((s) => s.direction)).toEqual(['east', 'east', 'south', 'south', 'south'])
    expect(path.totalScore).toBe(12)
    expect(path.termination).toBe('exitedGrid')
  })

  it('lockout is measured in cells, so empty cells consume it', () => {
    // R3 bends east->south with lockout 2; two empty cells spend it; B2 at (3,1) bends again (south->east).
    const path = traceBeam(
      parseGrid(['.. R3 .. ..', '.. .. .. ..', '.. .. .. ..', '.. B2 .. ..']),
      entry(0, 0, 'east'),
    )
    expect(path.segments.map((s) => [s.position.row, s.position.col, s.direction])).toEqual([
      [0, 0, 'east'],
      [0, 1, 'east'],
      [1, 1, 'south'],
      [2, 1, 'south'],
      [3, 1, 'south'],
      [3, 2, 'east'],
      [3, 3, 'east'],
    ])
    expect(path.segments[4]!.points).toBe(4) // 2 x multiplier 2 (B2 scores pre-bump, then bends to m3)
  })

  it('a value-1 die permits an immediate second turn (the S-curve)', () => {
    const path = traceBeam(
      parseGrid(['.. R1 .. ..', '.. Y1 .. ..', '.. .. .. ..', '.. .. .. ..']),
      entry(0, 0, 'east'),
    )
    expect(path.segments.map((s) => [s.position.row, s.position.col, s.direction, s.points])).toEqual([
      [0, 0, 'east', 0],
      [0, 1, 'east', 1], // R1: 1 x 1, bend east->south
      [1, 1, 'south', 2], // Y1: 1 x 2, bend south->west
      [1, 0, 'west', 0],
    ])
    expect(path.totalScore).toBe(3)
    expect(path.termination).toBe('exitedGrid')
  })
})

describe('traceBeam — multiplier and cycle guard', () => {
  it('a mixed 2x2 climbs the multiplier across five bends and exits (re-entry with a new direction)', () => {
    // (1,0)B1 bends the beam up into a clockwise warm orbit; it re-enters (1,0)
    // heading west, bends out, and exits — no pair ever repeats.
    const path = traceBeam(parseGrid(['R1 R1', 'B1 R1']), entry(1, 0, 'east'))
    expect(path.segments.map((s) => [s.position.row, s.position.col, s.direction, s.points])).toEqual([
      [1, 0, 'east', 1], // B1 bends east->north, m2
      [0, 0, 'north', 2], // R1 bends north->east, m3
      [0, 1, 'east', 3], // R1 bends east->south, m4
      [1, 1, 'south', 4], // R1 bends south->west, m5
      [1, 0, 'west', 5], // B1 again: locked? no — bends west->south, capped at 5
    ])
    expect(path.totalScore).toBe(15)
    expect(path.termination).toBe('exitedGrid')
  })

  it('respects a custom multiplier cap on the same orbit', () => {
    const path = traceBeam(parseGrid(['R1 R1', 'B1 R1']), entry(1, 0, 'east'), 3)
    expect(path.segments.map((s) => s.points)).toEqual([1, 2, 3, 3, 3])
    expect(path.totalScore).toBe(12)
    expect(path.termination).toBe('exitedGrid')
  })

  it('terminates with cycle when a lockout-straightened re-entry repeats a (cell, direction) pair', () => {
    // Golden walk (search-verified, hand-checked): bends, lockout-skipped dice,
    // purple under lockout, the multiplier cap, and finally the R6 lockout holds
    // the beam straight north into the repeated (0,0,north) pair — which is NOT
    // recorded a second time.
    const grid = parseGrid(['R1 R3 B5 B5', 'B1 B1 B6 P6', '.. P1 Y4 G6', 'R6 Y1 G2 Y1'])
    const path = traceBeam(grid, entry(1, 0, 'east'))
    expect(path.segments.map((s) => [s.position.row, s.position.col, s.direction, s.points])).toEqual([
      [1, 0, 'east', 1], // B1 bends east->north, m2
      [0, 0, 'north', 2], // R1 bends north->east, m3
      [0, 1, 'east', 9], // R3 bends east->south, m4, lockout 2
      [1, 1, 'south', 4], // B1 locked: scored 1x4, no bend
      [2, 1, 'south', 4], // P1 locked: scored 1x4
      [3, 1, 'south', 4], // Y1 bends south->west, m5
      [3, 0, 'west', 30], // R6: 6x5, bends west->north, lockout 5
      [2, 0, 'north', 0], // empty, lockout 4
      [1, 0, 'north', 5], // B1 locked: scored 1x5, held straight north
    ])
    expect(path.segments).toHaveLength(9) // the repeated (0,0,north) entry is NOT recorded
    expect(path.totalScore).toBe(59)
    expect(path.termination).toBe('cycle')
  })

  it('caps the multiplier at 5 on a five-bend snake', () => {
    // Layout (row-major 4x4):
    //   row0: .. Y1 .. ..
    //   row1: .. B1 .. Y1
    //   row2: .. .. .. R1
    //   row3: .. G1 .. ..
    const grid = parseGrid(['.. Y1 .. ..', '.. B1 .. Y1', '.. .. G1 R1', '.. .. .. ..'])
    const path = traceBeam(grid, entry(0, 0, 'east'))
    expect(path.segments.map((s) => [s.position.row, s.position.col, s.direction, s.points])).toEqual([
      [0, 0, 'east', 0],
      [0, 1, 'east', 1], // Y1 bends east->south, m2
      [1, 1, 'south', 2], // B1 bends south->east, m3
      [1, 2, 'east', 0],
      [1, 3, 'east', 3], // Y1 bends east->south, m4
      [2, 3, 'south', 4], // R1 bends south->west, m5
      [2, 2, 'west', 5], // G1 bends west->south, capped at 5
      [3, 2, 'south', 0],
    ])
    expect(path.totalScore).toBe(15)
    expect(path.termination).toBe('exitedGrid')
  })

  it('allows re-entering a cell with a different direction (only cell+direction pairs repeat)', () => {
    // 3x3: R1 at (0,1),(1,1),(1,0) bend the beam around; it re-enters (0,0) heading north.
    const path = traceBeam(parseGrid(['.. R1 ..', 'R1 R1 ..', '.. .. ..']), entry(0, 0, 'east'))
    expect(path.segments.map((s) => [s.position.row, s.position.col, s.direction, s.points])).toEqual([
      [0, 0, 'east', 0],
      [0, 1, 'east', 1], // bend east->south
      [1, 1, 'south', 2], // bend south->west
      [1, 0, 'west', 3], // bend west->north
      [0, 0, 'north', 0], // re-entry with a fresh (cell, direction) pair
    ])
    expect(path.totalScore).toBe(6)
    expect(path.termination).toBe('exitedGrid')
  })
})

describe('traceBeam — segment shape', () => {
  it('records die and zero points for empty cells on every segment', () => {
    const path = traceBeam(
      parseGrid(['.. .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']),
      entry(0, 0, 'east'),
    )
    for (const segment of path.segments) {
      expect(segment.die).toBeNull()
      expect(segment.points).toBe(0)
    }
  })
})
