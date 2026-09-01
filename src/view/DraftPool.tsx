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
    statePath === 'round.place'
      ? hand !== null
        ? `In hand: ${dieLabel(hand)} — choose a cell`
        : 'Choose a cell'
      : 'Select a die from the pool'

  return (
    <section
      aria-label="Draft pool"
      data-testid="draft-pool"
      className="rounded-xl bg-neutral-900/80 p-4 ring-1 ring-neutral-800"
    >
      <h2 className="text-xs uppercase tracking-widest text-neutral-400">Draft pool</h2>
      <div className="mt-3 flex gap-2" data-testid="draft-dice">
        {game.draftPool.dice.map((die, index) => {
          return (
            <button
              key={`${die.color}-${die.value}-${index}`}
              type="button"
              disabled={!canPick}
              aria-label={`select ${dieLabel(die)}`}
              data-testid={`draft-die-${index}`}
              onClick={() => onPick(die)}
              className="rounded-md transition disabled:cursor-not-allowed disabled:opacity-60 hover:ring-2 hover:ring-neutral-500"
            >
              <DieFace die={die} />
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-sm text-neutral-300" data-testid="draft-hint">
        {hint}
      </p>
    </section>
  )
}
