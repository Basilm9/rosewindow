/**
 * Criterion: input-domain partitioning.
 * color: red | yellow | blue | green | purple (valid), 'pink' (invalid).
 * value: 0 (below), 1 (min), 3 (interior), 6 (max), 7 (above), 2.5 (non-integer), NaN.
 * equality: same color+value; differs in color; differs in value; plain data vs instance.
 */
import { describe, expect, it } from 'vitest'
import { Die, DIE_COLORS } from '../../src/model/Die'
import { GameError } from '../../src/model/GameError'

/** Matches a thrown {@link GameError} whose violation kind is `invalidArgument`. */
const INVALID_ARGUMENT = expect.objectContaining({
  violation: expect.objectContaining({ kind: 'invalidArgument' }),
})

describe('DIE_COLORS', () => {
  it('keeps the fixed draft-pool order (drives the bag build and the golden master)', () => {
    expect(DIE_COLORS).toEqual(['red', 'yellow', 'blue', 'green', 'purple'])
  })
})

describe('Die construction (valid partitions)', () => {
  it.each(DIE_COLORS)('accepts the valid color %s', (color) => {
    const die = new Die(color, 3)
    expect(die.color).toBe(color)
    expect(die.value).toBe(3)
  })

  it.each([1, 3, 6])('accepts the valid value %d', (value) => {
    expect(new Die('red', value).value).toBe(value)
  })

  it('exposes the face bounds as MIN_VALUE 1 and MAX_VALUE 6', () => {
    expect(Die.MIN_VALUE).toBe(1)
    expect(Die.MAX_VALUE).toBe(6)
  })
})

describe('Die immutability and serialization', () => {
  it('freezes every instance', () => {
    expect(Object.isFrozen(new Die('red', 3))).toBe(true)
  })

  it('serializes to exactly {"color","value"}', () => {
    expect(JSON.stringify(new Die('blue', 5))).toBe('{"color":"blue","value":5}')
  })

  it('describes itself as "color value"', () => {
    expect(new Die('red', 3).toString()).toBe('red 3')
  })
})

describe('Die.equals (color + value, never identity)', () => {
  it('matches its own JSON round trip', () => {
    const die = new Die('blue', 5)
    const data = JSON.parse(JSON.stringify(die)) as Die
    expect(Die.equals(die, data)).toBe(true)
  })

  it('differs when the value differs', () => {
    expect(Die.equals(new Die('red', 3), { color: 'red', value: 7 })).toBe(false)
  })

  it('differs when the color differs', () => {
    expect(Die.equals(new Die('red', 3), new Die('blue', 3))).toBe(false)
  })

  it('accepts plain data where a Die is expected and compares it equal', () => {
    const plain: Die = { color: 'red', value: 3 }
    expect(Die.equals(new Die('red', 3), plain)).toBe(true)
  })
})

describe('Die.from (rehydration)', () => {
  it('rehydrates plain data into an equal Die instance', () => {
    const data = { color: 'green', value: 2 } as const
    const die = Die.from(data)
    expect(die).toBeInstanceOf(Die)
    expect(Die.equals(die, data)).toBe(true)
  })

  it('rejects untrusted data with an out-of-range value (NFR-2.6)', () => {
    const act = () => Die.from({ color: 'red', value: 9 })
    expect(act).toThrow(GameError)
    expect(act).toThrow(INVALID_ARGUMENT)
  })
})

describe('Die construction (invalid partitions → invalidArgument)', () => {
  it('rejects an unknown color', () => {
    const act = () => new Die('pink' as never, 3)
    expect(act).toThrow(GameError)
    expect(act).toThrow(INVALID_ARGUMENT)
  })

  it.each([0, 7, 2.5, Number.NaN])('rejects the invalid value %d', (value) => {
    const act = () => new Die('red', value)
    expect(act).toThrow(GameError)
    expect(act).toThrow(INVALID_ARGUMENT)
  })

  it('names the rejected value in the message', () => {
    const act = () => new Die('red', 7)
    expect(act).toThrow(/invalid argument: die value 7/)
    expect(act).toThrow(INVALID_ARGUMENT)
  })
})
