import { statePath, useGame } from './hooks/useGame'
import { GlassBoard } from './view/GlassBoard'
import { DraftPool } from './view/DraftPool'
import { Objectives } from './view/Objectives'
import { ScorePanel } from './view/ScorePanel'
import SetupScreen from './view/SetupScreen'
import { GameOverScreen } from './view/GameOverScreen'

export default function App() {
  const { game, snapshot, send, seed } = useGame()
  const path = statePath(snapshot)

  if (path === 'setup') {
    return <SetupScreen game={game} onChoose={(id) => send({ type: 'CHOOSE_PATTERN', id })} />
  }

  if (snapshot.status === 'done' || game.phase === 'gameOver') {
    return (
      <GameOverScreen
        game={game}
        onRestart={() => {
          window.location.search = `?seed=${seed + 1}`
        }}
      />
    )
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-8">
      <header className="flex items-baseline justify-between">
        <h1 className="font-serif text-3xl tracking-wide text-amber-100">Rose Window</h1>
        <p className="text-xs uppercase tracking-widest text-neutral-500">
          {game.window?.pattern.name}
        </p>
      </header>
      <div className="flex flex-wrap items-start justify-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs uppercase tracking-widest text-amber-300/80">
            beam enters at row {game.currentEntry.position.row}, column{' '}
            {game.currentEntry.position.col}, heading {game.currentEntry.direction}
          </p>
          <GlassBoard game={game} />
        </div>
        <aside className="flex w-72 flex-col gap-4">
          <DraftPool game={game} statePath={path} />
          <ScorePanel game={game} seed={seed} />
          <Objectives game={game} />
          {snapshot.context.lastError !== null && (
            <p
              data-testid="rejection-hint"
              className="rounded-lg bg-red-950/60 px-3 py-2 text-xs text-red-200 ring-1 ring-red-900"
              role="alert"
            >
              Rejected: {snapshot.context.lastError}
            </p>
          )}
        </aside>
      </div>
    </main>
  )
}
