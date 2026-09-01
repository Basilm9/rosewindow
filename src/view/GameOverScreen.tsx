import type { Game } from '../engine/game'
import { GameOverPanel } from './ScorePanel'

export function GameOverScreen({ game, onRestart }: { game: Game; onRestart: () => void }) {
  const report = game.report
  if (report === null) return null
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-[radial-gradient(ellipse_at_top,#2b2836_0%,#161519_70%)] p-5 sm:p-8">
      <header className="text-center">
        <h1 className="font-serif text-3xl tracking-wide text-amber-200 [text-shadow:0_2px_0_rgba(0,0,0,0.7)] sm:text-4xl">
          The window is complete
        </h1>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-neutral-500" data-testid="game-over-summary">
          {game.window?.pattern.name} · seed {game.config.seed}
        </p>
      </header>
      <div
        data-testid="game-over"
        className="w-full max-w-md animate-place rounded-2xl border-2 border-black/70 bg-[#262320] p-5 shadow-[inset_0_2px_0_rgba(255,255,255,0.06),0_6px_0_rgba(0,0,0,0.4)] sm:p-6"
      >
        <GameOverPanel game={game} />
      </div>
      <button
        type="button"
        data-testid="play-again"
        onClick={onRestart}
        className="rounded-xl border-2 border-black/70 bg-amber-500 px-8 py-3 text-lg font-black uppercase tracking-wide text-amber-950 shadow-[0_4px_0_rgba(0,0,0,0.5)] transition duration-150 hover:-translate-y-0.5 hover:bg-amber-400 active:translate-y-0 active:shadow-none"
      >
        New window
      </button>
    </main>
  )
}
