import type { Game } from '../engine/game'
import { DieFace } from './Die'
import { dieLabel } from './palette'

export function DraftPool({ game, statePath }: { game: Game; statePath: string }) {
  const hand = game.hand
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
        {game.draftPool.dice.map((die, index) => (
          <DieFace key={`${die.color}-${die.value}-${index}`} die={die} testId={`draft-die-${index}`} />
        ))}
      </div>
      <p className="mt-3 text-sm text-neutral-300" data-testid="draft-hint">
        {hint}
      </p>
      {statePath !== 'round.place' && statePath !== 'round.draft' && (
        <p className="mt-1 text-sm text-neutral-500">—</p>
      )}
    </section>
  )
}
