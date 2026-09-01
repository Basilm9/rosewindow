import type { Game } from '../engine/game'

export function ScorePanel({ game, seed }: { game: Game; seed: number }) {
  return (
    <section
      aria-label="Score"
      data-testid="score-panel"
      className="rounded-xl bg-neutral-900/80 p-4 ring-1 ring-neutral-800"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs uppercase tracking-widest text-neutral-400">Score</h2>
        <p
          className="text-sm text-neutral-300"
          data-testid="round-indicator"
          aria-label={`round ${game.round} of ${game.config.rounds}`}
        >
          Round {game.round} / {game.config.rounds}
        </p>
      </div>
      <p
        className="mt-2 text-3xl font-bold text-amber-100"
        data-testid="beam-total"
        aria-label={`beam total ${game.totalScore}`}
      >
        {game.totalScore}
      </p>
      <div className="mt-3 flex flex-wrap gap-1" data-testid="round-scores">
        {game.roundScores.map((score, index) => (
          <span
            key={index}
            className="rounded bg-neutral-950/70 px-1.5 py-0.5 text-xs text-neutral-300 ring-1 ring-neutral-800"
            aria-label={`round ${index + 1} scored ${score}`}
          >
            R{index + 1}: {score}
          </span>
        ))}
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-wide text-neutral-600">
        seed {seed} · pattern {game.window?.pattern.name ?? '—'}
      </p>
    </section>
  )
}
