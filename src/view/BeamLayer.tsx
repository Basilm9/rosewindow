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
 * a breathing glow with flowing energy and reports done so the machine can
 * leave `illuminate`.
 */

export const STEP_MS = 430
const TAIL_MS = 450

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

  const entry = cellCenter(path.segments[0]!.position)
  const consumed = path.segments.slice(0, Math.max(index, 1))
  const walked = consumed.slice(0, index)
  const points = walked
    .map((s) => cellCenter(s.position))
    .map((c) => `${c.x},${c.y}`)
    .join(' ')
  const head = index > 0 ? cellCenter(path.segments[Math.min(index, path.segments.length) - 1]!.position) : null

  const frame =
    'pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-1000'

  /**
   * Twin layers so the beam runs BEHIND the translucent glass panes while the
   * head, entry flash, and score floats stay readable above them.
   */
  return (
    <>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        data-testid="beam-layer"
        data-settled={finished ? 'true' : undefined}
        aria-hidden
        className={`${frame} z-10 ${finished ? 'opacity-80' : 'opacity-100'}`}
      >
        <defs>
          <filter id="beam-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
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
            {walked.map((s, i) => {
              const c = cellCenter(s.position)
              return (
                <circle
                  key={`bead-${i}`}
                  cx={c.x}
                  cy={c.y}
                  r={s.die !== null ? 8.5 : 6}
                  fill={s.die !== null ? 'url(#beam-head)' : '#f59e0b'}
                  opacity={s.die !== null ? 0.85 : 0.4}
                  data-testid={`bead-${i}`}
                />
              )
            })}
            <g className={finished ? 'beam-settled-halo' : undefined}>
              <polyline points={points} stroke="#d97706" strokeWidth={11} opacity={0.3} />
              <polyline points={points} stroke="#f59e0b" strokeWidth={6.5} opacity={0.85} />
              <polyline
                points={points}
                stroke="#fffbeb"
                strokeWidth={2.6}
                data-testid="beam-core"
                className="beam-flow"
              />
            </g>
          </g>
        )}
      </svg>

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-label={`beam path scoring ${path.totalScore} points, ${path.termination === 'cycle' ? 'looped back on itself' : 'exited the window'}`}
        className={`${frame} z-30`}
      >
        {head !== null && !finished && (
          <g>
            <circle cx={head.x} cy={head.y} r={8.5} fill="url(#beam-head)" opacity={0.95} />
            <circle cx={head.x} cy={head.y} r={2.4} fill="#fffbeb" />
          </g>
        )}

        {!finished && (
          <circle
            cx={entry.x}
            cy={entry.y}
            r={7}
            fill="none"
            stroke="#fde68a"
            strokeWidth={1.2}
            className="animate-entry-flash"
          />
        )}

        {floats.map((f) => (
          <g key={f.id} className="animate-score-rise" data-testid={`score-float-${f.id}`}>
            <text
              x={f.x}
              y={f.y - 7}
              textAnchor="middle"
              fontSize={5.4}
              fontWeight="bold"
              fill="#fde68a"
              stroke="#451a03"
              strokeWidth={0.5}
              paintOrder="stroke"
            >
              +{f.points}
            </text>
            {f.multiplier > 1 && (
              <text
                x={f.x}
                y={f.y - 2.2}
                textAnchor="middle"
                fontSize={3.6}
                fontWeight="bold"
                fill="#fbbf24"
                stroke="#451a03"
                strokeWidth={0.4}
                paintOrder="stroke"
              >
                ×{f.multiplier}
              </text>
            )}
          </g>
        ))}
      </svg>
    </>
  )
}
