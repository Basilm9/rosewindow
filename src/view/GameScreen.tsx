import { useCallback, useEffect, useRef, useState } from 'react'
import { statePath, useGame } from '../hooks/useGame'
import type { RunSession } from '../hooks/runSession'
import { useTutorial } from '../hooks/useTutorial'
import type { Game } from '../engine/game'
import type { recordRun } from '../progression/profile'
import { sfx } from '../dev/sfx'
import { GlassBoard } from './GlassBoard'
import { DraftPool } from './DraftPool'
import { GoalDetails, Objectives } from './Objectives'
import { ScorePanel } from './ScorePanel'
import SetupScreen from './SetupScreen'
import { GameOverScreen } from './GameOverScreen'
import { TutorialOverlay } from './TutorialOverlay'
import { PauseMenu, RulesContent, Sheet } from './Menus'
import { RoundBanner, RoundBurst, Shards } from './Fx'
import { dieLabel } from './palette'
import { Icon } from './Icon'

/** Placement rejections in plain words: what went wrong and what to do instead. */
const FRIENDLY_ERRORS: Record<string, string> = {
  illegalFirstPlacement: 'Start at the edge. Your first die goes on the outer ring.',
  disconnectedPlacement: 'Keep the glass connected. Touch another die, even at a corner.',
  adjacencyViolation: 'Neighbors clash. Side-by-side dice need a different color and number.',
  constraintMismatch: 'This pane only takes its printed color or number.',
  cellOccupied: 'That pane already has glass. Pick an empty one.',
}

type Overlay = 'pause' | 'rules' | 'goals' | null

export function GameScreen({
  session,
  level,
  best,
  xp,
  rewards,
  onComplete,
  onRestart,
  onNew,
  onDaily,
  onShare,
}: {
  session: RunSession
  level: number
  best: number
  xp: number
  rewards: ReturnType<typeof recordRun> | null
  onComplete: (game: Game, session: RunSession) => void
  onRestart: () => void
  onNew: () => void
  onDaily: () => void
  onShare: (game: Game) => void
}) {
  const {
    game,
    snapshot,
    send,
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
    beamRun,
    roundBurst,
    objectiveLines,
  } = useGame(session)
  const path = statePath(snapshot)
  const tutorial = useTutorial(game, path, session.tutorial)
  const done = snapshot.status === 'done'
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [heldIndex, setHeldIndex] = useState<number | null>(null)
  const closeOverlay = useCallback(() => setOverlay(null), [])

  const completed = useRef(false)
  useEffect(() => {
    if (done && !completed.current) {
      completed.current = true
      onComplete(game, session)
    }
  }, [done, game, session, onComplete])

  // Screen shake on big rounds.
  const [shaking, setShaking] = useState(false)
  useEffect(() => {
    if (!shakeKey) return
    setShaking(true)
    const timer = setTimeout(() => setShaking(false), 480)
    return () => clearTimeout(timer)
  }, [shakeKey])

  // Round-result burst over the board.
  const [burst, setBurst] = useState<typeof roundBurst>(null)
  useEffect(() => {
    if (roundBurst === null) return
    setBurst(roundBurst)
    const timer = setTimeout(() => setBurst(null), 1500)
    return () => clearTimeout(timer)
  }, [roundBurst])

  // "Round N" ribbon whenever a fresh round opens for play.
  const round = animating ? game.roundScores.length : game.round
  const playing = path === 'round.draft' || path === 'round.place'
  const [banner, setBanner] = useState<number | null>(null)
  const bannerFor = useRef(0)
  useEffect(() => {
    if (!playing || done || bannerFor.current === game.round) return
    bannerFor.current = game.round
    setBanner(game.round)
    sfx.roundStart()
    const timer = setTimeout(() => setBanner(null), 1500)
    return () => clearTimeout(timer)
  }, [playing, done, game.round])

  // Rejection toast, visible for a moment after each refused placement.
  const [errorShown, setErrorShown] = useState<{ kind: string; key: number } | null>(null)
  useEffect(() => {
    if (rejection === null) return
    setErrorShown({ kind: rejection.kind, key: rejection.key })
    const timer = setTimeout(() => setErrorShown(null), 2600)
    return () => clearTimeout(timer)
  }, [rejection])
  useEffect(() => {
    if (lastPlaced !== null) setErrorShown(null)
  }, [lastPlaced])

  // Let the final round's burst land before the results slide over it.
  const [showResults, setShowResults] = useState(false)
  const burstAtEnd = useRef(false)
  burstAtEnd.current = burst !== null
  useEffect(() => {
    if (!done) return
    const timer = setTimeout(() => setShowResults(true), burstAtEnd.current ? 1300 : 0)
    return () => clearTimeout(timer)
  }, [done])

  const hand = game.hand
  const heldSlot = hand === null ? null : heldIndex
  const liveScore = animating
    ? game.totalScore - (game.roundScores.at(-1) ?? 0) + beamRun.points
    : game.totalScore

  const coach = tutorial.active && !done && (
    <TutorialOverlay step={tutorial.step} onNext={tutorial.next} onSkip={tutorial.skip} />
  )

  const sheets = (
    <>
      {overlay === 'pause' && (
        <PauseMenu
          mode={session.mode}
          seed={session.seed}
          onResume={closeOverlay}
          onRules={() => setOverlay('rules')}
          onDaily={onDaily}
          onNew={onNew}
        />
      )}
      {overlay === 'rules' && (
        <Sheet title="How to play" onClose={closeOverlay} testId="rules-sheet">
          <RulesContent />
        </Sheet>
      )}
      {overlay === 'goals' && (
        <Sheet title="Goals" onClose={closeOverlay} testId="goals-sheet">
          <p className="sheet__lede">These pay out when the window is finished. Points shown are what you’d get right now.</p>
          <GoalDetails game={game} lines={objectiveLines} />
        </Sheet>
      )}
    </>
  )

  if (path === 'setup')
    return (
      <div className="screen">
        <header className="hud hud--bare">
          <span />
          <span />
          <button
            type="button"
            className="icon-btn"
            aria-label="How to play"
            data-testid="setup-rules"
            onClick={() => setOverlay('rules')}
          >
            <Icon name="help" size={20} />
          </button>
        </header>
        <SetupScreen
          game={game}
          mode={session.mode}
          patternId={session.patternId}
          targetScore={session.targetScore}
          level={level}
          best={best}
          onChoose={(id) => send({ type: 'CHOOSE_PATTERN', id })}
        />
        {coach && <div className="coach-dock coach-dock--bottom">{coach}</div>}
        {sheets}
      </div>
    )

  const prompt = animating
    ? 'The beam scores the window…'
    : hand !== null
      ? 'Tap a glowing pane'
      : 'Pick your glass'

  return (
    <div
      className={`screen screen--play ${animating ? 'screen--beam' : ''} ${shaking ? 'animate-shake-screen' : ''} ${done ? 'screen--done' : ''}`}
    >
      <ScorePanel
        game={game}
        score={liveScore}
        round={round}
        multiplier={animating ? beamRun.multiplier : null}
        onPause={() => setOverlay('pause')}
      />

      {!done && (
        <Objectives game={game} lines={objectiveLines} onOpen={() => setOverlay('goals')} />
      )}
      {coach && <div className="coach-dock">{coach}</div>}

      <main className="board-zone" aria-label="Your window">
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
            if (game.hand) send({ type: 'PLACE_DIE', position })
          }}
          onBeamDone={onBeamDone}
          onBeamStrike={onBeamStrike}
        />
        {burst !== null && (
          <>
            <RoundBurst key={burst.key} delta={burst.delta} big={burst.delta >= 25} />
            {burst.delta >= 25 && <Shards key={`s${burst.key}`} count={26} seed={burst.key} />}
          </>
        )}
        {banner !== null && burst === null && (
          <RoundBanner
            key={banner}
            round={banner}
            rounds={game.config.rounds}
            direction={game.currentEntry.direction}
          />
        )}
      </main>

      {!done && (
        <footer className="deck">
          <div className="deck__prompt">
            <span className="prompt" data-testid="entry-hint" key={prompt}>
              {prompt}
            </span>
            <span className="place-pips" aria-label={`${game.placementsRemaining} left to place this round`}>
              {Array.from({ length: game.config.placementsPerRound }, (_, i) => (
                <span key={i} className={i < game.placementsRemaining && !animating ? 'on' : ''} />
              ))}
            </span>
          </div>
          <p className="sr-only" data-testid="draft-hint" role="status">
            {animating
              ? 'The beam scores the window…'
              : hand !== null
                ? `${dieLabel(hand)} in hand · choose a glowing pane`
                : 'Draft a die to begin your next move'}
          </p>
          <DraftPool
            game={game}
            statePath={path}
            heldIndex={heldSlot}
            canRefresh={snapshot.can({ type: 'REFRESH_DRAFT' })}
            canCancel={snapshot.can({ type: 'CANCEL_SELECTION' })}
            onPick={(die, slot) => {
              sfx.pickup()
              setHeldIndex(slot)
              send({ type: 'SELECT_DIE', die })
            }}
            onCancel={() => {
              sfx.putBack()
              send({ type: 'CANCEL_SELECTION' })
            }}
            onRefresh={() => {
              sfx.shuffle()
              send({ type: 'REFRESH_DRAFT' })
            }}
          />
        </footer>
      )}

      {errorShown !== null && !done && (
        <p
          key={errorShown.key}
          className="toast toast--bad"
          role="alert"
          data-testid="rejection-hint"
          data-error-kind={errorShown.kind}
        >
          {FRIENDLY_ERRORS[errorShown.kind] ?? 'That pane won’t take this die. Try a glowing one.'}
        </p>
      )}
      {forfeitNotice !== null && !done && (
        <p className="toast" role="status" data-testid="forfeit-banner">
          No die fit anywhere in round {forfeitNotice}. The beam still scores.
        </p>
      )}

      {showResults && (
        <GameOverScreen
          game={game}
          xp={xp}
          onRestart={onRestart}
          onNew={onNew}
          onDaily={onDaily}
          onShare={() => onShare(game)}
          rewards={rewards}
          targetScore={session.targetScore}
          mode={session.mode}
          preview={session.targetRound > 1}
        />
      )}
      {sheets}
    </div>
  )
}
