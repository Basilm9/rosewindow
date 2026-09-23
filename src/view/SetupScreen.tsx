import type { Game } from '../engine/game'
import type { CellConstraint } from '../engine/types'
import { sfx } from '../dev/sfx'
import { Icon } from './Icon'

function MiniCell({ constraint }: { constraint: CellConstraint }) {
  if (constraint.kind === 'color') {
    return <span className={`mini-cell glass-${constraint.color}`} title={`needs ${constraint.color}`} />
  }
  if (constraint.kind === 'value') {
    return (
      <span className="mini-cell mini-cell--value" title={`needs a ${constraint.value}`}>
        {constraint.value}
      </span>
    )
  }
  return <span className="mini-cell" title="anything goes" />
}

/** How demanding a pattern is: count of printed cells, shown as 1–3 gems. */
function difficulty(constraints: readonly (readonly CellConstraint[])[]): number {
  const printed = constraints.flat().filter((c) => c.kind !== 'open').length
  return printed <= 5 ? 1 : printed <= 9 ? 2 : 3
}

function SetupScreen({
  game,
  onChoose,
  patternId,
  mode = 'free',
  level,
  best,
  targetScore,
}: {
  game: Game
  onChoose: (id: string) => void
  patternId?: string
  mode?: 'free' | 'daily' | 'challenge'
  level: number
  best: number
  targetScore?: number
}) {
  const patterns =
    patternId === undefined
      ? game.offeredPatterns
      : game.offeredPatterns.filter((pattern) => pattern.id === patternId)
  const locked = patternId !== undefined

  return (
    <main className="pick">
      <div className="pick__title">
        <p className="pick__logo">Rose Window</p>
        <div className="pick__chips">
          <span className="chip">
            <Icon name="spark" size={14} /> Level {level}
          </span>
          {best > 0 && (
            <span className="chip">
              <Icon name="trophy" size={14} /> Best {best}
            </span>
          )}
          {mode === 'daily' && (
            <span className="chip chip--gold">
              <Icon name="calendar" size={14} /> Daily window
            </span>
          )}
          {targetScore !== undefined && (
            <span className="chip chip--gold">
              <Icon name="trophy" size={14} /> Beat {targetScore}
            </span>
          )}
        </div>
      </div>

      <h2 className="pick__prompt">{locked ? 'Your window' : 'Pick a window'}</h2>
      <div
        className={`pick__cards${patterns.length === 1 ? ' pick__cards--single' : ''}`}
        data-testid="patterns-offered"
      >
        {patterns.map((pattern, i) => {
          const level = difficulty(pattern.constraints)
          return (
            <button
              key={pattern.id}
              type="button"
              data-testid={`pattern-${pattern.id}`}
              aria-label={`choose pattern ${pattern.name}`}
              onClick={() => {
                sfx.place()
                onChoose(pattern.id)
              }}
              className="pick-card"
              style={{ animationDelay: `${120 + i * 110}ms` }}
            >
              <span className="pick-card__grid" aria-label={`${pattern.name} layout`}>
                {pattern.constraints.flatMap((row, r) =>
                  row.map((constraint, c) => <MiniCell key={`${r}-${c}`} constraint={constraint} />),
                )}
              </span>
              <span className="pick-card__name">{pattern.name}</span>
              <span className="pick-card__gems" aria-label={`difficulty ${level} of 3`}>
                {[1, 2, 3].map((n) => (
                  <Icon key={n} name="gem" size={15} className={n <= level ? 'on' : ''} />
                ))}
              </span>
              <span className="pick-card__desc">{pattern.description}</span>
            </button>
          )
        })}
      </div>
      <p className="pick__seed">Window #{game.config.seed}</p>
    </main>
  )
}

export default SetupScreen
