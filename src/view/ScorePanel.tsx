import { useEffect, useRef, useState } from 'react'
import type { Game } from '../engine/game'

/** Rolls the displayed number toward `target` with an ease-out — juicy counters. */
function useCountUp(target: number, ms = 600): number {
  const [display, setDisplay] = useState(target)
  const fromRef = useRef(target)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return
    let raf: number
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(from + (target - from) * eased))
      if (p < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      fromRef.current = target
    }
  }, [target, ms])

  return display
}

export function ScorePanel({ game, seed }: { game: Game; seed: number }) {
  const [pulse, setPulse] = useState(0)
  const lastRound = game.roundScores.length
  useEffect(() => {
    if (lastRound > 0) setPulse((p) => p + 1)
  }, [lastRound])

  const displayed = useCountUp(game.totalScore)

  return (
    <section
      aria-label="Score"
      data-testid="score-panel"
      className="rounded-2xl bg-neutral-900/80 p-4 ring-1 ring-neutral-800 backdrop-blur-sm sm:p-5"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-400">Score</h2>
        <p
          className="text-sm text-neutral-300"
          data-testid="round-indicator"
          aria-label={`round ${game.round} of ${game.config.rounds}`}
        >
          Round {game.round} / {game.config.rounds}
        </p>
      </div>
      <p
        key={pulse}
        className={`mt-2 text-4xl font-bold text-amber-100 drop-shadow-[0_0_10px_rgba(251,191,36,0.35)] ${pulse > 0 ? 'animate-place' : ''}`}
        data-testid="beam-total"
        aria-label={`beam total ${game.totalScore}`}
      >
        {displayed}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5" data-testid="round-scores">
        {game.roundScores.map((score, index) => (
          <span
            key={index}
            className="rounded-lg bg-neutral-950/70 px-2 py-1 text-xs text-neutral-300 ring-1 ring-neutral-800"
            aria-label={`round ${index + 1} scored ${score}`}
          >
            R{index + 1}: {score}
          </span>
        ))}
      </div>
      <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-neutral-600">
        seed {seed} · {game.window?.pattern.name ?? '—'}
      </p>
    </section>
  )
}
