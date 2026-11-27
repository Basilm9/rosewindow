import { describe, expect, it } from 'vitest'
import { subscribeModel } from '@mvc'
import { CounterController, CounterModel, RecordingView } from './fixtures'

/**
 * Controller–view coupling and the framework-free listener core of `useModelEvents`
 * (prompt 03 isolation protocol, step 2). Test-design criterion: state-based — view
 * attached / detached / replaced; subscribe / unsubscribe.
 *
 * Prompt 04 test-design criterion: branch coverage of `setView` (attach / replace / detach).
 * C1 new controller → no view; C2 `getModel()` is the constructor model; C3 `setView(v1)` → v1;
 * C4 `setView(v1)` then `setView(v2)` → v2; C5 `setView(v1)` then `setView(null)` → null.
 * (`attachedView` in the fixture plays the role of prompt 04's `currentView()`.)
 *
 * Error kinds: the MVC base classes raise no `GameError`.
 */

describe('AbstractController', () => {
  it('C1 C2 exposes its model and starts with no view', () => {
    const model = new CounterModel()
    const controller = new CounterController(model)
    expect(controller.getModel()).toBe(model)
    expect(controller.attachedView).toBeNull()
  })

  it('C3 C5 routes feedback to the attached view, and to nothing once detached', () => {
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

  it('C4 replaces the view on a second setView', () => {
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
