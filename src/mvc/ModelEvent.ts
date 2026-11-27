// Type-only import: AbstractModel imports this module's type too, and a value import here
// would make the base class `undefined` at runtime through the cycle.
import type { AbstractModel } from './AbstractModel'

/**
 * Base of every semantic model event (MVC_RoseWindow.md §3 catalogue). A model creates one
 * per state change and pushes it through {@link AbstractModel.notifyChanged}.
 */
export abstract class ModelEvent {
  /** Discriminator, e.g. `'diePlaced'`; subclasses narrow it to a string literal. */
  abstract readonly kind: string

  /**
   * The model that published the event. Non-enumerable and read-only (defined with
   * `Object.defineProperty` in the constructor) so `toEqual` on two event streams compares
   * payloads and never deep-compares models. `declare` emits no class field that would
   * otherwise shadow it as an enumerable `undefined`.
   */
  declare readonly source: AbstractModel<ModelEvent>

  /**
   * Binds the event to its publisher.
   *
   * @param source - The model publishing this event.
   */
  protected constructor(source: AbstractModel<ModelEvent>) {
    Object.defineProperty(this, 'source', {
      value: source,
      enumerable: false,
      writable: false,
      configurable: false,
    })
  }
}
