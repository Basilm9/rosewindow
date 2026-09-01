import { describe, expect, it } from 'vitest'
import { createActor } from 'xstate'
import { traceBeam } from '../../src/engine/beamTracer'
import { parseGrid } from '../helpers/board'
import { beamMachine } from '../../src/machine/beamMachine'

function walk(path: ReturnType<typeof traceBeam>, multiplierCap?: number) {
  const actor = createActor(beamMachine, { input: { path, multiplierCap } }).start()
  const visited: string[] = []
  actor.subscribe((snap) => {
    const value = snap.value
    visited.push(typeof value === 'string' ? value : JSON.stringify(value))
  })
  let guard = 0
  while (actor.getSnapshot().status !== 'done' && guard++ < 200) {
    actor.send({ type: 'ADVANCE' })
  }
  return { actor, visited }
}

describe('beamMachine', () => {
  it('walks a bending path through traveling and refracting and terminates', () => {
    // (0,0) empty -> (0,1) R1 bends east->south -> south to the edge.
    const path = traceBeam(parseGrid(['.. R1 .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']), {
      position: { row: 0, col: 0 },
      direction: 'east',
    })
    const { actor, visited } = walk(path)
    expect(actor.getSnapshot().status).toBe('done')
    expect(visited).toContain('refracting')
    expect(visited).not.toContain('lockedStraight')
    expect(actor.getSnapshot().context.multiplier).toBe(2)
    expect(actor.getSnapshot().context.index).toBe(path.segments.length)
  })

  it('moves through lockedStraight while the value-6 lockout holds', () => {
    // R6 bends then locks five cells; Y3 under lockout must light lockedStraight.
    const path = traceBeam(
      parseGrid(['.. R6 .. ..', '.. Y3 .. ..', '.. .. .. ..', '.. .. .. ..']),
      { position: { row: 0, col: 0 }, direction: 'east' },
    )
    const { actor, visited } = walk(path)
    expect(actor.getSnapshot().status).toBe('done')
    expect(visited).toContain('lockedStraight')
    expect(actor.getSnapshot().context.multiplier).toBe(2)
    // R6 sets lockout 5; three cells are entered before exit (Y3, two empties).
    expect(actor.getSnapshot().context.lockout).toBe(2)
  })

  it('climbs the multiplier around the golden cycle and terminates with it', () => {
    const path = traceBeam(parseGrid(['R1 R1', 'B1 R1']), {
      position: { row: 1, col: 0 },
      direction: 'east',
    })
    const { actor, visited } = walk(path)
    expect(actor.getSnapshot().status).toBe('done')
    expect(actor.getSnapshot().context.multiplier).toBe(5)
    expect(visited.filter((v) => v === 'refracting')).toHaveLength(5)
  })

  it('terminates immediately on an exhausted single-segment path', () => {
    const path = traceBeam(parseGrid(['.. .. .. ..', '.. .. .. ..', '.. .. .. ..', '.. .. .. ..']), {
      position: { row: 0, col: 0 },
      direction: 'south',
    })
    // Single-cell path: the beam enters (0,0) heading south and exits.
    const { actor } = walk(path)
    expect(actor.getSnapshot().status).toBe('done')
    expect(actor.getSnapshot().context.index).toBe(path.segments.length)
  })
})
