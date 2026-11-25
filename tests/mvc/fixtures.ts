import { AbstractController, AbstractModel, ModelEvent } from '@mvc'
import type { Feedback, View } from '@mvc'

/**
 * Throw-away push-MVC fixtures (prompt 03 isolation protocol, step 1): a counter model that
 * publishes one event per increment, a controller over it, and a view that records feedback.
 */

/** Published by {@link CounterModel} after every increment. */
export class CounterEvent extends ModelEvent {
  readonly kind = 'incremented' as const

  constructor(
    source: CounterModel,
    readonly value: number,
  ) {
    super(source)
  }
}

/** Minimal concrete model: one integer, one mutator. */
export class CounterModel extends AbstractModel<CounterEvent> {
  #value = 0

  /** Current count. */
  get value(): number {
    return this.#value
  }

  /** Exposes the protected count for assertions. */
  get listeners(): number {
    return this.listenerCount
  }

  /** Adds one and publishes the new value. */
  increment(): CounterEvent {
    this.#value += 1
    const event = new CounterEvent(this, this.#value)
    this.notifyChanged(event)
    return event
  }

  /** Publishes an arbitrary event (lets tests send a pre-built instance). */
  publish(event: CounterEvent): void {
    this.notifyChanged(event)
  }
}

/** View stub that records every feedback request. */
export class RecordingView implements View {
  readonly shown: Feedback[] = []

  showFeedback(feedback: Feedback): void {
    this.shown.push(feedback)
  }
}

/** Controller that maps a "click" gesture to the model and reports a fixed feedback. */
export class CounterController extends AbstractController<CounterModel> {
  constructor(model: CounterModel) {
    super(model)
  }

  /** Gesture handler: increments the model; on the third click asks the view for feedback. */
  click(): void {
    const { value } = this.model.increment()
    if (value === 3) this.view?.showFeedback({ kind: 'limit', message: 'three clicks' })
  }

  /** Exposes the protected view for assertions. */
  get attachedView(): View | null {
    return this.view
  }
}
