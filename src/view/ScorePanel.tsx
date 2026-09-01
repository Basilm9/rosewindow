import { useEffect, useState } from 'react'
import type { Game } from '../engine/game'

export function ScorePanel({ game, seed }: { game: Game; seed: number }) {
  const [pulse, setPulse] = useState(0)
  const lastRound = game.roundScores.length
  useEffect(() => {
    if (lastRound > 0) setPulse((p) => p + 1)
  }, [lastRound])

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
        className={`mt-2 text-4xl font-bold text-amber-100 ${pulse > 0 ? 'animate-place' : ''}`}
        data-testid="beam-total"
        aria-label={`beam total ${game.totalScore}`}
      >
        {game.totalScore}
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
