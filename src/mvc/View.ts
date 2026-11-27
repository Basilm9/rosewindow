/**
 * Non-blocking feedback a controller asks its view to show (NFR-5.1, NFR-5.2), e.g. after the
 * model rejects an action.
 */
export interface Feedback {
  /** Machine-readable reason, e.g. `'adjacencyViolation'` or `'invalidPhase'`. */
  readonly kind: string
  /** Human-readable text for the player. */
  readonly message: string
  /** The board cell the feedback refers to (0-based), if any. */
  readonly position?: {
    /** 0-based row. */
    readonly row: number
    /** 0-based column. */
    readonly col: number
  }
}

/** What a controller may ask of its view (Hunt: controller → view selection/feedback). */
export interface View {
  /**
   * Shows `feedback` without blocking play.
   *
   * @param feedback - What to tell the player.
   */
  showFeedback(feedback: Feedback): void
}
