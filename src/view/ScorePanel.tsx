import { useState } from 'react'
import type { Game } from '../engine/game'
import { useCountUp } from '../hooks/useCountUp'
import { sfx } from '../dev/sfx'
import { Icon } from './Icon'
import { MULTIPLIER_HEAT } from './palette'

export function SoundToggle() {
  const [muted, setMuted] = useState(sfx.muted)
  return (
    <button
      type="button"
      className="icon-btn"
      data-testid="sound-toggle"
      aria-pressed={!muted}
      aria-label={muted ? 'unmute sounds' : 'mute sounds'}
      onClick={() => {
        const next = sfx.toggleMute()
        setMuted(next)
        if (!next) sfx.tap()
      }}
    >
      <Icon name={muted ? 'mute' : 'volume'} size={20} />
    </button>
  )
}

/**
 * The top bar: pause, the running score (ticking up strike by strike while the
 * beam walks), the live multiplier, and one pip per round holding its score.
 */
export function ScorePanel({
  game,
  score,
  round,
  multiplier,
  onPause,
}: {
  game: Game
  /** Score to display: during the beam this climbs with each strike. */
  score: number
  round: number
  /** Live beam multiplier, or null when the beam is not running. */
  multiplier: number | null
  onPause: () => void
}) {
  const shown = useCountUp(score, 380)
  const rounds = game.config.rounds
  // While the beam walks, the round being scored stays unrevealed on its pip.
  const scores = multiplier !== null ? game.roundScores.slice(0, -1) : game.roundScores
  return (
    <header className="hud">
      <h1 className="sr-only">Rose Window</h1>
      <button
        type="button"
        className="icon-btn"
        data-testid="game-menu"
        aria-label="Pause menu"
        onClick={() => {
          sfx.tap()
          onPause()
        }}
      >
        <Icon name="pause" size={20} />
      </button>

      <div className="hud__center">
        <div className="hud__score-wrap">
          <p
            key={game.roundScores.length}
            className="hud__score"
            data-testid="beam-total"
            aria-label={`score ${score}`}
          >
            {shown}
          </p>
          {multiplier !== null && multiplier > 1 && (
            <span
              key={multiplier}
              className="hud__mult"
              data-testid="live-multiplier"
              style={{ '--heat': MULTIPLIER_HEAT[Math.min(multiplier, 5)] } as React.CSSProperties}
            >
              ×{multiplier}
            </span>
          )}
        </div>
        <div className="hud__rounds">
          <div
            className="hud__pips"
            data-testid="round-scores"
            aria-label="Points earned each round"
          >
            {Array.from({ length: rounds }, (_, i) => {
              const scored = scores[i]
              const state =
                scored !== undefined ? 'done' : i + 1 === round ? 'current' : 'future'
              return (
                <span
                  key={i}
                  className={`pip pip--${state}`}
                  aria-label={scored !== undefined ? `round ${i + 1} scored ${scored}` : undefined}
                >
                  {scored !== undefined ? scored : ''}
                </span>
              )
            })}
          </div>
          <span
            className="hud__round"
            data-testid="round-indicator"
            aria-label={`round ${round} of ${rounds}`}
          >
            ROUND {round}/{rounds}
          </span>
        </div>
      </div>

      <SoundToggle />
    </header>
  )
}
