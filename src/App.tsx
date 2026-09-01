const ROWS = 4
const COLS = 4

export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8">
      <header className="text-center">
        <h1 className="font-serif text-4xl tracking-wide text-amber-100">Rose Window</h1>
        <p className="mt-2 text-sm text-neutral-400">Scaffold placeholder — phase 0</p>
      </header>
      <div
        role="grid"
        aria-label="Glass window"
        data-testid="glass-board"
        className="grid grid-cols-4 gap-1.5 rounded-2xl bg-neutral-950 p-3 ring-4 ring-neutral-800"
      >
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const r = Math.floor(i / COLS)
          const c = i % COLS
          return (
            <div
              key={i}
              role="gridcell"
              aria-label={`row ${r}, column ${c}, empty`}
              data-testid={`cell-r${r}c${c}`}
              className="h-20 w-20 rounded-lg bg-neutral-800/60 ring-2 ring-neutral-950"
            />
          )
        })}
      </div>
    </main>
  )
}
