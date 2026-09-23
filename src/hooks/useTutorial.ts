import { useCallback, useEffect, useRef, useState } from 'react'
import type { Game } from '../engine/game'

export interface TutorialStep {
  readonly title: string
  readonly body: string
  /**
   * When set, the step auto-advances once the condition holds (the player just
   * performed the taught action). Unset steps advance via the Next button.
   */
  readonly requires?: 'pattern' | 'draft' | 'placed1'
  readonly cta?: string
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    title: 'Welcome, glazier',
    body: 'Fill the window with glass dice, then bend a beam of light through them for points. Pick a window to begin.',
    requires: 'pattern',
  },
  {
    title: 'Draft a die',
    body: 'Tap any die in your tray to lift it.',
    requires: 'draft',
  },
  {
    title: 'Place it',
    body: 'Glowing panes can take it. Your first die goes on the outer edge. Tap one.',
    requires: 'placed1',
  },
  {
    title: 'The beam',
    body: 'After 2 dice, light enters at the sun. Red and yellow turn it right, blue and green turn it left, purple lets it pass straight. Every die it passes scores.',
  },
  {
    title: 'Lockout & multiplier',
    body: 'Each turn raises the multiplier, up to ×5. After a turn on a die showing N, the light goes straight for N−1 panes.',
  },
  {
    title: 'Objectives & the end',
    body: 'The four goals under the score pay out after round 8. Dice side by side can’t share a color or number, so plan ahead.',
    cta: 'Start building',
  },
]

const STORAGE_KEY = 'rosewindow-tutorial'

export interface Tutorial {
  active: boolean
  step: number
  next: () => void
  skip: () => void
}

/**
 * First-run tutorial: shows organically on a fresh visit (no seed/round params,
 * flag unset), can be forced with `?tutorial=1`, and never shows again once
 * skipped or finished.
 */
export function useTutorial(game: Game, path: string, enabled?: boolean): Tutorial {
  const [active, setActive] = useState(() => {
    if (enabled !== undefined) return enabled
    const params = new URLSearchParams(window.location.search)
    if (params.get('tutorial') === '1') return true
    const organic = !params.has('seed') && !params.has('round') && !params.has('tutorial')
    try {
      return organic && localStorage.getItem(STORAGE_KEY) !== 'done'
    } catch {
      return organic
    }
  })
  const [step, setStep] = useState(0)
  const placedSeen = useRef(false)

  const finish = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'done')
    } catch {
      /* Tutorial works without storage. */
    }
    setActive(false)
  }, [])

  // auto-advance while the current step's condition already holds
  useEffect(() => {
    if (!active) return
    for (let i = step; i < TUTORIAL_STEPS.length; i++) {
      const requires = TUTORIAL_STEPS[i]!.requires
      if (requires === undefined) break
      const satisfied =
        requires === 'pattern'
          ? path !== 'setup'
          : requires === 'draft'
            ? game.hand !== null
            : (game.window?.placedCount ?? 0) >= 1
      if (!satisfied) break
      if (i === TUTORIAL_STEPS.length - 1) {
        finish()
        return
      }
      setStep(i + 1)
    }
  }, [active, step, path, game, finish])

  // a placement while teaching step 2 jumps to the post-placement rules
  useEffect(() => {
    if (!active) return
    if ((game.window?.placedCount ?? 0) >= 1 && !placedSeen.current) {
      placedSeen.current = true
      setStep((s) => (s < 3 ? 3 : s))
    }
  }, [active, game])

  const next = useCallback(() => {
    if (step >= TUTORIAL_STEPS.length - 1) {
      finish()
    } else {
      setStep((s) => s + 1)
    }
  }, [step, finish])

  const skip = finish

  return { active, step, next, skip }
}
