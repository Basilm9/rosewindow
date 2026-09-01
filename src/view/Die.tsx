import type { Die } from '../engine/types'
import { DIE_SIZES, DIE_STYLES, dieLabel } from './palette'
import type { DieSize } from './palette'

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
  /** Lit dice sit at full saturation with a faint glow; unlit glass is desaturated. */
  lit?: boolean
  /** Fluid mode fills its container (board cells scale with the viewport). */
  fluid?: boolean
  testId?: string
  className?: string
}) {
  const style = DIE_STYLES[die.color]
  const sizing = fluid ? 'h-full w-full' : DIE_SIZES[size ?? 'md']
  const litStyle = lit
    ? 'saturate-100 shadow-[inset_0_0_10px_rgba(255,255,255,0.3),0_0_14px_rgba(251,191,36,0.25)]'
    : 'saturate-[.55] opacity-90'
  return (
    <div
      data-testid={testId}
      aria-label={dieLabel(die)}
      title={`${die.color} ${die.value}`}
      className={`relative flex ${sizing} select-none items-center justify-center rounded-[14%] border border-white/10 ${style.fill} ${litStyle} font-bold ${style.text} transition-[filter,box-shadow] duration-500 ${className}`}
    >
      <span
        className="font-serif leading-none"
        style={{ fontSize: fluid ? 'min(7cqw, 2.2rem)' : undefined }}
      >
        {die.value}
      </span>
      <span className="pointer-events-none absolute left-[14%] top-[10%] h-[18%] w-[30%] rounded-full bg-white/25 blur-[2px]" />
    </div>
  )
}
