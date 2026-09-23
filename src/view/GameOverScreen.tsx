import { useEffect, useState } from 'react'
import type { Game } from '../engine/game'
import { DieFace } from './Die'
import { Icon } from './Icon'
import { Shards } from './Fx'
import { useCountUp } from '../hooks/useCountUp'
import { sfx } from '../dev/sfx'
import { ACHIEVEMENTS, getLevel } from '../progression/profile'
import type { recordRun, RunMode } from '../progression/profile'

const STEP_MS = 330

/**
 * The end-of-run reveal, in beats: each tally line lands with a rising note,
 * the total counts up, the medal stamps, then XP fills. Tap anywhere to skip.
 */
export function GameOverScreen({
  game,
  onRestart,
  onNew,
  onDaily,
  onShare,
  rewards,
  xp,
  targetScore,
  mode = 'free',
  preview = false,
}: {
  game: Game
  onRestart: () => void
  /** Start a fresh free-play window (daily and challenge runs retry by default). */
  onNew: () => void
  onDaily?: () => void
  onShare?: () => void
  rewards?: ReturnType<typeof recordRun> | null
  /** Profile XP after this run was recorded. */
  xp: number
  targetScore?: number
  mode?: RunMode
  preview?: boolean
}) {
  const report = game.report
  const lines = report
    ? [{ objectiveId: 'beam', name: 'Beam', points: report.beamTotal }, ...report.lines]
    : []
  const totalAt = lines.length + 1
  const medalAt = totalAt + 4
  const endAt = medalAt + 2
  const [beat, setBeat] = useState(0)

  useEffect(() => {
    if (beat >= endAt) return
    const t = setTimeout(() => {
      const next = beat + 1
      if (next <= lines.length) sfx.tally(next)
      if (next === medalAt && report) sfx.fanfare(report.tier)
      setBeat(next)
    }, beat === 0 ? 500 : STEP_MS)
    return () => clearTimeout(t)
  }, [beat, endAt, lines.length, medalAt, report])

  const total = useCountUp(beat >= totalAt ? (report?.total ?? 0) : 0, 900)
  if (!report) return null

  const tiers = game.config.tiers
  const nextTier =
    report.tier === 'gold'
      ? null
      : report.tier === 'silver'
        ? { name: 'gold', at: tiers.gold }
        : report.tier === 'bronze'
          ? { name: 'silver', at: tiers.silver }
          : { name: 'bronze', at: tiers.bronze }
  const celebrate = report.tier === 'gold' || report.tier === 'silver' || rewards?.isPersonalBest
  const before = getLevel(xp - (rewards?.xpEarned ?? 0))
  const after = getLevel(xp)
  const levelUp = rewards?.recorded === true && after.level > before.level
  const revealed = beat >= endAt

  return (
    <div
      className="results"
      data-testid="game-over"
      onClick={() => {
        if (!revealed) setBeat(endAt)
      }}
    >
      {celebrate && beat >= medalAt && <Shards count={44} seed={report.total} />}
      <div className="results__card">
        <p className="results__eyebrow" data-testid="game-over-summary">
          {game.window?.pattern.name} complete
        </p>

        <div className="results__window" aria-label="Your finished window">
          {game.window?.dice.flat().map((die, i) => (
            <span key={i} className="results__pane">
              {die && <DieFace die={die} fluid />}
            </span>
          ))}
        </div>

        <div className="tally" data-testid="score-lines">
          {lines.map((line, i) => (
            <div
              key={line.objectiveId}
              className={`tally__row ${beat > i ? 'tally__row--in' : ''} ${line.objectiveId === 'beam' ? 'tally__row--beam' : ''}`}
            >
              <span>{line.name}</span>
              <strong aria-label={`${line.name} scored ${line.points}`}>+{line.points}</strong>
            </div>
          ))}
        </div>

        <div className={`total ${beat >= totalAt ? 'total--in' : ''}`}>
          <span className="total__label">Total</span>
          <span className="total__num" data-testid="final-total" aria-label={`final score ${report.total}`}>
            {total}
          </span>
          <span
            className={`medal medal--${report.tier} ${beat >= medalAt ? 'medal--in' : ''}`}
            aria-label={`tier ${report.tier}`}
          >
            <Icon name={report.tier === 'none' ? 'sun' : 'trophy'} size={26} />
            <span data-testid="final-tier">{report.tier}</span>
          </span>
        </div>

        <div className={`results__after ${revealed ? 'results__after--in' : ''}`}>
          {rewards?.isPersonalBest && (
            <p className="banner-line banner-line--gold">
              <Icon name="spark" size={16} /> New personal best
            </p>
          )}
          {targetScore !== undefined && (
            <p className="banner-line">
              {report.total > targetScore
                ? `You beat ${targetScore} by ${report.total - targetScore}!`
                : report.total === targetScore
                  ? `Dead even with ${targetScore}. Rematch?`
                  : `${targetScore - report.total} short of ${targetScore}`}
            </p>
          )}
          {nextTier && (
            <p className="results__next">
              {nextTier.at - report.total} more for {nextTier.name}
            </p>
          )}
          {rewards?.recorded && (
            <div className="xp" data-testid="earned-rewards">
              <div className="xp__head">
                <span className={levelUp ? 'xp__level xp__level--up' : 'xp__level'}>
                  {levelUp ? `Level up! ${after.level}` : `Level ${after.level}`}
                </span>
                <span>+{rewards.xpEarned} XP</span>
              </div>
              <div className="xp__bar">
                <span
                  style={{
                    width: `${(revealed ? after.progress : levelUp ? 0 : before.progress) * 100}%`,
                  }}
                />
              </div>
              {rewards.newAchievements.length > 0 && (
                <p className="xp__keepsake">
                  Unlocked:{' '}
                  {rewards.newAchievements
                    .map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.title)
                    .join(' · ')}
                </p>
              )}
            </div>
          )}
          {preview && <p className="results__next">Practice window: no XP for skipped rounds.</p>}

          <div className="results__actions">
            <button
              className="btn btn--gold btn--big btn--wide"
              data-testid="play-again"
              onClick={() => {
                sfx.tap()
                onRestart()
              }}
            >
              <Icon name="play" size={18} />
              {mode === 'free' ? 'Play again' : 'Try again'}
            </button>
            <div className="results__row">
              {onShare && !preview && (
                <button className="btn btn--violet" data-testid="share-result" onClick={onShare}>
                  <Icon name="share" size={18} /> Challenge
                </button>
              )}
              {onDaily && mode !== 'daily' && (
                <button className="btn" data-testid="results-daily" onClick={onDaily}>
                  <Icon name="calendar" size={18} /> Daily
                </button>
              )}
              {mode !== 'free' && (
                <button className="btn" data-testid="results-new" onClick={onNew}>
                  New
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
