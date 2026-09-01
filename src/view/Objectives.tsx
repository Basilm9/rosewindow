import type { Game } from '../engine/game'

export function Objectives({ game }: { game: Game }) {
  const { publics, privateObjective } = game.objectives
  return (
    <section
      aria-label="Objectives"
      data-testid="objectives"
      className="rounded-2xl bg-neutral-900/80 p-4 ring-1 ring-neutral-800 backdrop-blur-sm sm:p-5"
    >
      <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-400">Objectives</h2>
      <ul className="mt-3 space-y-2">
        {publics.map((objective) => (
          <li
            key={objective.id}
            data-testid={`objective-${objective.id}`}
            className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800 transition hover:ring-neutral-700"
          >
            <p className="text-sm font-semibold text-amber-100">{objective.name}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-neutral-400">
              {objective.description}
            </p>
          </li>
        ))}
        <li
          data-testid={`objective-${privateObjective.id}`}
          className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-amber-900/60"
        >
          <p className="text-sm font-semibold text-amber-100">
            {privateObjective.name}{' '}
            <span className="ml-1 rounded bg-amber-900/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-amber-200">
              private
            </span>
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-400">
            {privateObjective.description}
          </p>
        </li>
      </ul>
    </section>
  )
}
