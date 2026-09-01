import { describe, expect, it } from 'vitest'
import { GlassWindow } from '../../src/engine/glassWindow'
import { ALL_PATTERNS } from '../../src/engine/patterns'
import type { Die } from '../../src/engine/types'

const pattern = ALL_PATTERNS[0]!

describe('GlassWindow', () => {
  it('loads the pattern constraints into an empty 4x4 grid', () => {
    const window = GlassWindow.fromPattern(pattern)
    expect(window.placedCount).toBe(0)
    expect(window.constraints).toEqual(pattern.constraints)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        expect(window.dieAt({ row, col })).toBeNull()
        expect(window.cellAt({ row, col }).constraint).toEqual(pattern.constraints[row]![col])
      }
    }
  })

  it('places dice immutably-visible and reports occupancy', () => {
    const window = GlassWindow.fromPattern(pattern)
    const die: Die = { color: 'red', value: 3 }
    window.place(die, { row: 0, col: 0 })
    expect(window.dieAt({ row: 0, col: 0 })).toEqual(die)
    expect(window.placedCount).toBe(1)
    expect(window.cellAt({ row: 0, col: 0 })).toEqual({
      constraint: pattern.constraints[0]![0],
      die,
    })
  })
})
