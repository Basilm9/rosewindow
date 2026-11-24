import type { AbstractModel } from './AbstractModel'
import type { ModelEvent } from './ModelEvent'
import type { View } from './View'

/**
 * Base of every push-MVC controller (Hunt: Strategy). Turns user gestures forwarded by a view
 * into model calls and asks the attached view for feedback. Subclasses add the gesture methods.
 *
 * @typeParam M - The model type this controller drives.
 */
export abstract class AbstractController<M extends AbstractModel<ModelEvent>> {
  /** The model this controller drives. */
  protected readonly model: M

  /** The attached view, or null when none is mounted. */
  protected view: View | null = null

  /**
   * Binds the controller to its model.
   *
   * @param model - The model to drive.
   */
  protected constructor(model: M) {
    this.model = model
  }

  /**
   * Attaches (or with `null` detaches) the view that receives feedback. A second call
   * replaces the previous view.
   *
   * @param view - The view to attach, or null to detach.
   */
  setView(view: View | null): void {
    this.view = view
  }

  /**
   * The driven model, for read access and listener registration by the view layer.
   *
   * @returns The model passed to the constructor.
   */
  getModel(): M {
    return this.model
  }
}
