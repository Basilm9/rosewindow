import { describe, expect, it } from 'vitest'
import { subscribeModel } from '@mvc'
import { CounterModel } from './fixtures'

/**
 * `subscribeModel`, the framework-free listener core of `useModelEvents` (prompt 04).
 * Test-design criterion: branch coverage of subscribe / unsubscribe.
 * S1 the callback receives 2 events with values `[1, 2]`; S2 after the returned unsubscribe,
 * 0 further calls; S3 two subscriptions with the same callback function are independent
 * (unsubscribing one leaves 1 call per event).
 *
 * Error kinds: the MVC base classes raise no `GameError`.
 */

describe('subscribeModel', () => {
  it('S1 the callback receives every event in order', () => {
    const model = new CounterModel()
    const values: number[] = []
    subscribeModel(model, (e) => values.push(e.value))
    model.increment()
    model.increment()
    expect(values).toEqual([1, 2])
  })

  it('S2 no further calls after the returned unsubscribe', () => {
    const model = new CounterModel()
    const values: number[] = []
    const unsubscribe = subscribeModel(model, (e) => values.push(e.value))
    model.increment()
    unsubscribe()
    model.increment()
    expect(values).toEqual([1])
    expect(model.listeners).toBe(0)
  })

  it('S3 two subscriptions with the same callback are independent', () => {
    const model = new CounterModel()
    const values: number[] = []
    const callback = (e: { value: number }): void => {
      values.push(e.value)
    }
    const unsubscribeFirst = subscribeModel(model, callback)
    subscribeModel(model, callback)
    model.increment()
    unsubscribeFirst()
    model.increment()
    expect(values).toEqual([1, 1, 2])
    expect(model.listeners).toBe(1)
  })
})
