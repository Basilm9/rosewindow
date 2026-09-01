import type { Game } from '../engine/game'

const TIER_STYLES: Record<string, string> = {
  none: 'bg-neutral-800 text-neutral-300',
  bronze: 'bg-amber-800/70 text-amber-100',
  silver: 'bg-slate-400/60 text-slate-50',
  gold: 'bg-gradient-to-r from-amber-300 to-amber-500 text-amber-950 shadow-[0_0_18px_rgba(251,191,36,0.4)]',
}

export function GameOverScreen({ game, onRestart }: { game: Game; onRestart: () => void }) {
  const report = game.report
  if (report === null) return null
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-7 bg-[radial-gradient(ellipse_at_top,#2b2836_0%,#161519_70%)] p-5 sm:p-8">
      <header className="text-center">
        <h1 className="bg-gradient-to-b from-amber-100 to-amber-300 bg-clip-text font-serif text-3xl tracking-wide text-transparent sm:text-4xl">
          The window is complete
        </h1>
        <p className="mt-2 text-sm text-neutral-400" data-testid="game-over-summary">
          {game.window?.pattern.name} · seed {game.config.seed}
        </p>
      </header>
      <div
        data-testid="game-over"
        className="w-full max-w-md animate-place rounded-3xl bg-neutral-900/90 p-6 ring-1 ring-neutral-800 backdrop-blur-sm sm:p-8"
      >
        <div className="flex items-center justify-between">
          <p
            className="text-5xl font-bold text-amber-100"
            data-testid="final-total"
            aria-label={`final score ${report.total}`}
          >
            {report.total}
          </p>
          <span
            data-testid="final-tier"
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] ${TIER_STYLES[report.tier] ?? TIER_STYLES.none}`}
          >
            {report.tier}
          </span>
        </div>
        <ul className="mt-6 space-y-2" data-testid="score-lines">
          {report.lines.map((line) => (
            <li
              key={line.objectiveId}
              className="flex items-center justify-between rounded-xl bg-neutral-950/60 px-4 py-2.5 text-sm ring-1 ring-neutral-800"
            >
              <span className="text-neutral-300">{line.name}</span>
              <span
                className="font-semibold text-amber-100"
                aria-label={`${line.name} scored ${line.points}`}
              >
                {line.points}
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between rounded-xl bg-neutral-950/60 px-4 py-2.5 text-sm ring-1 ring-amber-900/50">
            <span className="text-neutral-300">Beam totals</span>
            <span className="font-semibold text-amber-100">{report.beamTotal}</span>
          </li>
        </ul>
      </div>
      <button
        type="button"
        data-testid="play-again"
        onClick={onRestart}
        className="rounded-2xl bg-amber-500/90 px-8 py-3 font-semibold text-amber-950 transition duration-150 hover:-translate-y-0.5 hover:bg-amber-400"
      >
        New window
      </button>
    </main>
  )
}
