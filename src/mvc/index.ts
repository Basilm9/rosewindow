/**
 * Package `mvc`: push-MVC infrastructure after John Hunt — `ModelListener`, `ModelEvent`,
 * `AbstractModel`, `AbstractController`, `View`, `subscribeModel` (MVC_RoseWindow.md §2, §4).
 * Imports nothing from other application packages (§5).
 *
 * The React hook `useModelEvents` lives in `@mvc/react/useModelEvents` and is deliberately not
 * re-exported here, so the model can import `@mvc` without pulling React.
 * @packageDocumentation
 */
export type { ModelListener } from './ModelListener'
export { ModelEvent } from './ModelEvent'
export { AbstractModel } from './AbstractModel'
export { AbstractController } from './AbstractController'
export type { Feedback, View } from './View'
export { subscribeModel } from './subscribeModel'
