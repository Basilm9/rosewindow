import type { Game } from '../engine/game'

/** Balatro-style compact stat rows: two-line, always readable. */
export function Objectives({ game }: { game: Game }) {
  const { publics, privateObjective } = game.objectives
  return (
    <div className="panel px-3 py-2.5" data-testid="objectives">
      <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
        Objectives
      </p>
      <ul className="flex flex-col gap-1.5">
        {publics.map((objective) => (
          <li
            key={objective.id}
            data-testid={`objective-${objective.id}`}
            title={objective.description}
            className="rounded-lg border border-black/50 bg-black/30 px-2.5 py-1.5"
          >
            <p className="flex items-center gap-2 text-xs font-bold text-neutral-200">
              <span className="h-1.5 w-1.5 shrink-0 rounded-sm bg-amber-400/80" aria-hidden />
              {objective.name}
            </p>
            <p className="mt-0.5 truncate pl-3.5 text-[10px] leading-tight text-neutral-500">
              {objective.description}
            </p>
          </li>
        ))}
        <li
          data-testid={`objective-${privateObjective.id}`}
          title={privateObjective.description}
          className="rounded-lg border border-amber-900/70 bg-amber-950/30 px-2.5 py-1.5"
        >
          <p className="flex items-center gap-2 text-xs font-bold text-amber-200">
            <span className="h-1.5 w-1.5 shrink-0 rounded-sm bg-amber-300" aria-hidden />
            {privateObjective.name}
            <span className="ml-auto rounded bg-amber-900/60 px-1 text-[8px] font-black uppercase tracking-[0.15em] text-amber-200/80">
              private
            </span>
          </p>
          <p className="mt-0.5 truncate pl-3.5 text-[10px] leading-tight text-amber-200/40">
            {privateObjective.description}
          </p>
        </li>
      </ul>
    </div>
  )
}
