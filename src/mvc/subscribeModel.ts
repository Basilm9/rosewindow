import type { AbstractModel } from './AbstractModel'
import type { ModelEvent } from './ModelEvent'

/**
 * Framework-free core of `useModelEvents` (testable in Node): adapts a callback to a
 * {@link ModelListener} and registers it. Each call registers a new, distinct listener.
 *
 * @typeParam E - The event type the model publishes.
 * @param model - The model to listen to.
 * @param onEvent - Called with every event the model publishes while subscribed.
 * @returns An idempotent unsubscribe function.
 */
export function subscribeModel<E extends ModelEvent>(
  model: AbstractModel<E>,
  onEvent: (event: E) => void,
): () => void {
  return model.addModelListener({
    modelChanged(event: E): void {
      onEvent(event)
    },
  })
}
