/**
 * Criterion: input-domain partitioning.
 * kind: open | color | value.
 * ColorConstraint color: each of DIE_COLORS (valid), 'pink' (invalid).
 * ValueConstraint value: 0 (below), 1 (min), 4 (interior), 6 (max), 7 (above), 2.5 (non-integer), NaN.
 * accepts: die matches demand; differs in the demanded attribute; differs only in the other attribute;
 *   plain DieData vs Die instance.
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
    for (const c of all) {
      expect(Object.isFrozen(c)).toBe(true)
      expect(Object.hasOwn(c, 'accepts')).toBe(false)
      expect(Object.hasOwn(c, 'describe')).toBe(false)
    }
  })
})

describe('acceptance rules (FR-4.4, FR-4.5)', () => {
  const red3 = new Die('red', 3)
  const blue3 = new Die('blue', 3)
  const red4 = new Die('red', 4)

  it('open accepts every die', () => {
    const open: CellConstraint = new OpenConstraint()
    expect([open.accepts(red3), open.accepts(blue3), open.accepts(red4)]).toEqual([true, true, true])
  })

  it('a color demand ignores value', () => {
    const color: CellConstraint = new ColorConstraint('red')
    expect([color.accepts(red3), color.accepts(blue3), color.accepts(red4)]).toEqual([
      true,
      false,
      true,
    ])
  })

  it('a value demand ignores color', () => {
    const value: CellConstraint = new ValueConstraint(3)
    expect([value.accepts(red3), value.accepts(blue3), value.accepts(red4)]).toEqual([
      true,
      true,
      false,
    ])
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

  it.each([1, 4, 6])('ValueConstraint accepts the valid value %d', (v) => {
    expect(new ValueConstraint(v).value).toBe(v)
  })

  it.each([0, 7, 2.5, Number.NaN])('ValueConstraint rejects %d with invalidArgument', (v) => {
    expect(() => new ValueConstraint(v)).toThrow(GameError)
    expect(() => new ValueConstraint(v)).toThrow(INVALID_ARGUMENT)
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
