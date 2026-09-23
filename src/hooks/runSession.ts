import { createActor } from 'xstate'
import { Game } from '../engine/game'
import { createGameConfig } from '../engine/config'
import { gameMachine } from '../machine/gameMachine'
import type { GameMachineEvent } from '../machine/gameMachine'

export interface RunSession {
  id: string
  seed: number
  mode: 'free' | 'daily' | 'challenge'
  patternId?: string
  targetScore?: number
  targetRound: number
  tutorial: boolean
  actions: GameMachineEvent[]
}
const KEY = 'rosewindow-active-v1'
const USER_ACTIONS = new Set([
  'CHOOSE_PATTERN',
  'SELECT_DIE',
  'PLACE_DIE',
  'REFRESH_DRAFT',
  'CANCEL_SELECTION',
])

/** Resume by replaying engine-validated actions, never by trusting a stored score or board. */
export function replaySession(seed: number, actions: GameMachineEvent[]): Game {
  const game = new Game(createGameConfig(seed))
  const actor = createActor(gameMachine, { input: { game, skipAnimations: true } }).start()
  for (const event of actions) if (USER_ACTIONS.has(event.type)) actor.send(event)
  actor.stop()
  return game
}

export function saveSession(session: RunSession): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
    return true
  } catch {
    return false
  }
}
export function clearSession(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
}
export function loadSession(): RunSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null') as RunSession | null
    if (
      !value ||
      typeof value.id !== 'string' ||
      value.id.trim().length === 0 ||
      typeof value.tutorial !== 'boolean' ||
      !Number.isSafeInteger(value.seed) ||
      value.seed < 0 ||
      value.seed > 4294967295 ||
      !['free', 'daily', 'challenge'].includes(value.mode) ||
      !Array.isArray(value.actions) ||
      value.actions.length > 1000 ||
      value.targetRound !== 1
    )
      return null
    for (const event of value.actions) {
      if (!event || !USER_ACTIONS.has(event.type)) return null
      if (event.type === 'CHOOSE_PATTERN' && typeof event.id !== 'string') return null
      if (
        event.type === 'SELECT_DIE' &&
        (!event.die ||
          !['red', 'blue', 'green', 'yellow', 'purple'].includes(event.die.color) ||
          !Number.isInteger(event.die.value) ||
          event.die.value < 1 ||
          event.die.value > 6)
      )
        return null
      if (
        event.type === 'PLACE_DIE' &&
        (!event.position ||
          !Number.isInteger(event.position.row) ||
          !Number.isInteger(event.position.col) ||
          event.position.row < 0 ||
          event.position.row > 3 ||
          event.position.col < 0 ||
          event.position.col > 3)
      )
        return null
    }
    if (value.patternId !== undefined && typeof value.patternId !== 'string') return null
    if (
      value.targetScore !== undefined &&
      (!Number.isSafeInteger(value.targetScore) ||
        value.targetScore < 0 ||
        value.targetScore > 1000000)
    )
      return null
    return value
  } catch {
    return null
  }
}
