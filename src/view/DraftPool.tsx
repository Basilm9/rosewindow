import type { Game } from '../engine/game'
import type { Die } from '../engine/types'
import { DieFace } from './Die'
import { dieLabel } from './palette'

export function DraftPool({
  game,
  statePath,
  onPick,
}: {
  game: Game
  statePath: string
  onPick: (die: Die) => void
}) {
  const hand = game.hand
  const canPick = statePath === 'round.draft' || statePath === 'round.place'
  const hint =
    statePath === 'round.illuminate'
      ? 'The beam scores the window…'
      : statePath === 'round.place'
        ? hand !== null
          ? `In hand: ${dieLabel(hand)} — choose a cell`
          : 'Choose a cell'
        : 'Select a die from the pool'

  return (
    <section
      aria-label="Draft pool"
      data-testid="draft-pool"
      className="rounded-2xl bg-neutral-900/80 p-4 ring-1 ring-neutral-800 backdrop-blur-sm sm:p-5"
    >
      <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-400">Draft pool</h2>
      <div className="mt-3 flex min-h-14 flex-wrap items-center gap-2" data-testid="draft-dice">
        {game.draftPool.dice.map((die, index) => (
          <button
            key={`${die.color}-${die.value}-${index}`}
            type="button"
            disabled={!canPick}
            aria-label={`select ${dieLabel(die)}`}
            data-testid={`draft-die-${index}`}
            onClick={() => onPick(die)}
            className="die-slot"
          >
            <DieFace die={die} fluid />
          </button>
        ))}
        {hand !== null && (
          <span aria-hidden className="die-slot self-center cursor-default animate-wobble">
            <DieFace die={hand} fluid className="ring-2 ring-amber-300/80" />
          </span>
        )}
      </div>
      <p className="mt-3 text-sm text-neutral-300" data-testid="draft-hint">
        {hint}
      </p>
    </section>
  )
}
