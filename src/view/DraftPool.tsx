import type { Game } from '../engine/game'
import type { Die } from '../engine/types'
import { DieFace } from './Die'
import { dieLabel } from './palette'
import { Icon } from './Icon'

/**
 * The hand tray: the round's draft pool as chunky dice in lead sockets. The held
 * die stays in the slot it was lifted from (a view-only index) so the tray never
 * reshuffles under the player's thumb; tapping it again puts it back.
 */
export function DraftPool({
  game,
  statePath,
  heldIndex,
  canRefresh,
  canCancel,
  onPick,
  onCancel,
  onRefresh,
}: {
  game: Game
  statePath: string
  heldIndex: number | null
  canRefresh: boolean
  canCancel: boolean
  onPick: (die: Die, slot: number) => void
  onCancel: () => void
  onRefresh: () => void
}) {
  const hand = game.hand
  const canPick = statePath === 'round.draft' || statePath === 'round.place'
  const pool = game.draftPool.dice
  const slots = game.config.draftSize
  const insertAt = hand === null ? -1 : Math.min(heldIndex ?? pool.length, pool.length)

  const cells: (
    | { kind: 'pool'; die: Die; index: number; key: string }
    | { kind: 'held'; die: Die }
    | null
  )[] = []
  // Identity keys (color, value, occurrence) keep dice mounted while neighbours
  // are lifted, so the deal-in animation only plays for genuinely new dice.
  const seen = new Map<string, number>()
  pool.forEach((die, index) => {
    if (index === insertAt && hand !== null) cells.push({ kind: 'held', die: hand })
    const id = dieLabel(die)
    const n = seen.get(id) ?? 0
    seen.set(id, n + 1)
    cells.push({ kind: 'pool', die, index, key: `${id}-${n}-r${game.round}-f${game.refreshesRemaining}` })
  })
  if (hand !== null && insertAt === pool.length) cells.push({ kind: 'held', die: hand })
  while (cells.length < slots) cells.push(null)

  return (
    <section
      className={`tray ${statePath === 'round.illuminate' ? 'tray--idle' : ''}`}
      data-testid="draft-pool"
      aria-label="Your dice"
    >
      <div className="tray__dice" data-testid="draft-dice">
        {cells.map((cell, i) =>
          cell === null ? (
            <span key={`empty-${i}`} className="tray__slot tray__slot--empty" aria-hidden />
          ) : cell.kind === 'held' ? (
            <button
              key="held"
              type="button"
              className="tray__slot tray__slot--held"
              data-testid="held-die"
              aria-label={`${dieLabel(cell.die)} selected, tap to put back`}
              aria-pressed="true"
              disabled={!canCancel}
              onClick={onCancel}
            >
              <DieFace die={cell.die} fluid />
            </button>
          ) : (
            <button
              key={cell.key}
              type="button"
              disabled={!canPick}
              aria-label={`select ${dieLabel(cell.die)}`}
              data-testid={`draft-die-${cell.index}`}
              onClick={() => onPick(cell.die, cell.index)}
              className="tray__slot"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <DieFace die={cell.die} fluid />
            </button>
          ),
        )}
      </div>
      <button
        type="button"
        className="tray__refresh"
        data-testid="refresh-dice"
        aria-label={`Reroll dice, ${game.refreshesRemaining} left`}
        disabled={!canRefresh}
        onClick={onRefresh}
      >
        <Icon name="refresh" size={22} />
        <span className="tray__badge">{game.refreshesRemaining}</span>
      </button>
    </section>
  )
}
