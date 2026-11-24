import { describe, expect, expectTypeOf, it } from 'vitest'
import type { AbstractModel, ModelEvent, ModelListener } from '@mvc'
import { CounterEvent, CounterModel } from './fixtures'

/**
 * Behaviour of the push-MVC event connector (prompt 03, reference: engine `Game.subscribe` /
 * `#emit`). Test-design criterion: one case per behaviour rule in prompt 03 §2 — ordered
 * delivery of the same object, duplicate registration, idempotent unsubscribe, snapshot
 * semantics for removal/addition during dispatch, exception propagation — plus generic variance.
 */

/** Listener that appends a tag to a shared log. */
function tagging(log: string[], tag: string): ModelListener<CounterEvent> {
  return { modelChanged: (event) => log.push(`${tag}:${event.value}`) }
}

describe('AbstractModel', () => {
  it('delivers the exact event object to every listener in registration order', () => {
    const model = new CounterModel()
    const received: Array<[string, CounterEvent]> = []
    for (const tag of ['a', 'b', 'c']) {
      model.addModelListener({ modelChanged: (e) => received.push([tag, e]) })
    }
    const event = model.increment()
    expect(received.map(([tag]) => tag)).toEqual(['a', 'b', 'c'])
    for (const [, e] of received) expect(e).toBe(event)
  })

  it('works with no listeners', () => {
    const model = new CounterModel()
    expect(() => model.increment()).not.toThrow()
    expect(model.value).toBe(1)
  })

  it('keeps a single registration for a listener added twice', () => {
    const model = new CounterModel()
    const log: string[] = []
    const listener = tagging(log, 'a')
    model.addModelListener(listener)
    model.addModelListener(listener)
    expect(model.listeners).toBe(1)
    model.increment()
    expect(log).toEqual(['a:1'])
  })

  it('returns an idempotent unsubscribe function', () => {
    const model = new CounterModel()
    const log: string[] = []
    const keep = tagging(log, 'keep')
    const unsubscribe = model.addModelListener(tagging(log, 'gone'))
    model.addModelListener(keep)
    unsubscribe()
    unsubscribe()
    expect(model.listeners).toBe(1)
    model.increment()
    expect(log).toEqual(['keep:1'])
  })

  it('removeModelListener removes, and is a no-op for an unknown listener', () => {
    const model = new CounterModel()
    const log: string[] = []
    const listener = tagging(log, 'a')
    model.removeModelListener(listener)
    model.addModelListener(listener)
    model.removeModelListener(listener)
    expect(model.listeners).toBe(0)
    model.increment()
    expect(log).toEqual([])
  })

  it('a listener removed during dispatch still receives the current event, then no more', () => {
    const model = new CounterModel()
    const log: string[] = []
    const late = tagging(log, 'late')
    model.addModelListener({
      modelChanged: (e) => {
        log.push(`remover:${e.value}`)
        model.removeModelListener(late)
      },
    })
    model.addModelListener(late)
    model.increment()
    model.increment()
    expect(log).toEqual(['remover:1', 'late:1', 'remover:2'])
  })

  it('a listener added during dispatch receives only later events', () => {
    const model = new CounterModel()
    const log: string[] = []
    const added = tagging(log, 'added')
    model.addModelListener({
      modelChanged: (e) => {
        log.push(`adder:${e.value}`)
        model.addModelListener(added)
      },
    })
    model.increment()
    model.increment()
    expect(log).toEqual(['adder:1', 'adder:2', 'added:2'])
  })

  it('propagates a listener exception to the caller and stops the loop', () => {
    const model = new CounterModel()
    const log: string[] = []
    model.addModelListener({
      modelChanged: () => {
        throw new RangeError('boom')
      },
    })
    model.addModelListener(tagging(log, 'after'))
    expect(() => model.increment()).toThrow(RangeError)
    expect(log).toEqual([])
  })

  it('a model over a narrower event type is assignable to AbstractModel<ModelEvent>', () => {
    expectTypeOf<CounterModel>().toMatchTypeOf<AbstractModel<ModelEvent>>()
    const widened: AbstractModel<ModelEvent> = new CounterModel()
    expect(widened).toBeInstanceOf(CounterModel)
  })
})

describe('ModelEvent', () => {
  it('carries its source model and narrowed kind', () => {
    const model = new CounterModel()
    const event = new CounterEvent(model, 7)
    expect(event.source).toBe(model)
    expect(event.kind).toBe('incremented')
    expectTypeOf(event.kind).toEqualTypeOf<'incremented'>()
  })

  it('keeps source non-enumerable and read-only so toEqual compares payloads only', () => {
    const a = new CounterEvent(new CounterModel(), 1)
    const b = new CounterEvent(new CounterModel(), 1)
    expect(Object.keys(a)).not.toContain('source')
    expect(a).toEqual(b)
    expect(() => {
      ;(a as { source: unknown }).source = null
    }).toThrow(TypeError)
  })
})
