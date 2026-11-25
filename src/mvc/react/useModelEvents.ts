import { useEffect, useRef } from 'react'
import type { AbstractModel } from '../AbstractModel'
import type { ModelEvent } from '../ModelEvent'
import { subscribeModel } from '../subscribeModel'

/**
 * The React form of {@link ModelListener}: subscribes a function component to `model` on mount
 * and unsubscribes on unmount (or when `model` changes). This hook is the only place a view
 * touches a model directly, and only to listen.
 *
 * `onEvent` is kept in a ref updated every render, so the latest callback always runs but a new
 * callback identity never resubscribes. Under React StrictMode the effect's mount → cleanup →
 * mount leaves exactly one registration, so each event is delivered once.
 *
 * Not re-exported from the `@mvc` barrel, so the model can import `@mvc` without pulling React.
 *
 * @typeParam E - The event type the model publishes.
 * @param model - The model to listen to, or null to listen to nothing.
 * @param onEvent - Called with every event the model publishes while mounted.
 */
export function useModelEvents<E extends ModelEvent>(
  model: AbstractModel<E> | null,
  onEvent: (event: E) => void,
): void {
  const callback = useRef(onEvent)
  useEffect(() => {
    callback.current = onEvent
  })
  useEffect(
    () => (model ? subscribeModel(model, (event) => callback.current(event)) : undefined),
    [model],
  )
}
