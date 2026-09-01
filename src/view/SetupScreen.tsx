import type { Game } from '../engine/game'
import type { CellConstraint } from '../engine/types'
import { DIE_STYLES } from './palette'

function MiniCell({ constraint }: { constraint: CellConstraint }) {
  if (constraint.kind === 'color') {
    const style = DIE_STYLES[constraint.color]
    return <span className={`h-2.5 w-2.5 rounded-full ${style.fill} ${style.ring} ring-1`} />
  }
  if (constraint.kind === 'value') {
    return (
      <span className="flex h-2.5 w-2.5 items-center justify-center rounded-sm bg-neutral-700 text-[7px] text-neutral-200">
        {constraint.value}
      </span>
    )
  }
  return <span className="h-2.5 w-2.5 rounded-sm bg-neutral-800 ring-1 ring-neutral-900" />
}

function SetupScreen({ game, onChoose }: { game: Game; onChoose: (id: string) => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <header className="text-center">
        <h1 className="font-serif text-4xl tracking-wide text-amber-100">Rose Window</h1>
        <p className="mt-2 text-sm text-neutral-400">Choose your window pattern</p>
      </header>
      <div className="flex gap-6" data-testid="patterns-offered">
        {game.offeredPatterns.map((pattern) => (
          <button
            key={pattern.id}
            type="button"
            data-testid={`pattern-${pattern.id}`}
            aria-label={`choose pattern ${pattern.name}`}
            onClick={() => onChoose(pattern.id)}
            className="w-64 rounded-2xl bg-neutral-900/80 p-5 text-left ring-1 ring-neutral-800 transition hover:ring-amber-500/70"
          >
            <p className="font-serif text-xl text-amber-100">{pattern.name}</p>
            <p className="mt-1 min-h-10 text-xs text-neutral-400">{pattern.description}</p>
            <div
              className="mt-4 grid grid-cols-4 gap-1 rounded-lg bg-neutral-950 p-2"
              aria-label={`${pattern.name} constraint layout`}
            >
              {pattern.constraints.flatMap((row, r) =>
                row.map((constraint, c) => (
                  <span key={`${r}-${c}`} className="flex h-6 w-6 items-center justify-center">
                    <MiniCell constraint={constraint} />
                  </span>
                )),
              )}
            </div>
          </button>
        ))}
      </div>
      <p className="text-[10px] uppercase tracking-wide text-neutral-600">seed {game.config.seed}</p>
    </main>
  )
}

export default SetupScreen
