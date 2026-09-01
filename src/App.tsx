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
      className="rounded-lg border-2 border-black/60 bg-black/40 px-2 py-1 text-sm text-neutral-300 transition hover:text-amber-200"
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
    forfeitNotice,
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
      className={`mx-auto flex h-[100dvh] w-full max-w-7xl flex-col gap-3 overflow-hidden p-3 sm:gap-4 sm:p-5 ${
        shaking ? 'animate-shake-screen' : ''
      }`}
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ===== sidebar ===== */}
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
          <div className="panel px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="font-serif text-xl tracking-wide text-amber-200 [text-shadow:0_2px_0_rgba(0,0,0,0.7)]">
                Rose Window
              </h1>
              <SoundToggle />
            </div>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              {game.window?.pattern.name} · seed {seed}
            </p>
          </div>

          <ScorePanel game={game} seed={seed} />
          <Objectives game={game} />

          <div className="flex flex-col gap-2">
            {forfeitNotice !== null && (
              <p
                data-testid="forfeit-banner"
                className="rounded-lg border-2 border-orange-900/70 bg-orange-950/50 px-3 py-2 text-xs font-semibold text-orange-200"
                role="status"
              >
                Round {forfeitNotice} forfeited — no legal placements. The beam still scores.
              </p>
            )}
            {snapshot.context.lastError !== null && (
              <p
                data-testid="rejection-hint"
                className="animate-reject rounded-lg border-2 border-red-900/70 bg-red-950/60 px-3 py-2 text-xs font-semibold text-red-200"
                role="alert"
              >
                Rejected: {snapshot.context.lastError}
              </p>
            )}
          </div>
        </aside>

        {/* ===== play area ===== */}
        <main className="flex min-h-0 flex-col items-center justify-center gap-3">
          <p
            className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300/80"
            data-testid="entry-hint"
          >
            {animating
              ? 'the beam scores the window…'
              : forfeitNotice !== null
                ? `round ${forfeitNotice} forfeited`
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
          <DraftPool
            game={game}
            statePath={path}
            onPick={(die) => {
              sfx.pickup()
              send({ type: 'SELECT_DIE', die })
            }}
          />
        </main>
      </div>
    </div>
  )
}
