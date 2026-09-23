import type { CSSProperties } from 'react'

export type IconName =
  | 'spark'
  | 'pause'
  | 'share'
  | 'calendar'
  | 'gem'
  | 'sun'
  | 'close'
  | 'check'
  | 'refresh'
  | 'help'
  | 'volume'
  | 'mute'
  | 'trophy'
  | 'play'
const paths: Record<IconName, React.ReactNode> = {
  spark: (
    <>
      <path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6Z" />
    </>
  ),
  gem: (
    <>
      <path d="m7 3-5 7 10 12 10-12-5-7Zm-5 7h20M7 3l5 19 5-19" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
    </>
  ),
  pause: <path d="M8 5v14m8-14v14" />,
  share: <path d="M12 3v12m-5-7 5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4m8-4v4M3 10h18" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  check: <path d="m4 12 5 5L20 6" />,
  refresh: (
    <>
      <path d="M20 9a8 8 0 0 0-14-4L3 8m0-5v5h5M4 15a8 8 0 0 0 14 4l3-3m0 5v-5h-5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3m0 3h.01" />
    </>
  ),
  volume: (
    <>
      <path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
    </>
  ),
  mute: (
    <>
      <path d="m11 4-6 5H2v6h3l6 5Zm5 5 6 6m0-6-6 6" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 3h10v6a5 5 0 0 1-10 0ZM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 2v6m-5 1h10" />
    </>
  ),
  play: <path d="m7 3 15 9-15 9Z" />,
}
export function Icon({
  name,
  size = 20,
  className = '',
  style,
  strokeWidth = 2.6,
}: {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {paths[name]}
    </svg>
  )
}
