import { describe, expect, it } from 'vitest'
import { subscribeModel } from '@mvc'
import { CounterController, CounterModel, RecordingView } from './fixtures'
import type { CounterEvent } from './fixtures'

/**
 * Controller–view coupling and the framework-free listener core of `useModelEvents`
 * (prompt 03 isolation protocol, step 2). Test-design criterion: state-based — view
 * attached / detached / replaced; subscribe / unsubscribe.
 */

describe('AbstractController', () => {
  it('exposes its model and starts with no view', () => {
    const model = new CounterModel()
    const controller = new CounterController(model)
    expect(controller.getModel()).toBe(model)
    expect(controller.attachedView).toBeNull()
  })

  it('routes feedback to the attached view, and to nothing once detached', () => {
    const controller = new CounterController(new CounterModel())
    const view = new RecordingView()
    controller.setView(view)
    controller.click()
    controller.click()
    controller.click()
    expect(view.shown).toEqual([{ kind: 'limit', message: 'three clicks' }])

    controller.setView(null)
    expect(controller.attachedView).toBeNull()
    expect(() => controller.click()).not.toThrow()
  })

  it('replaces the view on a second setView', () => {
    const controller = new CounterController(new CounterModel())
    const first = new RecordingView()
    const second = new RecordingView()
    controller.setView(first)
    controller.setView(second)
    controller.click()
    controller.click()
    controller.click()
    expect(first.shown).toEqual([])
    expect(second.shown).toHaveLength(1)
  })

  it('completes the push loop: gesture -> controller -> model -> event -> listener', () => {
    const model = new CounterModel()
    const controller = new CounterController(model)
    const values: number[] = []
    subscribeModel(model, (e) => values.push(e.value))
    controller.click()
    controller.click()
    expect(values).toEqual([1, 2])
  })
})

describe('subscribeModel', () => {
  it('forwards each event to the callback until unsubscribed', () => {
    const model = new CounterModel()
    const seen: CounterEvent[] = []
    const unsubscribe = subscribeModel(model, (e) => seen.push(e))
    const first = model.increment()
    unsubscribe()
    model.increment()
    expect(seen).toEqual([first])
    expect(seen[0]).toBe(first)
    expect(model.listeners).toBe(0)
  })

  it('registers a distinct listener per call, so two subscriptions both receive', () => {
    const model = new CounterModel()
    let count = 0
    subscribeModel(model, () => (count += 1))
    subscribeModel(model, () => (count += 1))
    model.increment()
    expect(count).toBe(2)
  })
})
