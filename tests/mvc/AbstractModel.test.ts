import { describe, expect, expectTypeOf, it } from 'vitest'
import type { AbstractModel, ModelEvent, ModelListener } from '@mvc'
import { CounterEvent, CounterModel } from './fixtures'

/**
 * Behaviour of the push-MVC event connector (prompt 03, reference: engine `Game.subscribe` /
 * `#emit`). Test-design criterion: one case per behaviour rule in prompt 03 §2 — ordered
 * delivery of the same object, duplicate registration, idempotent unsubscribe, snapshot
 * semantics for removal/addition during dispatch, exception propagation — plus generic variance.
 *
 * Prompt 04 test-design criterion: branch (edge) coverage of `addModelListener` (new /
 * duplicate), `removeModelListener` (present / absent), unsubscribe (first / repeated call) and
 * the `notifyChanged` loop (0, 1, many iterations; mutation during iteration).
 *
 * | Id  | Case                                     | Expected                                               |
 * | --- | ---------------------------------------- | ------------------------------------------------------ |
 * | M1  | notify with 0 listeners                  | no throw; `listeners === 0`                            |
 * | M2  | 1 listener                               | same instance (`toBe(event)`), `value === 1`, `source === model` |
 * | M3  | listeners a, b, c                        | log `['a','b','c']`                                    |
 * | M4  | same listener added twice                | 1 call; `listeners === 1`                              |
 * | M5  | returned unsubscribe                     | 0 calls after; `listeners === 0`                       |
 * | M6  | unsubscribe called twice                 | no throw; other listener still gets 1 call             |
 * | M7  | `removeModelListener` of unknown listener | no throw; `listeners` unchanged (1)                   |
 * | M8  | a removes b during dispatch              | first notify `['a','b','c']`, second `['a','c']`       |
 * | M9  | a adds d during dispatch                 | first notify `['a','b']`, second `['a','b','d']`       |
 * | M10 | listener throws `RangeError`             | `increment()` throws `RangeError`; later listeners not called |
 *
 * Error kinds: the MVC base classes raise no `GameError`; M10 is the single exception path
 * (listener exceptions propagate unchanged).
 */

/** Listener that appends a tag to a shared log. */
function tagging(log: string[], tag: string): ModelListener<CounterEvent> {
  return { modelChanged: (event) => log.push(`${tag}:${event.value}`) }
}

/** Listener that appends only its name to a shared log. */
function named(log: string[], name: string): ModelListener<CounterEvent> {
  return { modelChanged: () => log.push(name) }
}

describe('AbstractModel', () => {
  it('M1 works with no listeners', () => {
    const model = new CounterModel()
    expect(() => model.increment()).not.toThrow()
    expect(model.value).toBe(1)
    expect(model.listeners).toBe(0)
  })

  it('M2 a single listener receives the same event instance', () => {
    const model = new CounterModel()
    const received: CounterEvent[] = []
    model.addModelListener({ modelChanged: (e) => received.push(e) })
    const event = model.increment()
    expect(received).toEqual([event])
    expect(received[0]).toBe(event)
    expect(event.value).toBe(1)
    expect(event.source).toBe(model)
  })

  it('M3 notifies listeners a, b, c in registration order', () => {
    const model = new CounterModel()
    const log: string[] = []
    model.addModelListener(named(log, 'a'))
    model.addModelListener(named(log, 'b'))
    model.addModelListener(named(log, 'c'))
    model.increment()
    expect(log).toEqual(['a', 'b', 'c'])
  })

  it('M5 the returned unsubscribe stops delivery', () => {
    const model = new CounterModel()
    const log: string[] = []
    const unsubscribe = model.addModelListener(named(log, 'a'))
    unsubscribe()
    model.increment()
    expect(log).toEqual([])
    expect(model.listeners).toBe(0)
  })

  it('M7 removeModelListener of an unknown listener is a no-op', () => {
    const model = new CounterModel()
    const log: string[] = []
    model.addModelListener(named(log, 'a'))
    expect(() => model.removeModelListener(named(log, 'unknown'))).not.toThrow()
    expect(model.listeners).toBe(1)
  })

  it('M8 removal during dispatch', () => {
    const model = new CounterModel()
    const log: string[] = []
    const b = named(log, 'b')
    model.addModelListener({
      modelChanged: () => {
        log.push('a')
        model.removeModelListener(b)
      },
    })
    model.addModelListener(b)
    model.addModelListener(named(log, 'c'))
    model.increment()
    const first = log.splice(0)
    model.increment()
    expect(first).toEqual(['a', 'b', 'c'])
    expect(log).toEqual(['a', 'c'])
  })

  it('M9 addition during dispatch', () => {
    const model = new CounterModel()
    const log: string[] = []
    const d = named(log, 'd')
    model.addModelListener({
      modelChanged: () => {
        log.push('a')
        model.addModelListener(d)
      },
    })
    model.addModelListener(named(log, 'b'))
    model.increment()
    const first = log.splice(0)
    model.increment()
    expect(first).toEqual(['a', 'b'])
    expect(log).toEqual(['a', 'b', 'd'])
  })

  it('M4 keeps a single registration for a listener added twice', () => {
    const model = new CounterModel()
    const log: string[] = []
    const listener = tagging(log, 'a')
    model.addModelListener(listener)
    model.addModelListener(listener)
    expect(model.listeners).toBe(1)
    model.increment()
    expect(log).toEqual(['a:1'])
  })

  it('M6 returns an idempotent unsubscribe function', () => {
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

  it('M10 propagates a listener exception to the caller and stops the loop', () => {
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
