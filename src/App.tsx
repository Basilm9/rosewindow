import { useEffect, useState } from 'react'
import { statePath, useGame } from './hooks/useGame'
import { GlassBoard } from './view/GlassBoard'
import { DraftPool } from './view/DraftPool'
import { Objectives } from './view/Objectives'
import { ScorePanel } from './view/ScorePanel'
import SetupScreen from './view/SetupScreen'
import { GameOverScreen } from './view/GameOverScreen'
import { sfx } from './dev/sfx'

function SoundToggle() {
  const [muted, setMuted] = useState(sfx.muted)
  return (
    <button
      type="button"
      data-testid="sound-toggle"
      aria-pressed={!muted}
      aria-label={muted ? 'unmute sounds' : 'mute sounds'}
      onClick={() => setMuted(sfx.toggleMute())}
      className="rounded-lg px-2 py-1 text-lg text-neutral-400 ring-1 ring-neutral-800 transition hover:text-amber-200 hover:ring-amber-700/60"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}

export default function App() {
  const {
    game,
    snapshot,
    send,
    seed,
    legalPreview,
    rejection,
    lastPlaced,
    lastLit,
    shakeKey,
    beam,
    litCells,
    animating,
    onBeamDone,
    onBeamStrike,
  } = useGame()
  const path = statePath(snapshot)

  const [shaking, setShaking] = useState(false)
  useEffect(() => {
    if (shakeKey === 0) return
    setShaking(true)
    const t = setTimeout(() => setShaking(false), 470)
    return () => clearTimeout(t)
  }, [shakeKey])

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
    <div
      className={`mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 content-start gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 lg:p-8 ${
        shaking ? 'animate-shake-screen' : ''
      }`}
    >
      <header className="flex items-center justify-between gap-3 lg:col-span-2">
        <div className="flex items-baseline gap-3">
          <h1 className="bg-gradient-to-b from-amber-100 to-amber-300 bg-clip-text font-serif text-2xl tracking-wide text-transparent sm:text-3xl">
            Rose Window
          </h1>
          <p className="hidden text-xs uppercase tracking-[0.2em] text-neutral-500 sm:inline">
            {game.window?.pattern.name}
          </p>
        </div>
        <SoundToggle />
      </header>

      <main className="flex flex-col items-center gap-4 lg:row-start-2">
        <p
          className="text-center text-xs uppercase tracking-[0.18em] text-amber-300/80"
          data-testid="entry-hint"
        >
          {animating
            ? 'the beam scores the window…'
            : `beam enters at row ${game.currentEntry.position.row}, column ${game.currentEntry.position.col}, heading ${game.currentEntry.direction}`}
        </p>
        <GlassBoard
          game={game}
          legalPreview={legalPreview}
          rejection={rejection}
          lastPlaced={lastPlaced}
          lastLit={lastLit}
          beam={beam}
          litCells={litCells}
          animating={animating}
          onCellClick={(position) => {
            if (game.hand !== null) send({ type: 'PLACE_DIE', position })
          }}
          onBeamDone={onBeamDone}
          onBeamStrike={onBeamStrike}
        />
      </main>

      <aside className="flex w-full flex-col gap-4 lg:row-start-2">
        <DraftPool
          game={game}
          statePath={path}
          onPick={(die) => {
            sfx.pickup()
            send({ type: 'SELECT_DIE', die })
          }}
        />
        <ScorePanel game={game} seed={seed} />
        <Objectives game={game} />
        {snapshot.context.lastError !== null && (
          <p
            data-testid="rejection-hint"
            className="animate-reject rounded-xl bg-red-950/60 px-4 py-3 text-sm text-red-200 ring-1 ring-red-900"
            role="alert"
          >
            Rejected: {snapshot.context.lastError}
          </p>
        )}
      </aside>
    </div>
  )
}
