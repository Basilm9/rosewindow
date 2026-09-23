import { useId } from 'react'

/** Original vector tracery; stays sharp at every phone size and needs no remote assets. */
export function RoseArt({ className = '', variant = 0 }: { className?: string; variant?: number }) {
  const id = useId().replace(/:/g, '')
  const colors = [
    ['#e9b976', '#78c2cb', '#c9a5df', '#91c6a6', '#91afee', '#e7a8ab'],
    ['#8dcab3', '#75b4c7', '#b1d8c4', '#8c96d7', '#5fafa8', '#a8cfc1'],
    ['#dba8c9', '#8c8be2', '#af9adc', '#b3c6ea', '#bc89cb', '#e2bbc9'],
  ][variant % 3]!
  return (
    <svg viewBox="0 0 600 600" className={`rose-art ${className}`} fill="none" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-halo`}>
          <stop stopColor={colors[2]} stopOpacity=".19" />
          <stop offset="1" stopColor={colors[2]} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-metal`} x2=".8" y2="1">
          <stop stopColor="#dfd0b0" />
          <stop offset=".5" stopColor="#57697b" />
          <stop offset="1" stopColor="#b7a382" />
        </linearGradient>
        {colors.map((color, i) => (
          <linearGradient key={color} id={`${id}-glass-${i}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor={color} />
            <stop offset=".5" stopColor={color} stopOpacity=".58" />
            <stop offset="1" stopColor={color} stopOpacity=".95" />
          </linearGradient>
        ))}
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <circle cx="300" cy="300" r="299" fill={`url(#${id}-halo)`} />
      <g className="rose-tracery">
        <circle
          cx="300"
          cy="300"
          r="242"
          fill="#152132"
          stroke={`url(#${id}-metal)`}
          strokeWidth="3"
        />
        <circle cx="300" cy="300" r="233" stroke="#77828f" strokeOpacity=".55" />
        {Array.from({ length: 12 }, (_, i) => (
          <g key={i} transform={`rotate(${i * 30} 300 300)`}>
            <path
              d="M300 72 344 91 331 122 300 142 269 122 256 91Z"
              fill={`url(#${id}-glass-${i % 6})`}
              stroke="#1b2737"
              strokeWidth="5"
            />
            <path d="m300 74 0 68m-42-50 42 50 43-50" stroke="#dce1e3" strokeOpacity=".26" />
            <path
              d="M300 154C265 115 234 160 266 196L300 261 334 196C366 160 335 115 300 154Z"
              fill={`url(#${id}-glass-${(i + 2) % 6})`}
              stroke="#152233"
              strokeWidth="7"
            />
            <path
              d="M300 158v101m-24-91 24 52 24-52m-47 28 23 24 23-24"
              stroke="#e4eef7"
              strokeOpacity=".22"
              strokeWidth="1.5"
            />
            <path
              d="M300 149c-31-32-49-2-35 29"
              stroke="#faf3d9"
              strokeOpacity=".5"
              strokeWidth="1.2"
            />
            <path d="M300 70 290 90l10 20 10-20Z" fill="#e8edee" fillOpacity=".17" />
            <circle cx="242" cy="104" r="4" fill="#d4b991" />
          </g>
        ))}
        <circle
          cx="300"
          cy="300"
          r="59"
          fill="#1b2b3e"
          stroke={`url(#${id}-metal)`}
          strokeWidth="4"
        />
        {Array.from({ length: 8 }, (_, i) => (
          <path
            key={i}
            transform={`rotate(${i * 45} 300 300)`}
            d="M300 246Q327 268 300 291Q273 268 300 246Z"
            fill={`url(#${id}-glass-${i % 6})`}
            stroke="#263044"
            strokeWidth="2"
          />
        ))}
        <path d="m300 274 26 26-26 26-26-26Z" fill="#eacb8e" stroke="#fae7bb" strokeWidth="1.5" />
        <path d="m300 279 0 41m-21-20h42" stroke="#fff5d0" strokeOpacity=".5" />
        <circle
          cx="300"
          cy="300"
          r="245"
          stroke="#e3cc9f"
          strokeOpacity=".14"
          strokeWidth="8"
          filter={`url(#${id}-glow)`}
        />
      </g>
      <g stroke="#e3d0af" strokeWidth="1" opacity=".7">
        <path d="M300 34v17m-8-8h16M300 549v17m-8-8h16M34 300h17m-8-8v16M549 300h17m-8-8v16" />
        <path d="m114 112 8 8m356 358 8 8M114 486l8-8m356-356 8-8" />
      </g>
    </svg>
  )
}
