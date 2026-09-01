import { useEffect, useRef, useState } from 'react'
import { createActor } from 'xstate'
import type { Actor } from 'xstate'
import { beamMachine } from '../machine/beamMachine'
import type { BeamPath, BeamSegment } from '../engine/beamTracer'
import { sfx } from '../dev/sfx'

/**
 * The beam animation (pitch §13): an SVG overlay in the board's coordinate space
 * (viewBox 0 0 100 100), paced step-by-step by the `beamMachine` actor. Each
 * `ADVANCE` extends the glowing polyline one cell, flares struck dice, and
 * floats the points they scored. When the trace terminates the layer settles to
 * a dim persistent glow and reports done so the machine can leave `illuminate`.
 */

const STEP_MS = 300
const TAIL_MS = 380

/** Cell center in board units: 3% inset, 2% gaps, 22-unit cells. */
function cellCenter(position: { row: number; col: number }): { x: number; y: number } {
  return { x: 14 + position.col * 24, y: 14 + position.row * 24 }
}

interface FloatScore {
  readonly id: number
  readonly x: number
  readonly y: number
  readonly points: number
  readonly multiplier: number
}

export function BeamLayer({
  path,
  onDone,
  onStrike,
}: {
  path: BeamPath
  onDone: () => void
  /** Fires once per consumed segment; the parent lights struck dice and plays SFX. */
  onStrike?: (segment: BeamSegment, index: number, multiplier: number) => void
}) {
  const [index, setIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [floats, setFloats] = useState<FloatScore[]>([])
  const floatId = useRef(0)

  useEffect(() => {
    const actor: Actor<typeof beamMachine> = createActor(beamMachine, {
      input: { path },
    }).start()

    const timer = setInterval(() => {
      const snap = actor.getSnapshot()
      if (snap.status === 'done') {
        clearInterval(timer)
        setFinished(true)
        setTimeout(onDone, TAIL_MS)
        return
      }
      const before = snap.context.index
      actor.send({ type: 'ADVANCE' })
      const after = actor.getSnapshot()
      setIndex(after.context.index)
      if (after.context.index > before) {
        const segment = path.segments[before]!
        if (segment.die !== null) {
          const scoringMultiplier =
            segment.die.value > 0 ? Math.round(segment.points / segment.die.value) : 1
          floatId.current += 1
          const center = cellCenter(segment.position)
          setFloats((f) => [
            ...f,
            {
              id: floatId.current,
              x: center.x,
              y: center.y,
              points: segment.points,
              multiplier: scoringMultiplier,
            },
          ])
          onStrike?.(segment, before, scoringMultiplier)
          sfx.strike(scoringMultiplier)
        }
      }
    }, STEP_MS)

    return () => {
      clearInterval(timer)
      actor.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  const consumed = path.segments.slice(0, Math.max(index, 1))
  const points = consumed
    .slice(0, index)
    .map((s) => cellCenter(s.position))
    .map((c) => `${c.x},${c.y}`)
    .join(' ')
  const head = index > 0 ? cellCenter(path.segments[Math.min(index, path.segments.length) - 1]!.position) : null

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      data-testid="beam-layer"
      aria-label={`beam path scoring ${path.totalScore} points, ${path.termination === 'cycle' ? 'looped back on itself' : 'exited the window'}`}
      className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-700 ${
        finished ? 'opacity-40' : 'opacity-100'
      }`}
    >
      <defs>
        <filter id="beam-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="beam-head">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      {points !== '' && (
        <g filter="url(#beam-glow)" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <polyline
            points={points}
            stroke="#f59e0b"
            strokeWidth={2.6}
            opacity={0.55}
            data-testid="beam-halo"
          />
          <polyline points={points} stroke="#fef3c7" strokeWidth={1.1} data-testid="beam-core" />
        </g>
      )}

      {head !== null && !finished && (
        <g>
          <circle cx={head.x} cy={head.y} r={5} fill="url(#beam-head)" opacity={0.9} />
          <circle cx={head.x} cy={head.y} r={1.6} fill="#fffbeb" />
        </g>
      )}

      {floats.map((f) => (
        <g key={f.id} className="animate-score-rise" data-testid={`score-float-${f.id}`}>
          <text
            x={f.x}
            y={f.y - 7}
            textAnchor="middle"
            fontSize={5}
            fontWeight="bold"
            fill="#fde68a"
            stroke="#78350f"
            strokeWidth={0.4}
            paintOrder="stroke"
          >
            +{f.points}
          </text>
          {f.multiplier > 1 && (
            <text
              x={f.x}
              y={f.y - 2.4}
              textAnchor="middle"
              fontSize={3.4}
              fontWeight="bold"
              fill="#fbbf24"
              stroke="#78350f"
              strokeWidth={0.35}
              paintOrder="stroke"
            >
              ×{f.multiplier}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
