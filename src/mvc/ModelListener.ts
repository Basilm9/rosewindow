import type { ModelEvent } from './ModelEvent'

/**
 * Receives semantic events pushed by a model (Hunt: the view side of the event connector).
 * Register with {@link AbstractModel.addModelListener}.
 *
 * @typeParam E - The event type the model publishes.
 */
export interface ModelListener<E extends ModelEvent> {
  /**
   * Called once per published event, synchronously, in registration order.
   *
   * @param event - The exact event object the model published.
   */
  modelChanged(event: E): void
}
