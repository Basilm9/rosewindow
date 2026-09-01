import { useEffect, useMemo, useState } from 'react'
import { useMachine } from '@xstate/react'
import { Game } from '../engine/game'
import { gameMachine } from '../machine/gameMachine'
import { fastForward } from '../dev/autoPlayer'

function useGameActor(game: Game, skipAnimations: boolean) {
  return useMachine(gameMachine, { input: { game, skipAnimations } })
}

type UseMachineResult = ReturnType<typeof useGameActor>

export interface UseGameResult {
  game: Game
  snapshot: UseMachineResult[0]
  send: UseMachineResult[1]
  /** Bumped on every engine event; belt-and-braces reactivity alongside machine transitions. */
  eventCount: number
  seed: number
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
  useEffect(() => game.subscribe(() => setEventCount((c) => c + 1)), [game])

  const [snapshot, send] = useGameActor(game, true)

  return { game, snapshot, send, eventCount, seed }
}

/** Dot path of the machine state ('setup', 'round.draft', 'round.illuminate', 'gameOver'). */
export function statePath(snapshot: { value: unknown }): string {
  const value = snapshot.value as string | { round: string }
  return typeof value === 'string' ? value : `round.${value.round}`
}
