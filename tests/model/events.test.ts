/**
 * Test-design criterion: INPUT-DOMAIN PARTITIONING over the event type — one partition per class
 * (7) — each checked for: kind literal, payload, base class, immutability, toData().
 * Events are published by a STUB MODEL defined in this file, never by `Game` (isolation).
 * Cases:
 *  K1 it.each over the 7 classes: instanceof ModelEvent and kind is
 *     diePlaced | placementRejected | draftPoolRefreshed | beamTraced | roundScored | roundForfeited | gameOver
 *  D1 DiePlacedEvent.toData()  -> { kind:'diePlaced', position:{row:0,col:1}, die:{color:'blue',value:2} }
 *  D2 PlacementRejectedEvent with adjacencyViolation offendingNeighbors [(0,0)] -> payload kept verbatim
 *  D3 DraftPoolRefreshedEvent copies dice: mutating the source array leaves event.dice length 5
 *  D4 BeamTracedEvent.toData().path equals path.toData() (directions as names)
 *  D5 RoundScoredEvent(round 7, delta 53) -> { kind:'roundScored', round:7, delta:53 }
 *  D6 RoundForfeitedEvent(round 3) -> { kind:'roundForfeited', round:3 }
 *  D7 GameOverEvent carries the ScoreReport instance (toBe), toData().report deep-equals it
 *  S1 event.source is the publishing model (toBe(stub))
 *  S2 Object.keys(event) does not contain 'source'
 *  S3 two events with equal payload but different sources are toEqual
 *  F1 every event is frozen (it.each over the 7)
 *  N1 notifyChanged delivers the same instance: listener receives e where e === published
 *  N2 a listener narrowing on kind reads payload without casts (compile-time check, run once)
 * Inc-45 temporary checks covered permanently here:
 *  L1 (inc-45 S1a–S1g) toData() equals the legacy literal for all seven kinds, incl.
 *     placementRejected with constraintMismatch carrying a ColorConstraint, beamTraced against
 *     plain segments
 *  L2 (inc-45 S2) source/keys/toData exclusion of source, it.each over the 7
 *  L3 (inc-45 S3) own enumerable keys of RoundScoredEvent are exactly delta, kind, round
 *  L4 (inc-45 S5) mutating position / dice array / neighbour list afterwards changes nothing
 *  L5 (inc-45 S6) no constructor throws on literal payloads
 *  (inc-45 T is covered by the type-level file tests/model/events.types.ts, run by pnpm typecheck)
 * Error kinds: none (event classes raise no exception).
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { AbstractModel, ModelEvent } from '@mvc'
import { BeamPath } from '../../src/model/BeamPath'
import { BeamSegment } from '../../src/model/BeamSegment'
import { ColorConstraint } from '../../src/model/CellConstraint'
import { Die } from '../../src/model/Die'
import { Direction } from '../../src/model/Direction'
import {
  BeamTracedEvent,
  DiePlacedEvent,
  DraftPoolRefreshedEvent,
  GameOverEvent,
  PlacementRejectedEvent,
  RoundForfeitedEvent,
  RoundScoredEvent,
  type GameEvent,
} from '../../src/model/events'
import { ScoreReport } from '../../src/model/ScoreReport'

/** Test double: publishes whatever event it is handed. Not production code. */
class StubModel extends AbstractModel<GameEvent> {
  /** Pushes `event` to every listener. */
  publish(event: GameEvent): void {
    this.notifyChanged(event)
  }
}

const P = { row: 0, col: 1 } as const
const DIE = (): Die => new Die('blue', 2)
const FIVE_DICE = (): Die[] => [
  new Die('red', 1),
  new Die('yellow', 2),
  new Die('blue', 3),
  new Die('green', 4),
  new Die('purple', 5),
]
const PATH = (): BeamPath =>
  new BeamPath(
    [
      new BeamSegment({ row: 0, col: 0 }, Direction.EAST, new Die('red', 1), 1),
      new BeamSegment({ row: 1, col: 0 }, Direction.SOUTH, null, 2),
    ],
    'exitedGrid',
  )
const REPORT = (): ScoreReport =>
  new ScoreReport([{ objectiveId: 'p1', name: 'Shades of Red', points: 4 }], 156, 'gold')

type Factory = (m: StubModel) => GameEvent

/** One factory per event class; each call builds fresh payload objects. */
const FACTORIES: readonly (readonly [GameEvent['kind'], Factory])[] = [
  ['diePlaced', (m) => new DiePlacedEvent(m, P, DIE())],
  [
    'placementRejected',
    (m) =>
      new PlacementRejectedEvent(m, P, {
        kind: 'adjacencyViolation',
        offendingNeighbors: [{ row: 0, col: 0 }],
      }),
  ],
  ['draftPoolRefreshed', (m) => new DraftPoolRefreshedEvent(m, FIVE_DICE())],
  ['beamTraced', (m) => new BeamTracedEvent(m, PATH())],
  ['roundScored', (m) => new RoundScoredEvent(m, 7, 53)],
  ['roundForfeited', (m) => new RoundForfeitedEvent(m, 3)],
  ['gameOver', (m) => new GameOverEvent(m, REPORT())],
]

/** L1: case ID, factory, legacy literal expected from toData(). Reports compared separately (D7). */
const LEGACY_TABLE: readonly (readonly [string, Factory, object])[] = [
  [
    'S1a diePlaced',
    (m) => new DiePlacedEvent(m, P, DIE()),
    { kind: 'diePlaced', position: { row: 0, col: 1 }, die: { color: 'blue', value: 2 } },
  ],
  [
    'S1b placementRejected adjacency',
    (m) =>
      new PlacementRejectedEvent(m, P, {
        kind: 'adjacencyViolation',
        offendingNeighbors: [{ row: 0, col: 0 }],
      }),
    {
      kind: 'placementRejected',
      position: { row: 0, col: 1 },
      violation: { kind: 'adjacencyViolation', offendingNeighbors: [{ row: 0, col: 0 }] },
    },
  ],
  [
    'S1b placementRejected constraintMismatch',
    (m) =>
      new PlacementRejectedEvent(m, P, {
        kind: 'constraintMismatch',
        expected: new ColorConstraint('red'),
      }),
    {
      kind: 'placementRejected',
      position: { row: 0, col: 1 },
      violation: { kind: 'constraintMismatch', expected: { kind: 'color', color: 'red' } },
    },
  ],
  [
    'S1c draftPoolRefreshed',
    (m) => new DraftPoolRefreshedEvent(m, FIVE_DICE()),
    {
      kind: 'draftPoolRefreshed',
      dice: [
        { color: 'red', value: 1 },
        { color: 'yellow', value: 2 },
        { color: 'blue', value: 3 },
        { color: 'green', value: 4 },
        { color: 'purple', value: 5 },
      ],
    },
  ],
  [
    'S1d beamTraced',
    (m) => new BeamTracedEvent(m, PATH()),
    {
      kind: 'beamTraced',
      path: {
        segments: [
          { position: { row: 0, col: 0 }, direction: 'east', die: { color: 'red', value: 1 }, points: 1 },
          { position: { row: 1, col: 0 }, direction: 'south', die: null, points: 0 },
        ],
        totalScore: 1,
        termination: 'exitedGrid',
      },
    },
  ],
  [
    'S1e roundScored',
    (m) => new RoundScoredEvent(m, 7, 53),
    { kind: 'roundScored', round: 7, delta: 53 },
  ],
  ['S1f roundForfeited', (m) => new RoundForfeitedEvent(m, 3), { kind: 'roundForfeited', round: 3 }],
]

let stub: StubModel

beforeEach(() => {
  stub = new StubModel()
})

describe('event classes: kind and base class', () => {
  it.each(FACTORIES)('K1 %s is a ModelEvent with its kind', (kind, make) => {
    const event = make(stub)
    expect(event).toBeInstanceOf(ModelEvent)
    expect(event.kind).toBe(kind)
  })

  it('K1 asserts all seven kind strings literally', () => {
    expect(FACTORIES.map(([, make]) => make(stub).kind)).toEqual([
      'diePlaced',
      'placementRejected',
      'draftPoolRefreshed',
      'beamTraced',
      'roundScored',
      'roundForfeited',
      'gameOver',
    ])
  })

  it.each(FACTORIES)('F1 %s is frozen', (_kind, make) => {
    expect(Object.isFrozen(make(stub))).toBe(true)
  })

  it.each(FACTORIES)('L5 (inc-45 S6) %s constructor does not throw on literal payloads', (_kind, make) => {
    expect(() => make(stub)).not.toThrow()
  })
})

describe('event payloads and toData()', () => {
  it('D1 DiePlacedEvent.toData() is the legacy diePlaced literal', () => {
    expect(new DiePlacedEvent(stub, P, DIE()).toData()).toEqual({
      kind: 'diePlaced',
      position: { row: 0, col: 1 },
      die: { color: 'blue', value: 2 },
    })
  })

  it('D2 PlacementRejectedEvent keeps an adjacency violation verbatim', () => {
    const event = new PlacementRejectedEvent(stub, P, {
      kind: 'adjacencyViolation',
      offendingNeighbors: [{ row: 0, col: 0 }],
    })
    expect(event.violation).toEqual(
      expect.objectContaining({ kind: 'adjacencyViolation', offendingNeighbors: [{ row: 0, col: 0 }] }),
    )
  })

  it('D3 DraftPoolRefreshedEvent copies dice: popping the source leaves length 5', () => {
    const dice = FIVE_DICE()
    const event = new DraftPoolRefreshedEvent(stub, dice)
    dice.pop()
    expect(event.dice).toHaveLength(5)
  })

  it('D4 BeamTracedEvent.toData().path equals path.toData()', () => {
    const path = PATH()
    expect(new BeamTracedEvent(stub, path).toData().path).toEqual(path.toData())
  })

  it('D5 RoundScoredEvent(7, 53).toData() is the legacy roundScored literal', () => {
    expect(new RoundScoredEvent(stub, 7, 53).toData()).toEqual({ kind: 'roundScored', round: 7, delta: 53 })
  })

  it('D6 RoundForfeitedEvent(3).toData() is the legacy roundForfeited literal', () => {
    expect(new RoundForfeitedEvent(stub, 3).toData()).toEqual({ kind: 'roundForfeited', round: 3 })
  })

  it('D7 GameOverEvent carries the report instance and toData() deep-equals it (inc-45 S1g)', () => {
    const report = REPORT()
    const event = new GameOverEvent(stub, report)
    expect(event.report).toBe(report)
    expect(event.toData()).toEqual({ kind: 'gameOver', report })
  })

  it.each(LEGACY_TABLE)('L1 (inc-45 %s) toData() equals the legacy literal', (_id, make, expected) => {
    expect(make(stub).toData()).toEqual(expected)
  })
})

describe('event source and structural equality', () => {
  it('S1 event.source is the publishing model', () => {
    expect(new RoundScoredEvent(stub, 7, 53).source).toBe(stub)
  })

  it('S2 Object.keys(event) does not contain source', () => {
    expect(Object.keys(new RoundScoredEvent(stub, 7, 53))).not.toContain('source')
  })

  it.each(FACTORIES)('L2 (inc-45 S2) %s: source is stub, absent from keys and toData()', (_kind, make) => {
    const event = make(stub)
    expect(event.source).toBe(stub)
    expect(Object.keys(event)).not.toContain('source')
    expect(Object.keys(event.toData())).not.toContain('source')
  })

  it('L3 (inc-45 S3) RoundScoredEvent own keys are exactly delta, kind, round', () => {
    expect(Object.keys(new RoundScoredEvent(stub, 1, 5)).sort()).toEqual(['delta', 'kind', 'round'])
  })

  it('S3 two events with equal payload but different sources are toEqual', () => {
    expect(new RoundScoredEvent(new StubModel(), 7, 53)).toEqual(new RoundScoredEvent(stub, 7, 53))
  })

  it.each(FACTORIES)('S3 (inc-45 S4) %s from two different stubs are toEqual', (_kind, make) => {
    expect(make(new StubModel())).toEqual(make(stub))
  })
})

describe('event immutability against later argument mutation (L4, inc-45 S5)', () => {
  it('L4 mutating the original position leaves DiePlacedEvent.position unchanged', () => {
    const position = { row: 0, col: 1 }
    const event = new DiePlacedEvent(stub, position, DIE())
    position.row = 3
    expect(event.position).toEqual({ row: 0, col: 1 })
  })

  it('L4 mutating the original position leaves PlacementRejectedEvent.position unchanged', () => {
    const position = { row: 0, col: 1 }
    const event = new PlacementRejectedEvent(stub, position, { kind: 'cellOccupied' })
    position.col = 3
    expect(event.position).toEqual({ row: 0, col: 1 })
  })

  it('L4 pushing onto the original dice array leaves DraftPoolRefreshedEvent.dice unchanged', () => {
    const dice = FIVE_DICE()
    const event = new DraftPoolRefreshedEvent(stub, dice)
    dice.push(new Die('red', 6))
    expect(event.dice).toHaveLength(5)
  })

  it('L4 mutating the original neighbour list leaves the violation unchanged', () => {
    const neighbour = { row: 0, col: 0 }
    const offendingNeighbors = [neighbour]
    const event = new PlacementRejectedEvent(stub, P, { kind: 'adjacencyViolation', offendingNeighbors })
    offendingNeighbors.push({ row: 1, col: 1 })
    neighbour.row = 2
    expect(event.violation).toEqual({ kind: 'adjacencyViolation', offendingNeighbors: [{ row: 0, col: 0 }] })
  })
})

describe('notification', () => {
  it('N1 notifyChanged delivers the very same instance', () => {
    const received: GameEvent[] = []
    stub.addModelListener({ modelChanged: (e) => received.push(e) })
    const event = new RoundScoredEvent(stub, 7, 53)
    stub.publish(event)
    expect(received[0]).toBe(event)
  })

  it('N2 a listener narrowing on kind reads the payload without casts', () => {
    const readDelta = (e: Extract<GameEvent, { kind: 'roundScored' }>): number => e.delta
    const deltas: number[] = []
    stub.addModelListener({ modelChanged: (e) => deltas.push(e.kind === 'roundScored' ? readDelta(e) : -1) })
    stub.publish(new RoundScoredEvent(stub, 7, 53))
    expect(deltas).toEqual([53])
  })
})
