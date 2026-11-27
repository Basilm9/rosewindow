/**
 * Criterion: input-domain partitioning of draw(n) × bag state.
 * n: 0 | 5 | remaining | remaining+1 | -1 | 1.5
 * state: full (90) | partly drawn | empty (0) | refilled by return()
 *
 * Ported from tests/engine/diceBag.test.ts (none dropped): "starts with 90 dice" → 1–3;
 * "draws deterministically" → 7; "different seeds" → 8; "decrements remaining count…" → 10;
 * "throws the emptyBag violation" → 17; "returned dice go to the back" → 11; and the bag/Die
 * part of tests/engine/classes.test.ts ("draws immutable Die instances…") → 13–15.
 */
import { describe, expect, it } from 'vitest'
import { DiceBag } from '../../src/model/DiceBag'
import { createGameConfig, GameConfig } from '../../src/model/GameConfig'
import { SeededRandom, mulberry32 } from '../../src/model/SeededRandom'
import { Die, DIE_COLORS } from '../../src/model/Die'
import { GameError } from '../../src/model/GameError'

/** A fresh default-config bag shuffled by mulberry32(seed). */
const bag = (seed: number) => new DiceBag(createGameConfig(seed), mulberry32(seed))

/** Colour+value key of a die, e.g. `blue2`. */
const key = (d: { color: string; value: number }) => `${d.color}${d.value}`

/** Count of each colour+value key, built without a loop. */
const histogram = (dice: readonly Die[]): Record<string, number> =>
  dice.map(key).reduce<Record<string, number>>((acc, k) => ({ ...acc, [k]: (acc[k] ?? 0) + 1 }), {})

/** First five draws, precomputed from the reference build + mulberry32. */
const SEED42_FIRST5 = ['purple4', 'yellow4', 'blue5', 'green1', 'purple6']
const SEED3_FIRST5 = ['blue2', 'yellow5', 'red5', 'red2', 'blue6']
const SEED7_FIRST5 = ['yellow3', 'yellow2', 'blue1', 'yellow5', 'blue5']

/** Matches a thrown error whose violation kind is `emptyBag`. */
const EMPTY_BAG = expect.objectContaining({
  violation: expect.objectContaining({ kind: 'emptyBag' }),
})

/** Matches a thrown error whose violation kind is `invalidArgument`. */
const INVALID_ARGUMENT = expect.objectContaining({
  violation: expect.objectContaining({ kind: 'invalidArgument' }),
})

describe('composition (state: full)', () => {
  it('1: a full bag holds 90 dice', () => {
    expect(bag(42).remainingCount).toBe(90)
  })

  it('2: 30 distinct colour/value keys, each present 3 times', () => {
    const counts = histogram(bag(42).contents())
    expect(Object.keys(counts)).toHaveLength(30)
    expect(new Set(Object.values(counts))).toEqual(new Set([3]))
  })

  it('3: the bag uses exactly the five die colours', () => {
    expect(new Set(bag(42).contents().map((d) => d.color))).toEqual(new Set(DIE_COLORS))
  })
})

describe('seeded draw order (n = 5)', () => {
  it('4: seed 42 draws the precomputed first five', () => {
    expect(bag(42).draw(5).map(key)).toEqual(SEED42_FIRST5)
  })

  it('5: golden seed 3 draws the precomputed first five', () => {
    expect(bag(3).draw(5).map(key)).toEqual(SEED3_FIRST5)
  })

  it('6: seed 7 draws the precomputed first five', () => {
    expect(bag(7).draw(5).map(key)).toEqual(SEED7_FIRST5)
  })

  it('7: the same seed draws the same dice', () => {
    expect(bag(42).draw(5)).toEqual(bag(42).draw(5))
  })

  it('8: different seeds draw different dice', () => {
    expect(bag(1).draw(5).map(key)).not.toEqual(bag(2).draw(5).map(key))
  })
})

describe('draw/return conservation', () => {
  it('9: draw(0) returns nothing and leaves the bag full', () => {
    const b = bag(42)
    expect(b.draw(0)).toEqual([])
    expect(b.remainingCount).toBe(90)
  })

  it('10: partial then n = remaining empties the bag and conserves the composition', () => {
    const b = bag(7)
    const full = histogram(b.contents())
    const first = b.draw(10)
    expect(b.remainingCount).toBe(80)
    const rest = b.draw(80)
    expect(b.remainingCount).toBe(0)
    expect(histogram([...first, ...rest])).toEqual(full)
  })

  it('11: a returned die goes to the back of an empty bag and is drawable again', () => {
    const b = bag(11)
    b.draw(89)
    const last = b.draw(1)
    expect(b.remainingCount).toBe(0)
    b.return(last)
    expect(b.draw(1)).toEqual(last)
  })

  it('12: returned dice are appended to the back in the order given', () => {
    const b = bag(42)
    const d = b.draw(2)
    b.return(d)
    expect(b.remainingCount).toBe(90)
    expect(b.contents().slice(-2)).toEqual(d)
  })
})

describe('drawn dice', () => {
  it('13: are frozen Die instances', () => {
    const die = bag(3).draw(1)[0]
    expect(die).toBeInstanceOf(Die)
    expect(Object.isFrozen(die)).toBe(true)
  })

  it('14: equal their JSON round-trip by colour and value', () => {
    const die = bag(3).draw(1)[0]!
    expect(Die.equals(die, JSON.parse(JSON.stringify(die)) as Die)).toBe(true)
  })

  it('15: depend only on the injected rng (GameConfig + SeededRandom.next)', () => {
    const b = new DiceBag(new GameConfig(3), new SeededRandom(3).next)
    expect(b.draw(5).map(key)).toEqual(SEED3_FIRST5)
  })

  it('16: contents() is a copy; mutating it does not affect the bag', () => {
    const b = bag(42)
    b.contents().pop()
    expect(b.remainingCount).toBe(90)
  })
})

describe('rejections leave the bag unchanged', () => {
  it('17: n = remaining + 1 throws GameError emptyBag', () => {
    const b = bag(9)
    b.draw(85)
    expect(() => b.draw(6)).toThrow(GameError)
    expect(() => b.draw(6)).toThrow(/cannot satisfy the draw/)
    expect(() => b.draw(6)).toThrow(EMPTY_BAG)
  })

  it('18: after the emptyBag rejection the remaining count is unchanged', () => {
    const b = bag(9)
    b.draw(85)
    expect(() => b.draw(6)).toThrow(GameError)
    expect(b.remainingCount).toBe(5)
  })

  it.each([-1, 1.5])('19–20: draw(%s) throws GameError invalidArgument', (n) => {
    expect(() => bag(9).draw(n)).toThrow(GameError)
    expect(() => bag(9).draw(n)).toThrow(/invalid argument/)
    expect(() => bag(9).draw(n)).toThrow(INVALID_ARGUMENT)
  })

  it('21: after an invalidArgument rejection the bag is still full', () => {
    const b = bag(9)
    expect(() => b.draw(-1)).toThrow(GameError)
    expect(b.remainingCount).toBe(90)
  })
})
