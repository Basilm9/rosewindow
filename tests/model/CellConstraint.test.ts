/**
 * Criterion: input-domain partitioning of (die, demand).
 * Dice: RED3 (match both), BLUE3 (other color, same value), RED4 (same color,
 * other value), BLUE4 (neither). Demands: Color(red), Value(3), Open.
 * Invalid constructor partitions: unknown color; value 0, 7, 2.5.
 *
 * Further partitions:
 * kind: open | color | value.
 * ColorConstraint color: each of DIE_COLORS (valid), 'pink' (invalid).
 * ValueConstraint value: each of 1–6 (valid); 0 (below), 7 (above), 2.5 (non-integer), NaN (invalid).
 * accepts: plain DieData vs Die instance.
 */
import { describe, expect, it } from 'vitest'
import type { CellConstraint } from '../../src/model/CellConstraint'
import { ColorConstraint, OpenConstraint, ValueConstraint } from '../../src/model/CellConstraint'
import { Die, DIE_COLORS } from '../../src/model/Die'
import { GameError } from '../../src/model/GameError'
import * as engine from '../../src/engine/types'
import { parseConstraints } from '../../src/engine/patterns'

/** Matches a thrown {@link GameError} whose violation kind is `invalidArgument`. */
const INVALID_ARGUMENT = expect.objectContaining({
  violation: expect.objectContaining({ kind: 'invalidArgument' }),
})

describe('own data stays {kind[, color|value]}', () => {
  it('OpenConstraint has only kind', () => {
    const open = new OpenConstraint()
    expect(Object.keys(open)).toEqual(['kind'])
    expect(open).toEqual({ kind: 'open' })
  })

  it('ColorConstraint has kind and color', () => {
    const color = new ColorConstraint('yellow')
    expect(Object.keys(color)).toEqual(['kind', 'color'])
    expect(color).toEqual({ kind: 'color', color: 'yellow' })
  })

  it('ValueConstraint has kind and value', () => {
    const value = new ValueConstraint(4)
    expect(Object.keys(value)).toEqual(['kind', 'value'])
    expect(value).toEqual({ kind: 'value', value: 4 })
  })

  it('freezes every instance and keeps accepts/describe on the prototype', () => {
    const all: CellConstraint[] = [
      new OpenConstraint(),
      new ColorConstraint('red'),
      new ValueConstraint(3),
    ]
    expect(all.map((c) => Object.isFrozen(c))).toEqual([true, true, true])
    expect(all.map((c) => Object.hasOwn(c, 'accepts'))).toEqual([false, false, false])
    expect(all.map((c) => Object.hasOwn(c, 'describe'))).toEqual([false, false, false])
  })
})

/** Acceptance oracle; columns: RED3, BLUE3, RED4, BLUE4. */
const TABLE = [
  ['color red', true, false, true, false],
  ['value 3', true, true, false, false],
  ['open', true, true, true, true],
] as const

/** Factories so every test builds a fresh demand. */
const DEMANDS: Record<(typeof TABLE)[number][0], () => CellConstraint> = {
  'color red': () => new ColorConstraint('red'),
  'value 3': () => new ValueConstraint(3),
  open: () => new OpenConstraint(),
}

/** Factories so every test builds a fresh die, in TABLE column order. */
const DICE = [
  ['RED3', () => new Die('red', 3)],
  ['BLUE3', () => new Die('blue', 3)],
  ['RED4', () => new Die('red', 4)],
  ['BLUE4', () => new Die('blue', 4)],
] as const

/** The 3×4 table flattened to one row per cell: [demand, die name, expected, die factory]. */
const CELLS = TABLE.flatMap(([demand, ...row]) =>
  row.map((expected, col) => [demand, DICE[col]![0], expected, DICE[col]![1]] as const),
)

describe('acceptance table (FR-4.4, FR-4.5)', () => {
  it.each(CELLS)('%s accepts %s: %s', (demand, _name, expected, makeDie) => {
    const constraint: CellConstraint = DEMANDS[demand]()
    expect(constraint.accepts(makeDie())).toBe(expected)
  })

  it('accepts plain DieData as well as Die instances', () => {
    expect(new ColorConstraint('green').accepts({ color: 'green', value: 6 })).toBe(true)
    expect(new ValueConstraint(6).accepts({ color: 'green', value: 6 })).toBe(true)
    expect(new OpenConstraint().accepts({ color: 'purple', value: 1 })).toBe(true)
  })
})

describe('argument validation', () => {
  it.each(DIE_COLORS)('ColorConstraint accepts the valid color %s', (c) => {
    expect(new ColorConstraint(c).color).toBe(c)
  })

  it('ColorConstraint rejects an unknown color with invalidArgument', () => {
    expect(() => new ColorConstraint('pink' as never)).toThrow(GameError)
    expect(() => new ColorConstraint('pink' as never)).toThrow(INVALID_ARGUMENT)
  })

  it.each([1, 2, 3, 4, 5, 6])('ValueConstraint accepts the valid value %d', (v) => {
    expect(new ValueConstraint(v).value).toBe(v)
  })

  it.each([0, 7, 2.5, Number.NaN])('ValueConstraint rejects %d with invalidArgument', (v) => {
    expect(() => new ValueConstraint(v)).toThrow(GameError)
    expect(() => new ValueConstraint(v)).toThrow(INVALID_ARGUMENT)
  })

  it('the rejection message names the invalid argument', () => {
    expect(() => new ValueConstraint(7)).toThrow(/invalid argument/)
  })
})

describe('substitutability (LSP)', () => {
  it('every concrete demand is usable through the CellConstraint interface', () => {
    const demands: CellConstraint[] = [
      new OpenConstraint(),
      new ColorConstraint('red'),
      new ValueConstraint(3),
    ]
    expect(demands.map((d) => d.kind)).toEqual(['open', 'color', 'value'])
  })
})

describe('describe() for rejection toasts (FR-4.11)', () => {
  it.each([
    { c: new OpenConstraint() as CellConstraint, text: 'open' },
    { c: new ColorConstraint('yellow') as CellConstraint, text: 'must be yellow' },
    { c: new ValueConstraint(4) as CellConstraint, text: 'must show 4' },
  ])('$text', ({ c, text }) => {
    expect(c.describe()).toBe(text)
  })
})

describe('single definition shared with the engine shim', () => {
  it('engine/types re-exports the very same classes', () => {
    expect(engine.OpenConstraint).toBe(OpenConstraint)
    expect(engine.ColorConstraint).toBe(ColorConstraint)
    expect(engine.ValueConstraint).toBe(ValueConstraint)
  })

  it('parseConstraints yields model instances (instanceof from both import paths)', () => {
    const [color, value, open] = parseConstraints(['R3.', '...', '...'])[0]!
    expect(color).toBeInstanceOf(ColorConstraint)
    expect(color).toBeInstanceOf(engine.ColorConstraint)
    expect(value).toBeInstanceOf(ValueConstraint)
    expect(value).toBeInstanceOf(engine.ValueConstraint)
    expect(open).toBeInstanceOf(OpenConstraint)
    expect(open).toBeInstanceOf(engine.OpenConstraint)
  })
})
