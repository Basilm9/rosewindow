import type { Die } from '../engine/types'
import { DIE_SIZES, DIE_STYLES, dieLabel } from './palette'
import type { DieSize } from './palette'

export function DieFace({
  die,
  size = 'md',
  testId,
}: {
  die: Die
  size?: DieSize
  testId?: string
}) {
  const style = DIE_STYLES[die.color]
  return (
    <div
      data-testid={testId}
      aria-label={dieLabel(die)}
      title={`${die.color} ${die.value}`}
      className={`flex ${DIE_SIZES[size]} select-none items-center justify-center rounded-md border border-white/10 ${style.fill} font-bold ${style.text} shadow-[inset_0_0_10px_rgba(255,255,255,0.25)]`}
    >
      {die.value}
    </div>
  )
}
