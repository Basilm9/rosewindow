import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { sfx } from '../dev/sfx'
import { Icon } from './Icon'
import { DieFace } from './Die'

/** Bottom sheet with a lead-framed top edge. Escape and the scrim close it. */
export function Sheet({
  title,
  onClose,
  children,
  testId,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  testId?: string
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="scrim" onClick={onClose}>
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="icon-btn sheet__close"
          aria-label="Close"
          data-testid="close-dialog"
          onClick={onClose}
        >
          <Icon name="close" size={18} />
        </button>
        <h2 className="sheet__title">{title}</h2>
        {children}
      </section>
    </div>
  )
}

export function PauseMenu({
  onResume,
  onRules,
  onDaily,
  onNew,
  mode,
  seed,
}: {
  onResume: () => void
  onRules: () => void
  onDaily: () => void
  onNew: () => void
  mode: 'free' | 'daily' | 'challenge'
  seed: number
}) {
  const [confirmNew, setConfirmNew] = useState(false)
  return (
    <Sheet title="Paused" onClose={onResume} testId="pause-menu">
      <div className="menu">
        <button className="btn btn--gold btn--big btn--wide" data-testid="menu-resume" onClick={onResume}>
          <Icon name="play" size={18} /> Resume
        </button>
        <button className="btn btn--wide" data-testid="tutorial-replay" onClick={onRules}>
          <Icon name="help" size={18} /> How to play
        </button>
        {mode !== 'daily' && (
          <button className="btn btn--wide" data-testid="menu-daily" onClick={onDaily}>
            <Icon name="calendar" size={18} /> Today’s daily window
          </button>
        )}
        <button
          className={`btn btn--wide ${confirmNew ? 'btn--danger' : ''}`}
          data-testid="menu-new"
          onClick={() => {
            sfx.tap()
            if (confirmNew) onNew()
            else setConfirmNew(true)
          }}
        >
          <Icon name="refresh" size={18} />
          {confirmNew ? 'Tap again to abandon this window' : 'New window'}
        </button>
        <p className="menu__seed">
          {mode === 'daily' ? 'Daily window' : mode === 'challenge' ? 'Friend challenge' : 'Free play'} · window #{seed}
        </p>
      </div>
    </Sheet>
  )
}

const d = (color: 'red' | 'yellow' | 'blue' | 'green' | 'purple', value: number) => ({ color, value })

/** How to play, as four short illustrated cards. */
export function RulesContent() {
  return (
    <div className="rules">
      <section className="rule">
        <h3>1 · Build the window</h3>
        <p>Tap a die, then tap a glowing pane. Each round you place 2 of the 5 dice.</p>
        <ul>
          <li>Your first die goes on the outer edge.</li>
          <li>Every new die must touch one already placed, even at a corner.</li>
          <li>Dice side by side can’t share a color or a number.</li>
          <li>Printed panes only take their color or number.</li>
        </ul>
      </section>
      <section className="rule">
        <h3>2 · Bend the light</h3>
        <p>After you place 2 dice, a beam enters from the glowing sun and walks through the window.</p>
        <div className="rule__bends">
          <span>
            <span className="rule__die"><DieFace die={d('red', 3)} fluid /></span>
            <span className="rule__die"><DieFace die={d('yellow', 3)} fluid /></span>
            <b>turn right</b>
          </span>
          <span>
            <span className="rule__die"><DieFace die={d('blue', 3)} fluid /></span>
            <span className="rule__die"><DieFace die={d('green', 3)} fluid /></span>
            <b>turn left</b>
          </span>
          <span>
            <span className="rule__die"><DieFace die={d('purple', 3)} fluid /></span>
            <b>straight on</b>
          </span>
        </div>
      </section>
      <section className="rule">
        <h3>3 · Score</h3>
        <ul>
          <li>Every die the beam passes through scores its number × the multiplier.</li>
          <li>Every turn adds +1 to the multiplier, up to ×5.</li>
          <li>After turning on a die showing N, the beam goes straight for N−1 panes. A 1 can turn again at once.</li>
        </ul>
      </section>
      <section className="rule">
        <h3>4 · Finish strong</h3>
        <p>
          8 rounds. When the window is done, the four goals under the score pay out. You get one reroll of
          your dice per game. If no die fits anywhere, the round is skipped but the beam still scores.
        </p>
      </section>
    </div>
  )
}
