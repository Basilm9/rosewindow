import { createGameConfig } from '../engine/config'
import { Game } from '../engine/game'
import { dailyKey, dailySeed } from './profile'

/** Ruleset version must change if seeded generation or any competitive rule changes. */
export const CHALLENGE_RULESET = 'classic-v1' as const

/** Friend scores are self-reported until an authoritative replay service exists. */
export interface FriendChallenge {
  readonly version: 1
  readonly ruleset: typeof CHALLENGE_RULESET
  readonly seed: number
  readonly patternId: string
  readonly targetScore: number
}

function integerWithin(value: number, max: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= max
}

function validChallenge(value: FriendChallenge): boolean {
  return (
    value.version === 1 &&
    value.ruleset === CHALLENGE_RULESET &&
    integerWithin(value.seed, 0xffffffff) &&
    integerWithin(value.targetScore, 1_000_000) &&
    new Game(createGameConfig(value.seed)).offeredPatterns.some(
      (pattern) => pattern.id === value.patternId,
    )
  )
}

/** A stable daily window: same UTC date, seed, offered pattern, and default rules. */
export function dailyChallenge(date: Date): { date: string; seed: number; patternId: string } {
  const seed = dailySeed(date)
  return {
    date: dailyKey(date),
    seed,
    patternId: new Game(createGameConfig(seed)).offeredPatterns[0].id,
  }
}

/** Validate the chosen pattern is one the canonical seeded game actually offers. */
export function createChallenge(input: {
  seed: number
  patternId: string
  targetScore: number
}): FriendChallenge {
  const challenge: FriendChallenge = { ...input, version: 1, ruleset: CHALLENGE_RULESET }
  if (!validChallenge(challenge)) throw new Error('Invalid friend challenge')
  return challenge
}

/** Typo-detecting checksum only. It is deliberately not described as authentication. */
function checksum(text: string): string {
  let hash = 2166136261
  for (const character of text) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

/** Portable code pins both seed and pattern; score affects the target, never gameplay. */
export function encodeChallenge(challenge: FriendChallenge): string {
  if (!validChallenge(challenge)) throw new Error('Invalid friend challenge')
  const body = `RW1.${challenge.seed.toString(36)}.${challenge.patternId}.${challenge.targetScore.toString(36)}`
  return `${body}.${checksum(body)}`
}

/** Accept a copied code or HTTP(S) link. Malformed, altered, or unsupported codes return null. */
export function decodeChallenge(input: string): FriendChallenge | null {
  if (typeof input !== 'string' || input.length > 2048) return null
  let code = input.trim()
  if (/^https?:\/\//i.test(code)) {
    try {
      const url = new URL(code)
      if (url.searchParams.getAll('challenge').length !== 1) return null
      code = url.searchParams.get('challenge') ?? ''
    } catch {
      return null
    }
  }
  if (!/^RW1\.[0-9a-z]{1,7}\.[a-z][a-z0-9-]{0,63}\.[0-9a-z]{1,4}\.[0-9a-z]{1,7}$/.test(code))
    return null
  const parts = code.split('.')
  const body = parts.slice(0, 4).join('.')
  if (checksum(body) !== parts[4]) return null
  const seed = Number.parseInt(parts[1]!, 36)
  const targetScore = Number.parseInt(parts[3]!, 36)
  if (seed.toString(36) !== parts[1] || targetScore.toString(36) !== parts[3]) return null
  const challenge: FriendChallenge = {
    version: 1,
    ruleset: CHALLENGE_RULESET,
    seed,
    patternId: parts[2]!,
    targetScore,
  }
  return validChallenge(challenge) ? challenge : null
}

/** A share link carries only challenge data; unrelated URL parameters are removed. */
export function challengeUrl(challenge: FriendChallenge, baseUrl: string): string {
  const url = new URL(baseUrl)
  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    throw new Error('An HTTP(S) URL is required')
  url.search = ''
  url.hash = ''
  url.searchParams.set('challenge', encodeChallenge(challenge))
  return url.toString()
}
