import { TUTORIAL_STEPS } from '../hooks/useTutorial'

/** Chunky coach-mark card, bottom-center above the hand bar. */
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
    <div
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 sm:bottom-28"
      role="dialog"
      aria-label="tutorial"
    >
      <div
        data-testid="tutorial-card"
        className="panel pointer-events-auto w-[min(92vw,460px)] px-5 py-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/90">
            How to play · {step + 1}/{TUTORIAL_STEPS.length}
          </p>
          <button
            type="button"
            data-testid="tutorial-skip"
            onClick={onSkip}
            className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 transition hover:text-neutral-300"
          >
            skip
          </button>
        </div>
        <p className="mt-1.5 font-serif text-lg text-amber-200 [text-shadow:0_2px_0_rgba(0,0,0,0.6)]">
          {current.title}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-300">{current.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1" aria-hidden>
            {TUTORIAL_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-4 rounded-full ${i === step ? 'bg-amber-400' : 'bg-neutral-700'}`}
              />
            ))}
          </div>
          {current.requires === undefined && (
            <button
              type="button"
              data-testid="tutorial-next"
              onClick={onNext}
              className="rounded-lg border-2 border-black/70 bg-amber-500 px-4 py-1.5 text-sm font-black uppercase tracking-wide text-amber-950 shadow-[0_3px_0_rgba(0,0,0,0.5)] transition hover:-translate-y-0.5 hover:bg-amber-400 active:translate-y-0 active:shadow-none"
            >
              {last ? 'Finish' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
