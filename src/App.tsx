import { useCallback, useEffect, useRef, useState } from 'react'
import { clearSession, loadSession, saveSession } from './hooks/runSession'
import type { RunSession } from './hooks/runSession'
import { GameScreen } from './view/GameScreen'
import { RoseArt } from './view/RoseArt'
import { getLevel, loadProfile, recordRun, saveProfile } from './progression/profile'
import type { PlayerProfile } from './progression/profile'
import { challengeUrl, createChallenge, dailyChallenge, decodeChallenge } from './progression/challenges'
import type { Game } from './engine/game'

type RunRewards = ReturnType<typeof recordRun>

const TUTORIAL_KEY = 'rosewindow-tutorial'

/** Works on plain-http LAN addresses too, where crypto.randomUUID is unavailable. */
function newId(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(2))
  return `${Date.now().toString(36)}-${bytes[0]!.toString(36)}${bytes[1]!.toString(36)}`
}

function newSession(overrides: Partial<RunSession> = {}): RunSession {
  return {
    id: newId(),
    seed: crypto.getRandomValues(new Uint32Array(1))[0]!,
    mode: 'free',
    targetRound: 1,
    tutorial: false,
    actions: [],
    ...overrides,
  }
}

function sessionFromUrl(): RunSession | null {
  const params = new URLSearchParams(window.location.search)
  if (params.has('challenge')) {
    const challenge = decodeChallenge(params.get('challenge') ?? '')
    return challenge ? newSession({ ...challenge, mode: 'challenge' }) : null
  }
  if (!params.has('seed') && !params.has('round') && params.get('tutorial') !== '1') return null
  const seed = Number(params.get('seed') ?? 3)
  const round = Number(params.get('round') ?? 1)
  return newSession({
    seed: Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 3,
    targetRound: Number.isFinite(round) ? Math.max(1, Math.min(9, Math.trunc(round))) : 1,
    tutorial: params.get('tutorial') === '1',
  })
}

function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === 'done'
  } catch {
    return true
  }
}

/**
 * Boot order, like any mobile game: a link's run, else the run you left, else a
 * fresh window (first launch starts the guided tutorial on the teaching seed).
 */
function bootSession(profile: PlayerProfile): RunSession {
  const fromUrl = sessionFromUrl()
  if (fromUrl) return fromUrl
  const saved = loadSession()
  // A resumed first-run keeps coaching only until the tutorial is finished or skipped.
  if (saved) return { ...saved, tutorial: saved.tutorial && !tutorialSeen() }
  const firstRun = profile.totalRuns === 0 && !tutorialSeen()
  return firstRun ? newSession({ seed: 3, tutorial: true }) : newSession()
}

export default function App() {
  const [profile, setProfile] = useState(loadProfile)
  const profileRef = useRef(profile)
  const [session, setSession] = useState<RunSession>(() => bootSession(profileRef.current))
  const [toast, setToast] = useState('')
  const [rewards, setRewards] = useState<RunRewards | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('challenge') && !decodeChallenge(params.get('challenge') ?? '')) {
      setToast('That challenge link is incomplete. Here’s a fresh window instead.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const updateProfile = useCallback((next: PlayerProfile) => {
    profileRef.current = next
    setProfile(next)
    if (!saveProfile(next)) setToast('Progress can’t be saved in this browser, so it resets on reload.')
  }, [])

  const start = useCallback((overrides: Partial<RunSession> = {}) => {
    const run = newSession(overrides)
    setRewards(null)
    saveSession(run)
    setSession(run)
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  const complete = useCallback(
    (game: Game, run: RunSession) => {
      if (run.targetRound > 1 || !game.report || !game.window) return
      const result = recordRun(profileRef.current, {
        id: run.id,
        seed: game.config.seed,
        patternId: game.window.pattern.id,
        mode: run.mode,
        score: game.report.total,
        beamTotal: game.report.beamTotal,
        completedAt: new Date().toISOString(),
      })
      if (result.recorded) {
        updateProfile(result.profile)
        setRewards(result)
        clearSession()
      }
    },
    [updateProfile],
  )

  const share = async (game: Game) => {
    if (!game.report || !game.window) return
    const challenge = createChallenge({
      seed: session.seed,
      patternId: game.window.pattern.id,
      targetScore: game.report.total,
    })
    const url = challengeUrl(challenge, window.location.href)
    const text = `I lit ${game.report.total} on this Rose Window. Can you beat it?`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Rose Window', text, url })
        return
      }
      await navigator.clipboard.writeText(`${text} ${url}`)
      setToast('Challenge link copied. Send it to a friend.')
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return
      setToast('Couldn’t share from this browser. Try copying the page link instead.')
    }
  }

  const daily = () => {
    const today = dailyChallenge(new Date())
    start({ mode: 'daily', seed: today.seed, patternId: today.patternId })
  }

  return (
    <div className="app">
      <div className="backdrop" aria-hidden>
        <RoseArt className="backdrop__rose" />
        <div className="backdrop__motes">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} style={{ ["--i" as string]: i }} />
          ))}
        </div>
      </div>
      <GameScreen
        key={session.id}
        session={session}
        level={getLevel(profile.xp).level}
        best={profile.bestScore}
        xp={profile.xp}
        rewards={rewards}
        onComplete={complete}
        onNew={() => start()}
        onDaily={daily}
        onRestart={() =>
          start(
            session.mode === 'free'
              ? {}
              : {
                  mode: session.mode,
                  seed: session.seed,
                  patternId: session.patternId,
                  targetScore: session.targetScore,
                },
          )
        }
        onShare={(game) => void share(game)}
      />
      {toast && (
        <div role="status" className="toast" data-testid="app-toast">
          {toast}
        </div>
      )}
    </div>
  )
}
