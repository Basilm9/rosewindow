/**
 * Criterion: branch coverage.
 * isEmpty: die null → true | die set → false
 * withDie: empty → new occupied cell | occupied → PlacementError cellOccupied
 * cleared: occupied → new empty cell | empty → new empty cell
 * satisfiedBy: constraint accepts → true | rejects → false (per constraint class)
 *
 * Ported from tests/engine/glassWindow.test.ts: the cell-level `cellAt(...)`
 * `toEqual({ constraint, die })` expectations (cases 3 and 14); the grid part moves to Prompt 22.
 */
import { describe, expect, it } from 'vitest'
import { WindowCell } from '../../src/model/WindowCell'
import type { CellConstraint } from '../../src/model/CellConstraint'
import { ColorConstraint, OpenConstraint, ValueConstraint } from '../../src/model/CellConstraint'
import { Die } from '../../src/model/Die'
import { GameError, PlacementError } from '../../src/model/GameError'

/** A fresh red 3 for each call. */
const RED3 = () => new Die('red', 3)

/** A fresh empty pane demanding yellow. */
const yellowCell = (): WindowCell => new WindowCell(new ColorConstraint('yellow'))

/** A fresh empty open pane. */
const openCell = (): WindowCell => new WindowCell(new OpenConstraint())

/** Matches a thrown {@link PlacementError} whose violation kind is `cellOccupied`. */
const CELL_OCCUPIED = expect.objectContaining({
  violation: expect.objectContaining({ kind: 'cellOccupied' }),
})

describe('isEmpty', () => {
  it('1: a cell constructed without a die is empty', () => {
    const cell = openCell()
    expect(cell.isEmpty).toBe(true)
    expect(cell.die).toBeNull()
  })

  it('2: a cell constructed with a die is occupied and holds that die', () => {
    const die = RED3()
    const cell = new WindowCell(new OpenConstraint(), die)
    expect(cell.isEmpty).toBe(false)
    expect(cell.die).toBe(die)
  })
})

describe('withDie', () => {
  it('3: placing on an empty open cell yields an occupied cell holding the die', () => {
    const result = openCell().withDie(RED3())
    expect(result.isEmpty).toBe(false)
    expect(result.die).toEqual({ color: 'red', value: 3 })
  })

  it('4: the original cell is untouched', () => {
    const original = openCell()
    original.withDie(RED3())
    expect(original.isEmpty).toBe(true)
  })

  it('5: returns a new object', () => {
    const original = openCell()
    expect(original.withDie(RED3())).not.toBe(original)
  })

  it('6: carries the constraint over', () => {
    const original = openCell()
    expect(original.withDie(RED3()).constraint).toBe(original.constraint)
  })

  it('7: placing on an occupied cell throws PlacementError', () => {
    const cell = openCell()
    expect(() => cell.withDie(RED3()).withDie(RED3())).toThrow(PlacementError)
  })

  it('8: the occupied rejection is a GameError of kind cellOccupied', () => {
    const cell = openCell()
    expect(() => cell.withDie(RED3()).withDie(RED3())).toThrow(GameError)
    expect(() => cell.withDie(RED3()).withDie(RED3())).toThrow(/already holds a die/)
    expect(() => cell.withDie(RED3()).withDie(RED3())).toThrow(CELL_OCCUPIED)
  })
})

describe('cleared', () => {
  it('9: clearing an occupied cell yields a new empty cell with the same constraint', () => {
    const occupied = openCell().withDie(RED3())
    const result = occupied.cleared()
    expect(result).not.toBe(occupied)
    expect(result.isEmpty).toBe(true)
    expect(result.constraint).toBe(occupied.constraint)
  })

  it('9b: clearing an occupied cell leaves the original still holding its die', () => {
    const die = RED3()
    const occupied = openCell().withDie(die)
    occupied.cleared()
    expect(occupied.isEmpty).toBe(false)
    expect(occupied.die).toBe(die)
  })

  it('10: clearing an empty cell yields a new empty cell', () => {
    const original = openCell()
    const result = original.cleared()
    expect(result.isEmpty).toBe(true)
    expect(result).not.toBe(original)
  })
})

describe('satisfiedBy', () => {
  it('11: a colour demand accepts a die of that colour', () => {
    expect(yellowCell().satisfiedBy(new Die('yellow', 6))).toBe(true)
  })

  it('12: a colour demand rejects a die of another colour', () => {
    expect(yellowCell().satisfiedBy(RED3())).toBe(false)
  })

  it('13: a value demand rejects a die of another value', () => {
    expect(new WindowCell(new ValueConstraint(4)).satisfiedBy(RED3())).toBe(false)
  })
})

describe('shape and immutability', () => {
  it('14: own data is exactly { constraint, die }', () => {
    const cell = openCell()
    expect(Object.keys(cell)).toEqual(['constraint', 'die'])
    expect(cell).toEqual({ constraint: cell.constraint, die: null })
  })

  it('15: instances are frozen', () => {
    expect(Object.isFrozen(openCell())).toBe(true)
  })

  it('16: the constraint is declared by the CellConstraint interface', () => {
    const demand: CellConstraint = new OpenConstraint()
    expect(new WindowCell(demand).constraint.kind).toBe('open')
  })
})
