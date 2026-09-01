import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMachine } from '@xstate/react'
import { Game } from '../engine/game'
import { findPlacementViolation } from '../engine/placementValidator'
import type { PlacementViolation } from '../engine/errors'
import type { BeamPath, BeamSegment } from '../engine/beamTracer'
import type { Position } from '../engine/types'
import { gameMachine } from '../machine/gameMachine'
import { fastForward } from '../dev/autoPlayer'
import { sfx } from '../dev/sfx'

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
  onBeamStrike: (segment: BeamSegment) => void
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
export function useGame(): UseGameResult {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const seed = Number(params.get('seed') ?? '3')
  const targetRound = Math.min(9, Math.max(1, Number(params.get('round') ?? '1')))

  const game = useMemo(() => fastForward(seed, targetRound), [seed, targetRound])

  const [eventCount, setEventCount] = useState(0)
  const [rejection, setRejection] = useState<UseGameResult['rejection']>(null)
  const [lastPlaced, setLastPlaced] = useState<UseGameResult['lastPlaced']>(null)
  const [beam, setBeam] = useState<UseGameResult['beam']>(null)
  const [litCells, setLitCells] = useState<ReadonlySet<string>>(new Set())
  const [lastLit, setLastLit] = useState<UseGameResult['lastLit']>(null)
  const [shakeKey, setShakeKey] = useState(0)
  const [forfeitNotice, setForfeitNotice] = useState<number | null>(null)
  const flashKey = useRef(0)
  const beamKey = useRef(0)

  const [snapshot, send] = useGameActor(game, false)

  const path = statePath(snapshot)
  const animating = path === 'round.illuminate'

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
          break
        case 'roundForfeited':
          setForfeitNotice(event.round)
          break
        case 'roundScored':
          sfx.roundScored(event.delta)
          if (event.delta >= 15) setShakeKey((k) => k + 1)
          break
        case 'gameOver':
          sfx.roundScored(99)
          break
      }
    })
  }, [game])

  const onBeamDone = useCallback(() => {
    send({ type: 'BEAM_ANIMATION_DONE' })
  }, [send])

  const onBeamStrike = useCallback((segment: BeamSegment) => {
    if (segment.die !== null) {
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
  }
}

/** Dot path of the machine state ('setup', 'round.draft', 'round.illuminate', 'gameOver'). */
export function statePath(snapshot: { value: unknown }): string {
  const value = snapshot.value as string | { round: string }
  return typeof value === 'string' ? value : `round.${value.round}`
}
