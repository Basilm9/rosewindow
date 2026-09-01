/**
 * Synthesized sound effects (pitch §13: three SFX — pick up, place, score).
 * Pure WebAudio: no assets, initialized on first user gesture, mute persisted.
 */

let ctx: AudioContext | null = null
let muted = typeof localStorage !== 'undefined' && localStorage.getItem('rosewindow-muted') === '1'

function audio(): AudioContext | null {
  if (muted) return null
  if (ctx === null) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
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

export const sfx = {
  get muted(): boolean {
    return muted
  },
  toggleMute(): boolean {
    muted = !muted
    localStorage.setItem('rosewindow-muted', muted ? '1' : '0')
    return muted
  },
  /** Drafting a die into the hand. */
  pickup(): void {
    tone(620, 0.07, { type: 'triangle' })
    tone(930, 0.08, { type: 'triangle', delay: 0.05, gain: 0.045 })
  },
  /** Placing a die. */
  place(): void {
    tone(300, 0.1, { type: 'triangle', slideTo: 190 })
    tone(150, 0.12, { type: 'sine', gain: 0.05 })
  },
  /** Rejected placement. */
  reject(): void {
    tone(150, 0.16, { type: 'sawtooth', gain: 0.04, slideTo: 95 })
  },
  /** The beam striking a die; pitch climbs with the multiplier. */
  strike(multiplier: number): void {
    const base = 420 * Math.pow(1.14, multiplier - 1)
    tone(base, 0.09, { type: 'sine', gain: 0.05 })
    tone(base * 1.5, 0.07, { type: 'sine', gain: 0.03, delay: 0.02 })
  },
  /** Round scored — soft chime. */
  roundScored(delta: number): void {
    const base = delta >= 20 ? 520 : delta >= 5 ? 440 : 330
    tone(base, 0.12, { type: 'sine', gain: 0.045 })
    tone(base * 1.25, 0.14, { type: 'sine', gain: 0.04, delay: 0.09 })
    tone(base * 1.5, 0.18, { type: 'sine', gain: 0.035, delay: 0.18 })
  },
}
