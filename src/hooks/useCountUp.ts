import { useEffect, useRef, useState } from 'react'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Tweens a displayed number toward `target` (ease-out), so scores tick up rather
 * than jump. `delay` holds the old value first; reduced motion snaps instantly.
 */
export function useCountUp(target: number, duration = 600, delay = 0): number {
  const [shown, setShown] = useState(target)
  const from = useRef(target)
  const shownRef = useRef(target)

  useEffect(() => {
    if (reducedMotion() || duration <= 0) {
      shownRef.current = target
      setShown(target)
      return
    }
    from.current = shownRef.current
    let frame = 0
    let start = 0
    const timer = setTimeout(() => {
      const step = (now: number) => {
        if (start === 0) start = now
        const t = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - t, 3)
        const value = Math.round(from.current + (target - from.current) * eased)
        shownRef.current = value
        setShown(value)
        if (t < 1) frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)
    }, delay)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [target, duration, delay])

  return shown
}
