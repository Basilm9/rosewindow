import type { Game } from '../engine/game'

export function Objectives({ game }: { game: Game }) {
  const { publics, privateObjective } = game.objectives
  return (
    <section
      aria-label="Objectives"
      data-testid="objectives"
      className="rounded-xl bg-neutral-900/80 p-4 ring-1 ring-neutral-800"
    >
      <h2 className="text-xs uppercase tracking-widest text-neutral-400">Objectives</h2>
      <ul className="mt-3 space-y-2">
        {publics.map((objective) => (
          <li
            key={objective.id}
            data-testid={`objective-${objective.id}`}
            className="rounded-lg bg-neutral-950/60 p-2 ring-1 ring-neutral-800"
          >
            <p className="text-sm font-semibold text-amber-100">{objective.name}</p>
            <p className="text-xs text-neutral-400">{objective.description}</p>
          </li>
        ))}
        <li
          data-testid={`objective-${privateObjective.id}`}
          className="rounded-lg bg-neutral-950/60 p-2 ring-1 ring-amber-900/60"
        >
          <p className="text-sm font-semibold text-amber-100">
            {privateObjective.name}{' '}
            <span className="ml-1 rounded bg-amber-900/50 px-1 text-[10px] uppercase tracking-wide text-amber-200">
              private
            </span>
          </p>
          <p className="text-xs text-neutral-400">{privateObjective.description}</p>
        </li>
      </ul>
    </section>
  )
}
