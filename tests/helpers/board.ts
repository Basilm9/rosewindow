import type { Die } from '../../src/engine/types'

const COLOR_BY_LETTER: Readonly<Record<string, string>> = {
  R: 'red',
  Y: 'yellow',
  B: 'blue',
  G: 'green',
  P: 'purple',
}

/**
 * Test fixture builder (pitch §12): one readable line per row.
 * Tokens are space-separated; `..` is an empty cell, otherwise a color letter
 * followed by the face value, e.g. `R5 .. Y3 ..`.
 */
export function parseGrid(rows: readonly string[]): (Die | null)[][] {
  const grid = rows.map((row) =>
    row
      .trim()
      .split(/\s+/)
      .map((token) => {
        if (token === '..') return null
        const color = COLOR_BY_LETTER[token[0]!]
        const value = Number(token.slice(1))
        if (!color || !(value >= 1 && value <= 6)) {
          throw new Error(`bad die token "${token}"`)
        }
        return { color, value } as Die
      }),
  )
  if (grid.some((r) => r.length !== grid.length)) throw new Error('grid must be square')
  return grid
}
