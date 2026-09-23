import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMachine } from '@xstate/react'
import { Game } from '../engine/game'
import { findPlacementViolation } from '../engine/placementValidator'
import type { PlacementViolation } from '../engine/errors'
import type { BeamPath, BeamSegment } from '../engine/beamTracer'
import { traceBeam } from '../engine/beamTracer'
import { calculateScore } from '../engine/scoreCalculator'
import type { ScoreLine } from '../engine/scoreCalculator'
import type { Position } from '../engine/types'
import { gameMachine } from '../machine/gameMachine'
import { fastForward } from '../dev/autoPlayer'
import { sfx } from '../dev/sfx'
import { replaySession, saveSession } from './runSession'
import type { RunSession } from './runSession'

type UseMachineResult = ReturnType<typeof useGameActor>

export interface UseGameResult {
  game: Game
  snapshot: UseMachineResult[0]
  send: UseMachineResult[1]
  /** Bumped on every engine event; belt-and-braces reactivity alongside machine transitions. */
  eventCount: number
  seed: number
  /** Per-cell violation for the held die (null = legal). Presentational only. */
  legalPreview: Map<string, PlacementViolation | null>
  rejection: { position: Position; kind: string; key: number } | null
  lastPlaced: { position: Position; key: number } | null
  /** The die the beam just struck (for the strike flash/pop). */
  lastLit: { position: Position; key: number } | null
  /** Increments when a big round score should shake the screen. */
  shakeKey: number
  /** Round number when a forfeit last occurred (for the notice banner). */
  forfeitNotice: number | null
  /** The beam path currently animating (or settled) over the board. */
  beam: { path: BeamPath; key: number } | null
  /** Cells whose glass the beam has lit, keyed "row,col". */
  litCells: ReadonlySet<string>
  /** True while the beam animation is running (machine gated in illuminate). */
  animating: boolean
  /** The machine's illuminate gate calls this when the beam animation finishes. */
  onBeamDone: () => void
  /** Fires per struck die during the beam animation (lights the glass). */
  onBeamStrike: (segment: BeamSegment, index: number, multiplier: number) => void
  /** Running tally of the beam currently animating: points so far and the live multiplier. */
  beamRun: { points: number; multiplier: number; strikes: number }
  /** The round the beam just finished scoring, shown as a celebration burst. */
  roundBurst: { round: number; delta: number; key: number } | null
  /** Objective points the window would earn right now (engine scorer, presentation only). */
  objectiveLines: readonly ScoreLine[]
}

function useGameActor(game: Game, skipAnimations: boolean) {
  return useMachine(gameMachine, { input: { game, skipAnimations } })
}

export function cellKey(position: Position): string {
  return `${position.row},${position.col}`
}

/**
 * Wires one seeded `Game` (the model) to its machine (the flow) and React.
 *
 * Seeded demo mode via URL: `?seed=3` chooses the seed; `&round=N` (N up to 9)
 * fast-forwards with the dev auto-player so any board state is reproducible —
 * the property that makes screenshots deterministic for agents and humans.
 */
export function useGame(session?: RunSession): UseGameResult {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const rawSeed = session?.seed ?? Number(params.get('seed') ?? '3')
  const seed = Number.isFinite(rawSeed) ? Math.trunc(rawSeed) >>> 0 : 3
  const rawRound = session?.targetRound ?? Number(params.get('round') ?? '1')
  const targetRound = Number.isFinite(rawRound) ? Math.min(9, Math.max(1, Math.trunc(rawRound))) : 1

  const initialActions = useRef(session?.actions ?? [])
  const actions = useRef([...initialActions.current])
  const game = useMemo(
    () =>
      initialActions.current.length > 0
        ? replaySession(seed, initialActions.current)
        : fastForward(seed, targetRound),
    [seed, targetRound],
  )

  const [eventCount, setEventCount] = useState(0)
  const [rejection, setRejection] = useState<UseGameResult['rejection']>(null)
  const [lastPlaced, setLastPlaced] = useState<UseGameResult['lastPlaced']>(null)
  const [beam, setBeam] = useState<UseGameResult['beam']>(null)
  const [litCells, setLitCells] = useState<ReadonlySet<string>>(new Set())
  const [lastLit, setLastLit] = useState<UseGameResult['lastLit']>(null)
  const [shakeKey, setShakeKey] = useState(0)
  const [forfeitNotice, setForfeitNotice] = useState<number | null>(null)
  const [beamRun, setBeamRun] = useState<UseGameResult['beamRun']>({
    points: 0,
    multiplier: 1,
    strikes: 0,
  })
  const [roundBurst, setRoundBurst] = useState<UseGameResult['roundBurst']>(null)
  const pendingRound = useRef<{ round: number; delta: number } | null>(null)
  const flashKey = useRef(0)
  const beamKey = useRef(0)

  const [snapshot, actorSend, actorRef] = useGameActor(game, false)
  const send: UseMachineResult[1] = useCallback(
    (event) => {
      if (!actorRef.getSnapshot().can(event)) return
      actorSend(event)
      if (
        session &&
        targetRound === 1 &&
        ['CHOOSE_PATTERN', 'SELECT_DIE', 'PLACE_DIE', 'REFRESH_DRAFT', 'CANCEL_SELECTION'].includes(
          event.type,
        )
      ) {
        actions.current.push(event)
        saveSession({ ...session, actions: actions.current })
      }
    },
    [actorSend, actorRef, session, targetRound],
  )

  const path = statePath(snapshot)
  const animating = path === 'round.illuminate'

  // A resumed/pre-advanced blocked draft can illuminate during actor startup,
  // before React installs the event subscription. Recover that exact beam from
  // the immutable entry sequence and unchanged board so the animation gate can finish.
  useEffect(() => {
    if (!animating || beam !== null || game.window === null) return
    const entry = game.entrySequence[game.roundScores.length - 1]
    if (!entry) return
    beamKey.current += 1
    setBeam({
      path: traceBeam(game.window.dice, entry, game.config.multiplierCap),
      key: beamKey.current,
    })
  }, [animating, beam, game])

  // The machine guards illegal placements before the engine sees them, so its
  // context is the authoritative rejection source for the view.
  const machineRejection = snapshot.context.lastRejection
  useEffect(() => {
    if (machineRejection !== null) {
      flashKey.current += 1
      setRejection({
        position: machineRejection.position,
        kind: machineRejection.violation.kind,
        key: flashKey.current,
      })
      sfx.reject()
    }
  }, [machineRejection])

  // Forfeit notices display for a few seconds, then fade from attention.
  useEffect(() => {
    if (forfeitNotice === null) return
    const t = setTimeout(() => setForfeitNotice(null), 3500)
    return () => clearTimeout(t)
  }, [forfeitNotice])

  useEffect(() => {
    return game.subscribe((event) => {
      setEventCount((c) => c + 1)
      switch (event.kind) {
        case 'diePlaced':
          flashKey.current += 1
          setLastPlaced({ position: event.position, key: flashKey.current })
          setRejection(null)
          sfx.place()
          break
        case 'beamTraced':
          beamKey.current += 1
          setBeam({ path: event.path, key: beamKey.current })
          setBeamRun({ points: 0, multiplier: 1, strikes: 0 })
          break
        case 'roundForfeited':
          setForfeitNotice(event.round)
          break
        case 'roundScored':
          pendingRound.current = { round: event.round, delta: event.delta }
          break
      }
    })
  }, [game])

  const onBeamDone = useCallback(() => {
    const scored = pendingRound.current
    if (scored !== null) {
      pendingRound.current = null
      flashKey.current += 1
      setRoundBurst({ ...scored, key: flashKey.current })
      sfx.roundScored(scored.delta)
      if (scored.delta >= 25) setShakeKey((k) => k + 1)
    }
    send({ type: 'BEAM_ANIMATION_DONE' })
  }, [send])

  const onBeamStrike = useCallback((segment: BeamSegment, _index: number, multiplier: number) => {
    if (segment.die !== null) {
      setBeamRun((run) => ({
        points: run.points + segment.points,
        multiplier,
        strikes: run.strikes + 1,
      }))
      setLitCells((prev) => {
        const next = new Set(prev)
        next.add(cellKey(segment.position))
        return next
      })
      flashKey.current += 1
      setLastLit({ position: segment.position, key: flashKey.current })
    }
  }, [])

  /**
   * Hover-preview legality, computed from the engine's PURE validator for
   * presentation only — enforcement always happens in the machine guard.
   * Deliberately recomputed every render: selection emits no engine event, so a
   * memo would go stale exactly when the hand changes.
   */
  const legalPreview = new Map<string, PlacementViolation | null>()
  {
    const hand = game.hand
    const gameWindow = game.window
    if (hand !== null && gameWindow !== null) {
      for (let row = 0; row < gameWindow.gridSize; row++) {
        for (let col = 0; col < gameWindow.gridSize; col++) {
          const target: Position = { row, col }
          legalPreview.set(
            cellKey(target),
            findPlacementViolation({
              grid: gameWindow.dice,
              constraints: gameWindow.constraints,
              pool: [hand],
              die: hand,
              target,
            }),
          )
        }
      }
    }
  }

  const objectiveLines =
    game.window === null
      ? []
      : calculateScore({
          grid: game.window.dice,
          objectives: game.objectives,
          beamTotal: 0,
          tiers: game.config.tiers,
        }).lines

  return {
    game,
    snapshot,
    send,
    eventCount,
    seed,
    legalPreview,
    rejection,
    lastPlaced,
    lastLit,
    shakeKey,
    forfeitNotice,
    beam,
    litCells,
    animating,
    onBeamDone,
    onBeamStrike,
    beamRun,
    roundBurst,
    objectiveLines,
  }
}

/** Dot path of the machine state ('setup', 'round.draft', 'round.illuminate', 'gameOver'). */
export function statePath(snapshot: { value: unknown }): string {
  const value = snapshot.value as string | { round: string }
  return typeof value === 'string' ? value : `round.${value.round}`
}
