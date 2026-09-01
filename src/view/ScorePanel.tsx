import { useEffect, useState } from 'react'
import type { Game } from '../engine/game'
import type { ScoreReport } from '../engine/scoreCalculator'

const TIER_STYLES: Record<string, string> = {
  none: 'bg-neutral-800 text-neutral-300',
  bronze: 'bg-amber-800 text-amber-100',
  silver: 'bg-slate-300 text-slate-900',
  gold: 'bg-amber-400 text-amber-950',
}

const TIER_GLOW: Record<string, string> = {
  gold: 'shadow-[0_0_18px_rgba(251,191,36,0.5)]',
}

/** Balatro-style chunky score panel: label, huge number, round chips. */
export function GameOverPanel({ game }: { game: Game }) {
  const report = game.report
  if (report === null) return null
  return (
    <div className="flex flex-col gap-3">
      <div className="panel flex items-center justify-between px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
          Final score
        </p>
        <span
          data-testid="final-tier"
          className={`rounded-md px-3 py-1 text-xs font-black uppercase tracking-[0.2em] ${TIER_STYLES[report.tier] ?? TIER_STYLES.none} ${TIER_GLOW[report.tier] ?? ''}`}
        >
          {report.tier}
        </span>
      </div>
      <p
        className="text-center text-6xl font-black text-amber-300 [text-shadow:0_3px_0_rgba(0,0,0,0.7)]"
        data-testid="final-total"
        aria-label={`final score ${report.total}`}
      >
        {report.total}
      </p>
      <div className="flex flex-col gap-1.5" data-testid="score-lines">
        {report.lines.map((line) => (
          <ScoreRow key={line.objectiveId} name={line.name} points={line.points} />
        ))}
        <ScoreRow name="Beam totals" points={report.beamTotal} accent />
      </div>
    </div>
  )
}

function ScoreRow({ name, points, accent }: { name: string; points: number; accent?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border-2 border-black/60 px-3 py-1.5 ${
        accent ? 'bg-[#3a2f1a]' : 'bg-[#211f1b]'
      }`}
    >
      <span className="text-xs font-semibold text-neutral-300">{name}</span>
      <span
        className={`text-lg font-black [text-shadow:0_2px_0_rgba(0,0,0,0.6)] ${accent ? 'text-amber-300' : 'text-orange-300'}`}
        aria-label={`${name} scored ${points}`}
      >
        {points}
      </span>
    </div>
  )
}

/** In-game chunky stat block. */
export function ScorePanel({ game, seed }: { game: Game; seed: number }) {
  const [pulse, setPulse] = useState(0)
  const lastRound = game.roundScores.length
  useEffect(() => {
    if (lastRound > 0) setPulse((p) => p + 1)
  }, [lastRound])

  return (
    <div className="panel flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
          Beam score
        </p>
        <p
          className="text-xs font-bold text-neutral-300"
          data-testid="round-indicator"
          aria-label={`round ${game.round} of ${game.config.rounds}`}
        >
          ROUND {game.round}/{game.config.rounds}
        </p>
      </div>
      <p
        key={pulse}
        className={`text-right text-5xl font-black leading-none text-amber-300 [text-shadow:0_3px_0_rgba(0,0,0,0.7)] ${pulse > 0 ? 'animate-place' : ''}`}
        data-testid="beam-total"
        aria-label={`beam total ${game.totalScore}`}
      >
        {game.totalScore}
      </p>
      <div className="flex flex-wrap justify-end gap-1" data-testid="round-scores">
        {game.roundScores.map((score, index) => (
          <span
            key={index}
            className="rounded border border-black/50 bg-black/40 px-1.5 py-0.5 text-[10px] font-bold text-neutral-300"
            aria-label={`round ${index + 1} scored ${score}`}
          >
            {score}
          </span>
        ))}
      </div>
      <p className="text-[9px] uppercase tracking-[0.18em] text-neutral-600">
        seed {seed} · {game.window?.pattern.name ?? '—'}
      </p>
    </div>
  )
}

export type { ScoreReport }
