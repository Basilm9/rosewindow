import { useEffect, useRef, useState } from 'react'
import { createActor } from 'xstate'
import type { Actor } from 'xstate'
import { beamMachine } from '../machine/beamMachine'
import type { BeamPath, BeamSegment } from '../engine/beamTracer'
import { sfx } from '../dev/sfx'
import { MULTIPLIER_HEAT } from './palette'

/**
 * The beam animation (pitch §13): an SVG overlay in the board's coordinate space
 * (viewBox 0 0 100 100), paced step-by-step by the `beamMachine` actor. Each
 * `ADVANCE` extends the glowing polyline one cell, flares struck dice, and
 * floats the points they scored. When the trace terminates the layer settles to
 * a breathing glow with flowing energy and reports done so the machine can
 * leave `illuminate`.
 */

export const STEP_MS = 400

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
  /** The beam turned inside this die (drawn as a spinning ring). */
  readonly bent: boolean
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
  const strikes = useRef(0)

  useEffect(() => {
    const actor: Actor<typeof beamMachine> = createActor(beamMachine, {
      input: { path },
    }).start()

    let tailTimer: ReturnType<typeof setTimeout> | undefined
    const timer = setInterval(() => {
      const snap = actor.getSnapshot()
      if (snap.status === 'done') {
        clearInterval(timer)
        setFinished(true)
        tailTimer = setTimeout(onDone, TAIL_MS)
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
          // Presentation only: the tracer already decided the path; a direction
          // change on the next segment means this die turned the light.
          const nextSegment = path.segments[before + 1]
          const bent = nextSegment !== undefined && nextSegment.direction !== segment.direction
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
              bent,
            },
          ])
          onStrike?.(segment, before, scoringMultiplier)
          sfx.strike(scoringMultiplier, strikes.current)
          if (bent) sfx.bend()
          strikes.current += 1
        }
      }
    }, STEP_MS)

    return () => {
      clearInterval(timer)
      clearTimeout(tailTimer)
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
  const head =
    index > 0
      ? cellCenter(path.segments[Math.min(index, path.segments.length) - 1]!.position)
      : null

  const frame =
    'pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-1000'

  /**
   * Twin layers: the light itself is screen-blended over the glass (so it tints
   * and brightens the panes it crosses), while the head, entry flash, and score
   * floats sit on top at full strength.
   */
  return (
    <>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        data-testid="beam-layer"
        data-settled={finished ? 'true' : undefined}
        aria-hidden
        className={`${frame} beam-light ${finished ? 'opacity-80' : 'opacity-100'}`}
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
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#fff4cc" />
            <stop offset="100%" stopColor="#ffc94a" stopOpacity="0" />
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
                  r={s.die !== null ? 10 : 5}
                  fill={s.die !== null ? 'url(#beam-head)' : '#ffc94a'}
                  opacity={s.die !== null ? 0.9 : 0.35}
                  data-testid={`bead-${i}`}
                />
              )
            })}
            <g className={finished ? 'beam-settled-halo' : undefined}>
              <polyline points={points} stroke="#ff9d2e" strokeWidth={12} opacity={0.22} />
              <polyline points={points} stroke="#ffc94a" strokeWidth={5} opacity={0.9} />
              <polyline
                points={points}
                stroke="#fffaf0"
                strokeWidth={1.8}
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
          <g key={index} className="beam-head">
            <circle cx={head.x} cy={head.y} r={11} fill="url(#beam-head)" opacity={0.95} />
            <circle cx={head.x} cy={head.y} r={2.6} fill="#ffffff" />
          </g>
        )}

        {!finished && (
          <circle
            cx={entry.x}
            cy={entry.y}
            r={8}
            fill="none"
            stroke="#ffc94a"
            strokeWidth={1.6}
            className="animate-entry-flash"
          />
        )}

        {floats
          .filter((f) => f.bent)
          .map((f) => (
            <circle
              key={`bend-${f.id}`}
              cx={f.x}
              cy={f.y}
              r={9}
              fill="none"
              stroke="#fff4cc"
              strokeWidth={1.4}
              strokeDasharray="5 3"
              className="beam-bend-ring"
            />
          ))}
        {floats.map((f) => (
          <g key={f.id} className="animate-score-rise" data-testid={`score-float-${f.id}`}>
            <text
              x={f.x}
              y={f.y - 5}
              textAnchor="middle"
              className="beam-float"
              fontSize={f.points >= 12 ? 9 : 7.5}
              fill="#fff4cc"
              stroke="#0a0612"
              strokeWidth={1.5}
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              +{f.points}
            </text>
            {f.multiplier > 1 && (
              <text
                x={f.x}
                y={f.y + 2.4}
                textAnchor="middle"
                className="beam-float"
                fontSize={4.6}
                fill={MULTIPLIER_HEAT[Math.min(f.multiplier, 5)]}
                stroke="#0a0612"
                strokeWidth={1.1}
                strokeLinejoin="round"
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
