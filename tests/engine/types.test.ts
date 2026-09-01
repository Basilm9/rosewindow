import { describe, expect, it } from 'vitest'
import {
  DELTA_BY_DIRECTION,
  REFRACTION_BY_COLOR,
  allEntryPoints,
  clockwise,
  counterClockwise,
  DIE_COLORS,
  DIRECTIONS,
} from '../../src/engine/types'

describe('clockwise', () => {
  it('rotates north → east → south → west → north', () => {
    expect(clockwise('north')).toBe('east')
    expect(clockwise('east')).toBe('south')
    expect(clockwise('south')).toBe('west')
    expect(clockwise('west')).toBe('north')
  })
})

describe('counterClockwise', () => {
  it('rotates north → west → south → east → north', () => {
    expect(counterClockwise('north')).toBe('west')
    expect(counterClockwise('west')).toBe('south')
    expect(counterClockwise('south')).toBe('east')
    expect(counterClockwise('east')).toBe('north')
  })
})

describe('REFRACTION_BY_COLOR', () => {
  it('bends warm colors clockwise', () => {
    expect(REFRACTION_BY_COLOR.red).toBe('clockwise')
    expect(REFRACTION_BY_COLOR.yellow).toBe('clockwise')
  })

  it('bends cool colors counter-clockwise', () => {
    expect(REFRACTION_BY_COLOR.blue).toBe('counterClockwise')
    expect(REFRACTION_BY_COLOR.green).toBe('counterClockwise')
  })

  it('passes purple straight through', () => {
    expect(REFRACTION_BY_COLOR.purple).toBe('straight')
  })

  it('covers exactly the five colors', () => {
    expect(Object.keys(REFRACTION_BY_COLOR).sort()).toEqual([...DIE_COLORS].sort())
  })
})

describe('DELTA_BY_DIRECTION', () => {
  it('maps each direction to a single-cell unit step', () => {
    expect(DELTA_BY_DIRECTION.north).toEqual({ row: -1, col: 0 })
    expect(DELTA_BY_DIRECTION.east).toEqual({ row: 0, col: 1 })
    expect(DELTA_BY_DIRECTION.south).toEqual({ row: 1, col: 0 })
    expect(DELTA_BY_DIRECTION.west).toEqual({ row: 0, col: -1 })
  })
})

describe('allEntryPoints', () => {
  it('yields 16 entry points on a 4x4 grid (8 non-corner edges, 4 corners with two inward directions)', () => {
    expect(allEntryPoints(4)).toHaveLength(16)
  })

  it('gives every corner both of its inward directions', () => {
    const points = allEntryPoints(4)
    const at = (row: number, col: number) =>
      points.filter((p) => p.position.row === row && p.position.col === col)
    expect(at(0, 0).map((p) => p.direction).sort()).toEqual(['east', 'south'])
    expect(at(0, 3).map((p) => p.direction).sort()).toEqual(['south', 'west'])
    expect(at(3, 0).map((p) => p.direction).sort()).toEqual(['east', 'north'])
    expect(at(3, 3).map((p) => p.direction).sort()).toEqual(['north', 'west'])
  })

  it('only admits directions that step inside the grid', () => {
    for (const size of [3, 4, 5]) {
      for (const p of allEntryPoints(size)) {
        const delta = DELTA_BY_DIRECTION[p.direction]
        const next = { row: p.position.row + delta.row, col: p.position.col + delta.col }
        expect(next.row).toBeGreaterThanOrEqual(0)
        expect(next.row).toBeLessThan(size)
        expect(next.col).toBeGreaterThanOrEqual(0)
        expect(next.col).toBeLessThan(size)
      }
    }
  })

  it('uses every direction at least once', () => {
    const used = new Set(allEntryPoints(4).map((p) => p.direction))
    expect([...used].sort()).toEqual([...DIRECTIONS].sort())
  })
})
