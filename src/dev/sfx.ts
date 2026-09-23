/**
 * Synthesized sound effects and haptics. Pure WebAudio: no assets, initialized
 * on first user gesture. One mute switch silences both sound and vibration.
 */

let ctx: AudioContext | null = null
let muted = readMuted()
// Browsers refuse audio before a user gesture; stay silent (and warning-free) until one.
let unlocked = false
if (typeof window !== 'undefined') {
  const unlock = () => {
    unlocked = true
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}

function readMuted(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('rosewindow-muted') === '1'
  } catch {
    return false
  }
}

function audio(): AudioContext | null {
  if (muted || !unlocked) return null
  if (ctx === null) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctor === undefined) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(
  freq: number,
  duration: number,
  options: { type?: OscillatorType; gain?: number; delay?: number; slideTo?: number } = {},
): void {
  const ac = audio()
  if (ac === null) return
  const { type = 'sine', gain = 0.06, delay = 0, slideTo } = options
  const osc = ac.createOscillator()
  const amp = ac.createGain()
  const t0 = ac.currentTime + delay
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration)
  amp.gain.setValueAtTime(0, t0)
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.01)
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(amp).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.05)
}

/** Short filtered noise burst — the "shff" of glass sliding or a whoosh. */
function noise(duration: number, options: { gain?: number; from?: number; to?: number; delay?: number } = {}) {
  const ac = audio()
  if (ac === null) return
  const { gain = 0.05, from = 800, to = 3200, delay = 0 } = options
  const length = Math.max(1, Math.floor(ac.sampleRate * duration))
  const buffer = ac.createBuffer(1, length, ac.sampleRate)
  const data = buffer.getChannelData(0)
  // Deterministic LCG noise: no Math.random anywhere in the project.
  let seed = 22222
  for (let i = 0; i < length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    data[i] = (seed / 0x7fffffff) * 2 - 1
  }
  const src = ac.createBufferSource()
  src.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 1.2
  const t0 = ac.currentTime + delay
  filter.frequency.setValueAtTime(from, t0)
  filter.frequency.exponentialRampToValueAtTime(to, t0 + duration)
  const amp = ac.createGain()
  amp.gain.setValueAtTime(0, t0)
  amp.gain.linearRampToValueAtTime(gain, t0 + duration * 0.3)
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  src.connect(filter).connect(amp).connect(ac.destination)
  src.start(t0)
}

function buzz(pattern: number | number[]): void {
  if (muted || !unlocked) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* Vibration is optional. */
  }
}

/** A major pentatonic ladder: every strike climbs, so long beams sing upward. */
const LADDER = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28]
const semis = (base: number, n: number) => base * Math.pow(2, n / 12)

export const sfx = {
  get muted(): boolean {
    return muted
  },
  toggleMute(): boolean {
    muted = !muted
    try {
      localStorage.setItem('rosewindow-muted', muted ? '1' : '0')
    } catch {
      /* Mute still applies for this session. */
    }
    return muted
  },
  /** Any UI button. */
  tap(): void {
    tone(880, 0.04, { type: 'triangle', gain: 0.03 })
    buzz(6)
  },
  /** Lifting a die from the tray. */
  pickup(): void {
    tone(620, 0.07, { type: 'triangle' })
    tone(930, 0.08, { type: 'triangle', delay: 0.05, gain: 0.045 })
    buzz(8)
  },
  /** Putting a die back. */
  putBack(): void {
    tone(700, 0.06, { type: 'triangle', slideTo: 480, gain: 0.04 })
    buzz(6)
  },
  /** Setting glass into the window: a thunk plus a crystalline ring. */
  place(): void {
    tone(260, 0.12, { type: 'triangle', slideTo: 150, gain: 0.08 })
    tone(120, 0.14, { type: 'sine', gain: 0.07 })
    tone(1760, 0.25, { type: 'sine', gain: 0.018, delay: 0.03 })
    tone(2637, 0.2, { type: 'sine', gain: 0.012, delay: 0.05 })
    buzz(18)
  },
  /** Rejected placement. */
  reject(): void {
    tone(160, 0.16, { type: 'sawtooth', gain: 0.045, slideTo: 90 })
    tone(150, 0.12, { type: 'square', gain: 0.02, delay: 0.08, slideTo: 100 })
    buzz([30, 40, 30])
  },
  /** Recasting the dice. */
  shuffle(): void {
    noise(0.28, { gain: 0.06, from: 1200, to: 4200 })
    for (let i = 0; i < 4; i++) tone(500 + i * 140, 0.05, { type: 'triangle', gain: 0.025, delay: i * 0.05 })
    buzz([8, 30, 8])
  },
  /** The beam striking a die; the Nth strike climbs the ladder, multiplier adds shimmer. */
  strike(multiplier: number, index = 0): void {
    const base = semis(523.25, LADDER[Math.min(index, LADDER.length - 1)]!)
    tone(base, 0.14, { type: 'sine', gain: 0.055 })
    tone(base * 2, 0.1, { type: 'triangle', gain: 0.018, delay: 0.015 })
    if (multiplier >= 3) tone(base * 3, 0.16, { type: 'sine', gain: 0.012, delay: 0.03 })
    buzz(multiplier >= 3 ? 14 : 8)
  },
  /** The beam turning inside a die. */
  bend(): void {
    noise(0.18, { gain: 0.04, from: 600, to: 3000 })
    tone(440, 0.16, { type: 'sine', gain: 0.03, slideTo: 880 })
  },
  /** A new round: the light moves to a new edge. */
  roundStart(): void {
    tone(784, 0.3, { type: 'sine', gain: 0.03 })
    tone(1175, 0.35, { type: 'sine', gain: 0.022, delay: 0.08 })
  },
  /** Round scored: the bigger the round, the brighter the chord. */
  roundScored(delta: number): void {
    if (delta === 0) {
      tone(330, 0.25, { type: 'triangle', gain: 0.04, slideTo: 220 })
      return
    }
    const base = delta >= 35 ? 659 : delta >= 20 ? 587 : delta >= 10 ? 523 : 440
    const notes = delta >= 20 ? [0, 4, 7, 12, 16] : [0, 4, 7]
    notes.forEach((n, i) =>
      tone(semis(base, n), 0.28, { type: 'triangle', gain: 0.04, delay: i * 0.07 }),
    )
    buzz(delta >= 25 ? [20, 40, 40] : 16)
  },
  /** One line of the final tally landing. */
  tally(step: number): void {
    tone(semis(392, LADDER[Math.min(step, LADDER.length - 1)]!), 0.1, { type: 'square', gain: 0.02 })
    buzz(6)
  },
  /** Tier reveal fanfare. */
  fanfare(tier: 'none' | 'bronze' | 'silver' | 'gold'): void {
    const chords = {
      none: [0, 3, 7],
      bronze: [0, 4, 7],
      silver: [0, 4, 7, 12],
      gold: [0, 4, 7, 12, 16, 19],
    }[tier]
    chords.forEach((n, i) => {
      tone(semis(392, n), 0.5, { type: 'triangle', gain: 0.045, delay: i * 0.09 })
      tone(semis(784, n), 0.4, { type: 'sine', gain: 0.015, delay: i * 0.09 + 0.02 })
    })
    buzz(tier === 'gold' ? [30, 50, 30, 50, 60] : [30, 60, 30])
  },
}
