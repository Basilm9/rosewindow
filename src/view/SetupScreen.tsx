import type { Game } from '../engine/game'
import type { CellConstraint } from '../engine/types'
import { DIE_STYLES } from './palette'

function MiniCell({ constraint }: { constraint: CellConstraint }) {
  if (constraint.kind === 'color') {
    const style = DIE_STYLES[constraint.color]
    return (
      <span
        className={`h-full w-full rounded-full ${style.fill} ${style.ring} ring-1`}
        title={`demands ${constraint.color}`}
      />
    )
  }
  if (constraint.kind === 'value') {
    return (
      <span
        className="flex h-full w-full items-center justify-center rounded-md bg-neutral-700 text-[9px] font-semibold text-neutral-200"
        title={`demands value ${constraint.value}`}
      >
        {constraint.value}
      </span>
    )
  }
  return <span className="h-full w-full rounded-md bg-neutral-800 ring-1 ring-neutral-900" />
}

function SetupScreen({ game, onChoose }: { game: Game; onChoose: (id: string) => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[radial-gradient(ellipse_at_top,#2b2836_0%,#161519_70%)] p-5 sm:p-8">
      <header className="text-center">
        <h1 className="bg-gradient-to-b from-amber-100 to-amber-300 bg-clip-text font-serif text-4xl tracking-wide text-transparent sm:text-5xl">
          Rose Window
        </h1>
        <p className="mt-3 text-sm text-neutral-400">Choose your window pattern</p>
      </header>
      <div
        className="grid w-full max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2"
        data-testid="patterns-offered"
      >
        {game.offeredPatterns.map((pattern) => (
          <button
            key={pattern.id}
            type="button"
            data-testid={`pattern-${pattern.id}`}
            aria-label={`choose pattern ${pattern.name}`}
            onClick={() => onChoose(pattern.id)}
            className="group rounded-3xl bg-neutral-900/80 p-6 text-left ring-1 ring-neutral-800 backdrop-blur-sm transition duration-200 hover:-translate-y-1 hover:ring-amber-500/70"
          >
            <p className="font-serif text-2xl text-amber-100">{pattern.name}</p>
            <p className="mt-1 min-h-10 text-sm leading-relaxed text-neutral-400">
              {pattern.description}
            </p>
            <div
              className="mx-auto mt-5 grid aspect-square w-44 grid-cols-4 grid-rows-4 gap-[6%] rounded-xl bg-neutral-950 p-[6%] ring-1 ring-neutral-800 transition group-hover:ring-neutral-700"
              aria-label={`${pattern.name} constraint layout`}
            >
              {pattern.constraints.flatMap((row, r) =>
                row.map((constraint, c) => (
                  <span key={`${r}-${c}`} className="flex items-center justify-center">
                    <MiniCell constraint={constraint} />
                  </span>
                )),
              )}
            </div>
          </button>
        ))}
      </div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-600">
        seed {game.config.seed}
      </p>
    </main>
  )
}

export default SetupScreen
