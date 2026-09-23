import { TUTORIAL_STEPS } from '../hooks/useTutorial'

/** Coach bubble: never covers the board or tray, so every step stays playable. */
export function TutorialOverlay({
  step,
  onNext,
  onSkip,
}: {
  step: number
  onNext: () => void
  onSkip: () => void
}) {
  const current = TUTORIAL_STEPS[step]!
  const last = step === TUTORIAL_STEPS.length - 1
  return (
    <section key={step} className="coach" data-testid="tutorial-card" aria-label="tutorial">
      <div className="coach__head">
        <span className="coach__step">
          {step + 1}/{TUTORIAL_STEPS.length}
        </span>
        <h2>{current.title}</h2>
        <button type="button" data-testid="tutorial-skip" onClick={onSkip} className="coach__skip">
          Skip
        </button>
      </div>
      <p>{current.body}</p>
      {current.requires === undefined && (
        <button type="button" data-testid="tutorial-next" onClick={onNext} className="btn btn--violet coach__next">
          {last ? (current.cta ?? 'Finish') : 'Got it'}
        </button>
      )}
    </section>
  )
}
