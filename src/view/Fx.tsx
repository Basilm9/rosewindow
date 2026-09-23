import type { CSSProperties } from 'react'

/** Deterministic 0–1 hash so cosmetic particles never touch an RNG. */
function hash(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

const SHARD_COLORS = ['var(--ruby)', 'var(--amber)', 'var(--cobalt)', 'var(--emerald)', 'var(--amethyst)', 'var(--gold)']

/** A burst of falling glass shards. Re-key to replay. */
export function Shards({ count = 36, seed = 1 }: { count?: number; seed?: number }) {
  return (
    <div className="shards" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const r = (k: number) => hash(seed * 97 + i * 13 + k)
        return (
          <span
            key={i}
            className="shard"
            style={
              {
                '--x': `${r(1) * 100}%`,
                '--drift': `${(r(2) - 0.5) * 160}px`,
                '--spin': `${(r(3) - 0.5) * 900}deg`,
                '--delay': `${r(4) * 450}ms`,
                '--dur': `${1500 + r(5) * 1300}ms`,
                '--w': `${7 + r(6) * 9}px`,
                '--h': `${10 + r(7) * 14}px`,
                background: SHARD_COLORS[i % SHARD_COLORS.length],
              } as CSSProperties
            }
          />
        )
      })}
    </div>
  )
}

const PRAISE: [number, string][] = [
  [50, 'Divine!'],
  [35, 'Radiant!'],
  [20, 'Brilliant!'],
  [10, 'Bright!'],
  [1, 'Nice'],
  [0, 'Missed the glass'],
]

/** "+34 Brilliant!" slammed over the board when a round's beam finishes. */
export function RoundBurst({ delta, big }: { delta: number; big: boolean }) {
  const word = PRAISE.find(([min]) => delta >= min)?.[1] ?? ''
  return (
    <div className={`burst ${big ? 'burst--big' : ''} ${delta === 0 ? 'burst--zero' : ''}`} aria-hidden>
      <span className="burst__word">{word}</span>
      <span className="burst__num">+{delta}</span>
    </div>
  )
}

const ARROW: Record<string, string> = {
  south: 'from the top',
  north: 'from the bottom',
  east: 'from the left',
  west: 'from the right',
}

/** Ribbon announcing each round and where the light will come from. */
export function RoundBanner({ round, rounds, direction }: { round: number; rounds: number; direction: string }) {
  return (
    <div className="ribbon" aria-hidden>
      <span className="ribbon__label">{round === rounds ? 'Final round' : `Round ${round}`}</span>
      <span className="ribbon__sub">Light enters {ARROW[direction]}</span>
    </div>
  )
}
