import type { Game } from '../engine/game'
import type { Die } from '../engine/types'
import { DieFace } from './Die'
import { dieLabel } from './palette'

/** The player's hand: chunky dice centered under the board, Balatro style. */
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
          ? `${dieLabel(hand)} in hand — choose a pane`
          : 'Choose a pane'
        : 'Draft a die'

  return (
    <div
      className="flex w-full items-center justify-between gap-4 rounded-2xl border-2 border-black/70 bg-[#262320]/95 px-5 py-3 shadow-[inset_0_2px_0_rgba(255,255,255,0.06),0_5px_0_rgba(0,0,0,0.4)]"
      data-testid="draft-pool"
      aria-label="Draft pool"
    >
      <div className="flex min-h-14 flex-wrap items-center gap-2.5" data-testid="draft-dice">
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
            <DieFace die={hand} fluid className="ring-2 ring-amber-300/90" />
          </span>
        )}
      </div>
      <p
        className="max-w-44 text-right text-xs font-semibold leading-snug text-neutral-300"
        data-testid="draft-hint"
      >
        {hint}
      </p>
    </div>
  )
}
