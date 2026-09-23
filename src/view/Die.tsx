import { REFRACTION_BY_COLOR } from '../engine/types'
import type { Die } from '../engine/types'
import { DIE_SIZES, dieLabel, REFRACTION_SYMBOLS } from './palette'
import type { DieSize } from './palette'
import './gameplay.css'

export function DieFace({
  die,
  size,
  lit = true,
  fluid = false,
  testId,
  className = '',
}: {
  die: Die
  /** Fixed size for pool/hand chips; ignored when `fluid`. */
  size?: DieSize
  /** Illuminated panes hold their full color and a soft edge glow. */
  lit?: boolean
  /** Fluid mode fills its container. */
  fluid?: boolean
  testId?: string
  className?: string
}) {
  const refraction = REFRACTION_BY_COLOR[die.color]
  return (
    <div
      data-testid={testId}
      aria-label={dieLabel(die)}
      title={`${dieLabel(die)} · ${refraction === 'straight' ? 'light travels straight' : refraction === 'clockwise' ? 'turns light clockwise' : 'turns light counterclockwise'}`}
      className={`glass-die glass-${die.color} ${fluid ? 'glass-die--fluid' : DIE_SIZES[size ?? 'md']} ${lit ? 'glass-die--lit saturate-100' : 'glass-die--unlit'} ${className}`}
    >
      <span className="glass-die__facet glass-die__facet--top" aria-hidden />
      <span className="glass-die__facet glass-die__facet--bottom" aria-hidden />
      <span className="glass-die__value" aria-hidden>
        {die.value}
      </span>
      <span className="glass-die__refraction" aria-hidden>
        {REFRACTION_SYMBOLS[refraction]}
      </span>
    </div>
  )
}
