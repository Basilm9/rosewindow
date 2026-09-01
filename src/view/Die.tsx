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
    ? 'saturate-100 shadow-[inset_0_0_12px_rgba(255,255,255,0.3),0_0_16px_rgba(251,191,36,0.3)]'
    : 'saturate-[.55] opacity-90'
  return (
    <div
      data-testid={testId}
      aria-label={dieLabel(die)}
      title={`${die.color} ${die.value}`}
      className={`relative flex ${sizing} select-none items-center justify-center overflow-hidden rounded-[14%] border border-white/10 ${style.fill} ${litStyle} transition-[filter,box-shadow] duration-500 ${className}`}
    >
      {/* value: embossed INTO the glass, not printed on top */}
      <span
        aria-hidden={false}
        className="relative font-serif leading-none text-white/80 mix-blend-overlay [text-shadow:0_1px_2px_rgba(0,0,0,0.55),0_-1px_1px_rgba(255,255,255,0.25)]"
        style={{ fontSize: fluid ? 'min(7cqw, 2.2rem)' : undefined }}
      >
        {die.value}
      </span>
      {/* glass treatments live above the value so the numeral sits inside the pane */}
      <span className="pointer-events-none absolute left-[14%] top-[9%] h-[20%] w-[34%] rounded-full bg-white/30 blur-[2px]" />
      <span className="pointer-events-none absolute inset-0 rounded-[14%] bg-[conic-gradient(from_215deg,transparent_0deg,rgba(255,255,255,0.24)_55deg,transparent_115deg,transparent_240deg,rgba(255,255,255,0.1)_290deg,transparent_330deg)] mix-blend-screen" />
      <span className="pointer-events-none absolute inset-0 rounded-[14%] shadow-[inset_0_2px_6px_rgba(255,255,255,0.18),inset_0_-3px_8px_rgba(0,0,0,0.35)]" />
    </div>
  )
}
