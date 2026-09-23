import { describe, expect, it } from 'vitest'
import {
  PROFILE_STORAGE_KEY,
  claimDailyReward,
  createProfile,
  dailyKey,
  dailySeed,
  getDailyQuests,
  getLevel,
  getStreak,
  loadProfile,
  purchasePalette,
  recordRun,
  saveProfile,
  selectPalette,
  unlockedPalettes,
} from '../../src/progression'
import type { RunResult, StorageLike } from '../../src/progression'

function run(id = 'run-1', overrides: Partial<RunResult> = {}): RunResult {
  return {
    id,
    seed: 3,
    patternId: 'novice-rose',
    mode: 'free',
    score: 90,
    beamTotal: 30,
    completedAt: '2026-09-04T18:30:00.000Z',
    ...overrides,
  }
}

function memoryStorage(initial: string | null = null): StorageLike {
  let stored = initial
  return {
    getItem(key) {
      return key === PROFILE_STORAGE_KEY ? stored : null
    },
    setItem(key, value) {
      if (key === PROFILE_STORAGE_KEY) stored = value
    },
  }
}

describe('UTC daily schedule', () => {
  it('uses the same day and seed across local timezone representations', () => {
    const chicago = new Date('2026-09-04T20:30:00-05:00')
    const tokyo = new Date('2026-09-05T10:30:00+09:00')
    expect(dailyKey(chicago)).toBe('2026-09-05')
    expect(dailySeed(chicago)).toBe(dailySeed(tokyo))
    expect(dailySeed(chicago)).toBeGreaterThanOrEqual(0)
    expect(dailySeed(chicago)).toBeLessThanOrEqual(0xffffffff)
  })

  it('changes exactly at UTC midnight, and rejects invalid dates', () => {
    const before = new Date('2026-09-04T23:59:59.999Z')
    const after = new Date('2026-09-05T00:00:00.000Z')
    expect(dailySeed(before)).not.toBe(dailySeed(after))
    expect(() => dailyKey(new Date('invalid'))).toThrow('valid date')
  })

  it('grants a fixed daily gift once even after reload or a later return to that day', () => {
    const date = new Date('2026-09-04T00:00:00.000Z')
    const first = claimDailyReward(createProfile(), date)
    const storage = memoryStorage()
    expect(first.claimed).toBe(true)
    expect(first.shards).toBe(50)
    expect(saveProfile(first.profile, storage)).toBe(true)
    const repeated = claimDailyReward(loadProfile(storage), new Date('2026-09-04T23:59:59.999Z'))
    expect(repeated.claimed).toBe(false)
    expect(repeated.shards).toBe(0)
    const tomorrow = claimDailyReward(repeated.profile, new Date('2026-09-05T00:00:00.000Z'))
    expect(tomorrow.profile.shards).toBe(100)
    expect(claimDailyReward(tomorrow.profile, date).claimed).toBe(false)
  })

  it('counts consecutive claims and preserves yesterday until today is claimed', () => {
    let profile = createProfile()
    for (const day of [2, 3, 4]) {
      profile = claimDailyReward(profile, new Date(`2026-09-0${day}T00:00:00.000Z`)).profile
    }
    expect(getStreak(profile, new Date('2026-09-04T12:00:00Z'))).toBe(3)
    expect(getStreak(profile, new Date('2026-09-05T12:00:00Z'))).toBe(3)
    expect(getStreak(profile, new Date('2026-09-06T12:00:00Z'))).toBe(0)
    const afterGap = claimDailyReward(profile, new Date('2026-09-07T00:00:00Z'))
    expect(afterGap.shards).toBe(50)
    expect(getStreak(afterGap.profile, new Date('2026-09-07T00:00:00Z'))).toBe(1)
  })
})

describe('run rewards and quests', () => {
  it('records the final score, grants exact rewards, and refuses the same ID twice', () => {
    const original = createProfile()
    const first = recordRun(original, run())
    expect(first.recorded).toBe(true)
    expect(first.isPersonalBest).toBe(true)
    expect(first.xpEarned).toBe(95)
    // 19 run + 25 first light + 40 gold + 20 finish quest + 30 score quest.
    expect(first.shardsEarned).toBe(134)
    expect(first.newAchievements).toEqual(['first-light', 'golden-hour'])
    expect(first.profile.bestScore).toBe(90)
    expect(first.profile.bestBeam).toBe(30)
    expect(first.profile.history).toEqual([run()])
    expect(original.totalRuns).toBe(0)

    const repeated = recordRun(first.profile, run('run-1', { score: 999 }))
    expect(repeated.recorded).toBe(false)
    expect(repeated.profile).toBe(first.profile)
    expect(repeated.xpEarned).toBe(0)
    expect(repeated.shardsEarned).toBe(0)
    expect(repeated.newAchievements).toEqual([])
  })

  it('keeps deduplication after a run leaves the 30-item history and across reloads', () => {
    let profile = createProfile()
    for (let index = 0; index < 31; index++)
      profile = recordRun(profile, run(`run-${index}`)).profile
    expect(profile.history).toHaveLength(30)
    expect(profile.history.some((item) => item.id === 'run-0')).toBe(false)
    const storage = memoryStorage()
    saveProfile(profile, storage)
    const restored = loadProfile(storage)
    expect(recordRun(restored, run('run-0')).recorded).toBe(false)
    expect(restored.totalRuns).toBe(31)
    expect(restored.recordedRunIds).toHaveLength(31)
  })

  it('accumulates beam quests across runs and awards each quest only once per date', () => {
    const date = new Date('2026-09-04T20:00:00Z')
    const first = recordRun(createProfile(), run('one', { score: 75, beamTotal: 60 }))
    expect(
      getDailyQuests(first.profile, date).map((quest) => [
        quest.id,
        quest.progress,
        quest.complete,
      ]),
    ).toEqual([
      ['finish', 1, true],
      ['score', 75, false],
      ['beam', 60, false],
    ])
    const second = recordRun(first.profile, run('two', { score: 75, beamTotal: 60 }))
    expect(second.shardsEarned).toBe(17 + 40)
    expect(second.profile.daily['2026-09-04']?.rewardedQuests).toEqual(['finish', 'beam'])
    const third = recordRun(second.profile, run('three', { score: 75, beamTotal: 60 }))
    expect(third.shardsEarned).toBe(17)
    expect(getDailyQuests(third.profile, date).find((quest) => quest.id === 'beam')?.progress).toBe(
      120,
    )
    expect(
      getDailyQuests(third.profile, new Date('2026-09-05T00:00:00Z')).every(
        (quest) => quest.progress === 0,
      ),
    ).toBe(true)
  })

  it('credits quests to the UTC completion day and keeps daily gifts independent', () => {
    const profile = claimDailyReward(createProfile(), new Date('2026-09-04T18:00:00Z')).profile
    const afterMidnight = recordRun(
      profile,
      run('one', { completedAt: '2026-09-05T00:00:00.000Z' }),
    ).profile
    expect(afterMidnight.daily['2026-09-04']?.runs).toBe(0)
    expect(afterMidnight.daily['2026-09-05']?.runs).toBe(1)
    expect(afterMidnight.daily['2026-09-05']?.rewardClaimed).toBe(false)
  })

  it('preserves personal bests when later runs score less or tie', () => {
    let profile = recordRun(createProfile(), run('one')).profile
    const tie = recordRun(profile, run('two'))
    expect(tie.isPersonalBest).toBe(false)
    profile = recordRun(tie.profile, run('three', { score: 50, beamTotal: 40 })).profile
    expect(profile.bestScore).toBe(90)
    expect(profile.bestBeam).toBe(40)
  })

  it.each([
    { score: -1 },
    { score: Number.NaN },
    { score: 3.5 },
    { beamTotal: 91 },
    { seed: -1 },
    { completedAt: '2026-02-30T00:00:00.000Z' },
    { id: '' },
  ])('rejects invalid results without mutating progression (%j)', (invalid) => {
    const profile = createProfile()
    expect(() => recordRun(profile, run('invalid', invalid))).toThrow('Invalid completed run')
    expect(profile).toEqual(createProfile())
  })
})

describe('cosmetic progression', () => {
  it('levels at exact boundaries and unlocks a free palette at level 3', () => {
    expect(getLevel(249)).toEqual({
      level: 1,
      currentXp: 249,
      requiredXp: 250,
      progress: 249 / 250,
    })
    expect(getLevel(250)).toEqual({ level: 2, currentXp: 0, requiredXp: 250, progress: 0 })
    expect(unlockedPalettes({ ...createProfile(), xp: 499 })).toEqual(['cathedral'])
    expect(unlockedPalettes({ ...createProfile(), xp: 500 })).toEqual(['cathedral', 'aurora'])
    expect(unlockedPalettes({ ...createProfile(), totalRuns: 10 })).toEqual(['cathedral', 'sunset'])
  })

  it('rejects locked selection and insufficient balance, then spends exactly once', () => {
    const original = createProfile()
    expect(selectPalette(original, 'aurora')).toBe(original)
    expect(purchasePalette(original, 'aurora').reason).toBe('insufficient-shards')
    const purchase = purchasePalette({ ...original, shards: 200 }, 'aurora')
    expect(purchase.purchased).toBe(true)
    expect(purchase.profile.shards).toBe(50)
    const equipped = selectPalette(purchase.profile, 'aurora')
    expect(equipped.selectedPalette).toBe('aurora')
    const duplicate = purchasePalette(equipped, 'aurora')
    expect(duplicate.reason).toBe('already-unlocked')
    expect(duplicate.profile).toBe(equipped)
    const storage = memoryStorage()
    expect(saveProfile(equipped, storage)).toBe(true)
    expect(loadProfile(storage)).toEqual(equipped)
  })

  it('never charges shards for a palette earned from play', () => {
    const profile = { ...createProfile(), xp: 500, shards: 500 }
    const result = purchasePalette(profile, 'aurora')
    expect(result.purchased).toBe(false)
    expect(result.profile.shards).toBe(500)
  })
})

describe('safe storage', () => {
  it.each([null, '', '{oops', 'null', '[]', '42', '{"version":99}', '{"version":1,"xp":-1}'])(
    'recovers from missing or corrupt saves (%s)',
    (raw) => {
      expect(loadProfile(memoryStorage(raw))).toEqual(createProfile())
    },
  )

  it('validates nested history, dates, achievements, and ledger consistency', () => {
    const valid = recordRun(createProfile(), run()).profile
    const corruptSaves = [
      { ...valid, daily: { '2026-02-30': valid.daily['2026-09-04'] } },
      { ...valid, history: [{ ...run(), score: 'ninety' }] },
      { ...valid, achievements: ['nonexistent'] },
      { ...valid, recordedRunIds: [] },
      { ...valid, selectedPalette: 'sunset' },
      { ...valid, history: [run(), run()] },
    ]
    for (const corrupt of corruptSaves) {
      expect(loadProfile(memoryStorage(JSON.stringify(corrupt)))).toEqual(createProfile())
    }
  })

  it('handles unavailable storage and quota errors without throwing', () => {
    const unavailable: StorageLike = {
      getItem() {
        throw new Error('SecurityError')
      },
      setItem() {
        throw new Error('QuotaExceededError')
      },
    }
    expect(loadProfile(unavailable)).toEqual(createProfile())
    expect(saveProfile(createProfile(), unavailable)).toBe(false)
  })
})
