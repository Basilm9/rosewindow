import { useEffect, useMemo, useRef, useState } from 'react'
import { useMachine } from '@xstate/react'
import { Game } from '../engine/game'
import { findPlacementViolation } from '../engine/placementValidator'
import type { PlacementViolation } from '../engine/errors'
import type { Die, Position } from '../engine/types'
import { gameMachine } from '../machine/gameMachine'
import { fastForward } from '../dev/autoPlayer'

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
  const flashKey = useRef(0)

  const [snapshot, send] = useGameActor(game, true)

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
    }
  }, [machineRejection])

  useEffect(() => {
    return game.subscribe((event) => {
      setEventCount((c) => c + 1)
      if (event.kind === 'diePlaced') {
        flashKey.current += 1
        setLastPlaced({ position: event.position, key: flashKey.current })
        setRejection(null)
      }
    })
  }, [game])

  /**
   * Hover-preview legality, computed from the engine's PURE validator for
   * presentation only — enforcement always happens in the machine guard.
   * Deliberately recomputed every render: selection emits no engine event, so a
   * memo would go stale exactly when the hand changes.
   */
  const legalPreview = new Map<string, PlacementViolation | null>()
  let previewHand: Die | null = null
  {
    const hand = game.hand
    const gameWindow = game.window
    previewHand = hand
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

  // Dev/e2e aid: inspect live model state from the browser console.
  if (typeof window !== 'undefined') {
    const w = window as unknown as Record<string, unknown>
    w.__roseGame = game
    w.__rosePreview = legalPreview
    w.__rosePreviewHand = previewHand
    w.__renderCount = Number(w.__renderCount ?? 0) + 1
  }

  return { game, snapshot, send, eventCount, seed, legalPreview, rejection, lastPlaced }
}

/** Dot path of the machine state ('setup', 'round.draft', 'round.illuminate', 'gameOver'). */
export function statePath(snapshot: { value: unknown }): string {
  const value = snapshot.value as string | { round: string }
  return typeof value === 'string' ? value : `round.${value.round}`
}
