import { describe, expect, it } from 'vitest'
import { BeamTracer } from '../../src/engine/beamTracer'
import { GameConfig, createGameConfig } from '../../src/engine/config'
import { DiceBag } from '../../src/engine/diceBag'
import { Game } from '../../src/engine/game'
import { parseConstraints } from '../../src/engine/patterns'
import { PlacementValidator } from '../../src/engine/placementValidator'
import { SeededRandom } from '../../src/engine/rng'
import { ScoreCalculator } from '../../src/engine/scoreCalculator'
import {
  ColorConstraint,
  Die,
  OpenConstraint,
  ValueConstraint,
  sameDie,
} from '../../src/engine/types'
import { parseGrid } from '../helpers/board'

describe('class-based engine', () => {
  it('creates immutable run parameters without retaining mutable tier overrides', () => {
    const tiers = { bronze: 10, silver: 20, gold: 30 }
    const config = createGameConfig(-1, { tiers })
    expect(config).toBeInstanceOf(GameConfig)
    expect(config.seed).toBe(4294967295)
    tiers.gold = 999
    expect(config.tiers.gold).toBe(30)
    expect(Object.isFrozen(config)).toBe(true)
    expect(Object.isFrozen(config.tiers)).toBe(true)
  })

  it('keeps the original mulberry32 stream and independent state per instance', () => {
    const random = new SeededRandom(4294967299)
    const next = random.next
    const other = new SeededRandom(3)
    expect(random.seed).toBe(3)
    expect([next(), next(), next()]).toEqual([
      0.7202267837710679, 0.03866216051392257, 0.4561921926215291,
    ])
    expect(other.next()).toBe(0.7202267837710679)
  })

  it('draws immutable Die instances that still match serialized color/value data', () => {
    const bag = new DiceBag(new GameConfig(3), new SeededRandom(3).next)
    const die = bag.draw(1)[0]!
    const data = JSON.parse(JSON.stringify(die)) as Die
    expect(die).toBeInstanceOf(Die)
    expect(Object.isFrozen(die)).toBe(true)
    expect(sameDie(die, data)).toBe(true)
    expect(sameDie(die, { color: die.color, value: 7 })).toBe(false)
  })

  it('loads printed demands as immutable constraint classes with their own acceptance rules', () => {
    const [color, value, open] = parseConstraints(['R3.', '...', '...'])[0]!
    expect(color).toBeInstanceOf(ColorConstraint)
    expect(value).toBeInstanceOf(ValueConstraint)
    expect(open).toBeInstanceOf(OpenConstraint)
    const red3 = new Die('red', 3)
    const blue3 = new Die('blue', 3)
    const red4 = new Die('red', 4)
    expect([color!.accepts(red3), color!.accepts(blue3), color!.accepts(red4)]).toEqual([
      true,
      false,
      true,
    ])
    expect([value!.accepts(red3), value!.accepts(blue3), value!.accepts(red4)]).toEqual([
      true,
      true,
      false,
    ])
    expect([open!.accepts(red3), open!.accepts(blue3), open!.accepts(red4)]).toEqual([
      true,
      true,
      true,
    ])
    expect([color, value, open].every(Object.isFrozen)).toBe(true)
  })

  it('reuses a validator without retaining a previous board or rejection', () => {
    const validator = new PlacementValidator()
    const die = new Die('blue', 3)
    const check = {
      grid: parseGrid(['.. ..', '.. ..']),
      constraints: parseConstraints(['R.', '..']),
      pool: [die],
      die,
      target: { row: 0, col: 0 },
    }
    expect(validator.findViolation(check)?.kind).toBe('constraintMismatch')
    expect(() => validator.assertValid(check)).toThrow(/printed demand/)
    expect(() => validator.assertValid({ ...check, target: { row: 0, col: 1 } })).not.toThrow()
  })

  it('keeps beam settings per tracer and resets traversal state between traces', () => {
    const grid = parseGrid(['R1 R1', 'B1 R1'])
    const entry = { position: { row: 1, col: 0 }, direction: 'east' } as const
    const capped = new BeamTracer(3)
    expect(capped.trace(grid, entry).totalScore).toBe(12)
    expect(new BeamTracer().trace(grid, entry).totalScore).toBe(15)
    expect(capped.trace(grid, entry).totalScore).toBe(12)
  })

  it('calculates reports with isolated tier settings and no retained run state', () => {
    const game = new Game(new GameConfig(3))
    const calculator = new ScoreCalculator({ bronze: 1, silver: 2, gold: 3 })
    const input = { grid: parseGrid(['.. ..', '.. ..']), objectives: game.objectives, beamTotal: 3 }
    expect(calculator.calculate(input)).toMatchObject({ total: 3, tier: 'gold' })
    expect(calculator.calculate({ ...input, beamTotal: 0 })).toMatchObject({
      total: 0,
      tier: 'none',
    })
    expect(new ScoreCalculator().calculate(input)).toMatchObject({ total: 3, tier: 'none' })
  })
})
