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
    body: 'Fill the 4×4 window with dice, then a beam of light scores every pane it passes through. Pick one of the two window patterns to begin.',
    requires: 'pattern',
  },
  {
    title: 'Draft a die',
    body: 'Five dice are drawn from the bag each round. Click any die in the hand below to pick it up.',
    requires: 'draft',
  },
  {
    title: 'Place it',
    body: 'Hover the window: panes breathe green where the die may go, red where the law forbids it. Click a glowing pane to set the glass.',
    requires: 'placed1',
  },
  {
    title: 'The beam',
    body: 'After 2 placements the beam enters from the marked edge and walks the window, scoring every die: value × multiplier. Warm glass (red, yellow) bends it clockwise; cool glass (blue, green) counter-clockwise; purple passes straight.',
  },
  {
    title: 'Lockout & multiplier',
    body: 'A bend of value V locks the beam straight for V−1 panes — a 1 bends again instantly, a 6 commits to a long run. Every bend raises the multiplier by 1, capped at ×5.',
  },
  {
    title: 'Objectives & the end',
    body: 'Three public objectives and your private color goal score when the window is full after round 8. If no die fits anywhere, the round is forfeited — the beam still fires, so plan ahead.',
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
export function useTutorial(game: Game, path: string): Tutorial {
  const [active, setActive] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tutorial') === '1') return true
    const organic = !params.has('seed') && !params.has('round') && !params.has('tutorial')
    return organic && localStorage.getItem(STORAGE_KEY) !== 'done'
  })
  const [step, setStep] = useState(0)
  const placedSeen = useRef(false)

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'done')
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
