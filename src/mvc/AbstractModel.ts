import type { ModelEvent } from './ModelEvent'
import type { ModelListener } from './ModelListener'

/**
 * Base of every push-MVC model (Hunt: the Observable). Owns the listener registry and the
 * notification loop; knows nothing about views or controllers. Subclasses publish state
 * changes by calling {@link AbstractModel.notifyChanged | notifyChanged}.
 *
 * Every method uses method syntax (not arrow properties) so that, under
 * `strictFunctionTypes`, `AbstractModel<SubEvent>` stays assignable to
 * `AbstractModel<ModelEvent>`.
 *
 * @typeParam E - The event type this model publishes.
 */
export abstract class AbstractModel<E extends ModelEvent> {
  /** Registered listeners; a Set keeps registration order and ignores duplicates. */
  readonly #listeners: Set<ModelListener<E>> = new Set()

  /**
   * Registers `listener` for every later event. Registering an already registered listener
   * leaves a single registration (and keeps its original position).
   *
   * @param listener - The listener to register.
   * @returns An idempotent unsubscribe function (calling it twice is harmless).
   */
  addModelListener(listener: ModelListener<E>): () => void {
    this.#listeners.add(listener)
    return () => {
      this.removeModelListener(listener)
    }
  }

  /**
   * Removes `listener`; a no-op if it is not registered.
   *
   * @param listener - The listener to remove.
   */
  removeModelListener(listener: ModelListener<E>): void {
    this.#listeners.delete(listener)
  }

  /** Number of registered listeners (diagnostics and tests). */
  protected get listenerCount(): number {
    return this.#listeners.size
  }

  /**
   * The notification loop: sends `event` to each registered listener in registration order,
   * synchronously. Iterates a snapshot taken at the start of dispatch, so a listener removed
   * during dispatch still receives this event, and a listener added during dispatch receives
   * only later events (same semantics as the reference `Game.#emit`).
   *
   * @param event - The event to publish; every listener receives this exact object.
   * @throws Whatever a listener throws: the exception propagates to the caller unchanged and
   *   the remaining listeners do not receive the event.
   */
  protected notifyChanged(event: E): void {
    for (const listener of [...this.#listeners]) {
      listener.modelChanged(event)
    }
  }
}
