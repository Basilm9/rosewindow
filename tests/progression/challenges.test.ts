import { describe, expect, it } from 'vitest'
import { createGameConfig } from '../../src/engine/config'
import { Game } from '../../src/engine/game'
import { ALL_PATTERNS } from '../../src/engine/patterns'
import {
  CHALLENGE_RULESET,
  challengeUrl,
  createChallenge,
  dailyChallenge,
  decodeChallenge,
  encodeChallenge,
} from '../../src/progression'
import { autoPlay } from '../helpers/autoPlayer'

function example(seed = 3) {
  return createChallenge({
    seed,
    patternId: new Game(createGameConfig(seed)).offeredPatterns[0].id,
    targetScore: 90,
  })
}

describe('portable friend challenges', () => {
  it.each([0, 1, 3, 0xffffffff])(
    'round-trips valid seeds including unsigned boundaries (%i)',
    (seed) => {
      const challenge = example(seed)
      expect(decodeChallenge(encodeChallenge(challenge))).toEqual(challenge)
      expect(challenge.ruleset).toBe(CHALLENGE_RULESET)
    },
  )

  it('builds a clean share URL that can be decoded, including surrounding paste whitespace', () => {
    const challenge = example()
    const url = challengeUrl(challenge, 'https://rose.example/play?seed=99&round=9&token=old#board')
    expect(new URL(url).searchParams.has('seed')).toBe(false)
    expect(new URL(url).searchParams.has('token')).toBe(false)
    expect(new URL(url).hash).toBe('')
    expect(new URL(url).pathname).toBe('/play')
    expect(decodeChallenge(`  ${url}\n`)).toEqual(challenge)
  })

  it('pins a genuinely offered pattern and reproduces the entire run for a friend', () => {
    const sent = example(2026)
    const received = decodeChallenge(encodeChallenge(sent))!
    const host = new Game(createGameConfig(sent.seed))
    const friend = new Game(createGameConfig(received.seed))
    expect(host.entrySequence).toEqual(friend.entrySequence)
    expect(host.objectives).toEqual(friend.objectives)
    const hostEvents = autoPlay(host, sent.patternId)
    const friendEvents = autoPlay(friend, received.patternId)
    expect(hostEvents).toEqual(friendEvents)
    expect(host.report).toEqual(friend.report)
    expect(host.window?.dice).toEqual(friend.window?.dice)
  })

  it('rejects a known pattern that this seed does not offer', () => {
    const game = new Game(createGameConfig(3))
    const unoffered = ALL_PATTERNS.find(
      (pattern) => !game.offeredPatterns.some((offered) => offered.id === pattern.id),
    )!
    expect(() => createChallenge({ seed: 3, patternId: unoffered.id, targetScore: 90 })).toThrow(
      'Invalid friend challenge',
    )
  })

  it.each([
    '',
    'RW2.3.novice-rose.2i.abc',
    'RW1.-1.novice-rose.2i.abc',
    'RW1.3.novice-rose.Infinity.abc',
    'https://rose.example/?seed=3',
    'https://rose.example/?challenge=one&challenge=two',
    'javascript:alert(1)',
    'RW1.'.repeat(1000),
  ])('returns null for invalid or unsupported input (%s)', (input) => {
    expect(decodeChallenge(input)).toBeNull()
  })

  it('rejects an edited seed, pattern, or target when the checksum no longer matches', () => {
    const code = encodeChallenge(example())
    const parts = code.split('.')
    for (const index of [1, 2, 3, 4]) {
      const edited = [...parts]
      edited[index] = index === 2 ? 'imaginary-window' : '9'
      expect(decodeChallenge(edited.join('.'))).toBeNull()
    }
  })

  it('validates score and seed bounds and rejects non-web share destinations', () => {
    expect(() => createChallenge({ ...example(), targetScore: -1 })).toThrow()
    expect(() => createChallenge({ ...example(), targetScore: Number.POSITIVE_INFINITY })).toThrow()
    expect(() => createChallenge({ ...example(), seed: 0x100000000 })).toThrow()
    expect(() => challengeUrl(example(), 'javascript:alert(1)')).toThrow('HTTP(S)')
  })
})

describe('daily shared window', () => {
  it('selects the canonical first offered pattern and keeps it fixed all UTC day', () => {
    const morning = dailyChallenge(new Date('2026-09-05T00:00:00.000Z'))
    const night = dailyChallenge(new Date('2026-09-05T23:59:59.999Z'))
    expect(morning).toEqual(night)
    expect(morning.date).toBe('2026-09-05')
    expect(morning.patternId).toBe(new Game(createGameConfig(morning.seed)).offeredPatterns[0].id)
    expect(dailyChallenge(new Date('2026-09-06T00:00:00.000Z')).seed).not.toBe(morning.seed)
  })
})
