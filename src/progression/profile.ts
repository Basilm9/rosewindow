/** Local-only progression. All reward calculations are pure and dates are injected. */
export const PROFILE_STORAGE_KEY = 'rose-window.profile.v1'
const PROFILE_VERSION = 1 as const
const DAY_MS = 86_400_000

export type RunMode = 'free' | 'daily' | 'challenge'
export type PaletteId = 'cathedral' | 'aurora' | 'sunset'
export type AchievementId = 'first-light' | 'golden-hour' | 'beam-master' | 'glass-artist'
export type QuestId = 'finish' | 'score' | 'beam'

export interface RunResult {
  readonly id: string
  readonly seed: number
  readonly patternId: string
  readonly mode: RunMode
  readonly score: number
  readonly beamTotal: number
  /** ISO timestamp, supplied by the caller when the game actually finishes. */
  readonly completedAt: string
}

export interface DailyProgress {
  readonly runs: number
  readonly bestScore: number
  readonly beamTotal: number
  readonly rewardClaimed: boolean
  readonly rewardedQuests: readonly QuestId[]
}

export interface PlayerProfile {
  readonly version: typeof PROFILE_VERSION
  readonly xp: number
  readonly shards: number
  readonly selectedPalette: PaletteId
  readonly purchasedPalettes: readonly PaletteId[]
  readonly bestScore: number
  readonly bestBeam: number
  readonly totalRuns: number
  readonly history: readonly RunResult[]
  /** Kept independently of bounded history: old run IDs must never earn twice. */
  readonly recordedRunIds: readonly string[]
  readonly achievements: readonly AchievementId[]
  readonly daily: Readonly<Record<string, DailyProgress>>
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const ACHIEVEMENTS: readonly {
  id: AchievementId
  title: string
  description: string
  shards: number
}[] = [
  { id: 'first-light', title: 'First light', description: 'Finish your first window', shards: 25 },
  {
    id: 'golden-hour',
    title: 'Golden hour',
    description: 'Score 90 points in one run',
    shards: 40,
  },
  {
    id: 'beam-master',
    title: 'Light architect',
    description: 'Earn 100 beam points in one run',
    shards: 60,
  },
  { id: 'glass-artist', title: 'Glass artist', description: 'Finish 10 windows', shards: 75 },
]

export const PALETTES: readonly {
  id: PaletteId
  name: string
  description: string
  requirement: string
  cost: number
}[] = [
  {
    id: 'cathedral',
    name: 'Cathedral',
    description: 'Jewel glass & warm gold',
    requirement: 'Always available',
    cost: 0,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Northern lights & cool silver',
    requirement: 'Reach level 3 or spend 150 shards',
    cost: 150,
  },
  {
    id: 'sunset',
    name: 'Golden hour',
    description: 'Rose skies & molten copper',
    requirement: 'Finish 10 windows or spend 300 shards',
    cost: 300,
  },
]

const QUESTS: readonly { id: QuestId; title: string; target: number; reward: number }[] = [
  { id: 'finish', title: 'Finish a window', target: 1, reward: 20 },
  { id: 'score', title: 'Score 80 in one run', target: 80, reward: 30 },
  { id: 'beam', title: 'Collect 120 beam points', target: 120, reward: 40 },
]

export interface DailyQuest {
  readonly id: QuestId
  readonly title: string
  readonly target: number
  readonly reward: number
  readonly progress: number
  readonly complete: boolean
}

function emptyDay(): DailyProgress {
  return { runs: 0, bestScore: 0, beamTotal: 0, rewardClaimed: false, rewardedQuests: [] }
}

/** A clean save; constructing it does not read the clock or browser storage. */
export function createProfile(): PlayerProfile {
  return {
    version: PROFILE_VERSION,
    xp: 0,
    shards: 0,
    selectedPalette: 'cathedral',
    purchasedPalettes: [],
    bestScore: 0,
    bestBeam: 0,
    totalRuns: 0,
    history: [],
    recordedRunIds: [],
    achievements: [],
    daily: {},
  }
}

/** UTC day shared by every player, independent of their local timezone. */
export function dailyKey(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new Error('A valid date is required')
  return date.toISOString().slice(0, 10)
}

/** Stable unsigned 32-bit FNV-1a hash for an explicitly supplied UTC date. */
export function dailySeed(date: Date): number {
  let hash = 2166136261
  for (const character of `rose-window:daily:v1:${dailyKey(date)}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Fixed 250-XP levels keep progress easy to understand and rewards predictable. */
export function getLevel(xp: number): {
  level: number
  currentXp: number
  requiredXp: number
  progress: number
} {
  const safeXp = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0
  return {
    level: Math.floor(safeXp / 250) + 1,
    currentXp: safeXp % 250,
    requiredXp: 250,
    progress: (safeXp % 250) / 250,
  }
}

/** Claim exactly once per UTC day; rewards never depend on an unbroken streak. */
export function claimDailyReward(
  profile: PlayerProfile,
  date: Date,
): { profile: PlayerProfile; claimed: boolean; shards: number } {
  const key = dailyKey(date)
  const day = profile.daily[key] ?? emptyDay()
  if (day.rewardClaimed) return { profile, claimed: false, shards: 0 }
  return {
    profile: {
      ...profile,
      shards: profile.shards + 50,
      daily: { ...profile.daily, [key]: { ...day, rewardClaimed: true } },
    },
    claimed: true,
    shards: 50,
  }
}

/** Consecutive claimed days ending today, or yesterday before today's claim. */
export function getStreak(profile: PlayerProfile, date: Date): number {
  let cursor = new Date(`${dailyKey(date)}T00:00:00.000Z`).getTime()
  if (!profile.daily[dailyKey(new Date(cursor))]?.rewardClaimed) cursor -= DAY_MS
  let streak = 0
  while (profile.daily[dailyKey(new Date(cursor))]?.rewardClaimed) {
    streak += 1
    cursor -= DAY_MS
  }
  return streak
}

/** Quests count all completed play modes. Completion automatically grants shards. */
export function getDailyQuests(profile: PlayerProfile, date: Date): readonly DailyQuest[] {
  const day = profile.daily[dailyKey(date)] ?? emptyDay()
  return QUESTS.map((quest) => {
    const actual =
      quest.id === 'finish' ? day.runs : quest.id === 'score' ? day.bestScore : day.beamTotal
    return { ...quest, progress: Math.min(quest.target, actual), complete: actual >= quest.target }
  })
}

/** Record a finished run once, including automatic daily quests and achievements. */
export function recordRun(
  profile: PlayerProfile,
  result: RunResult,
): {
  profile: PlayerProfile
  recorded: boolean
  xpEarned: number
  shardsEarned: number
  newAchievements: readonly AchievementId[]
  isPersonalBest: boolean
} {
  if (!isRunResult(result)) throw new Error('Invalid completed run')
  const unchanged = {
    profile,
    recorded: false,
    xpEarned: 0,
    shardsEarned: 0,
    newAchievements: [],
    isPersonalBest: false,
  }
  if (profile.recordedRunIds.includes(result.id)) return unchanged
  const key = dailyKey(new Date(result.completedAt))
  const oldDay = profile.daily[key] ?? emptyDay()
  const nextDay: DailyProgress = {
    ...oldDay,
    runs: oldDay.runs + 1,
    bestScore: Math.max(oldDay.bestScore, result.score),
    beamTotal: oldDay.beamTotal + result.beamTotal,
  }
  const totalRuns = profile.totalRuns + 1
  const bestScore = Math.max(profile.bestScore, result.score)
  const bestBeam = Math.max(profile.bestBeam, result.beamTotal)
  const achieved: Readonly<Record<AchievementId, boolean>> = {
    'first-light': totalRuns >= 1,
    'golden-hour': bestScore >= 90,
    'beam-master': bestBeam >= 100,
    'glass-artist': totalRuns >= 10,
  }
  const newAchievements = ACHIEVEMENTS.filter(
    (a) => achieved[a.id] && !profile.achievements.includes(a.id),
  )
  const questProfile = { ...profile, daily: { ...profile.daily, [key]: nextDay } }
  const completedQuests = getDailyQuests(questProfile, new Date(result.completedAt)).filter(
    (quest) => quest.complete && !oldDay.rewardedQuests.includes(quest.id),
  )
  const xpEarned = 50 + Math.floor(Math.min(result.score, 300) / 2)
  const shardsEarned =
    10 +
    Math.min(30, Math.floor(result.score / 10)) +
    newAchievements.reduce((sum, achievement) => sum + achievement.shards, 0) +
    completedQuests.reduce((sum, quest) => sum + quest.reward, 0)
  return {
    profile: {
      ...profile,
      xp: profile.xp + xpEarned,
      shards: profile.shards + shardsEarned,
      bestScore,
      bestBeam,
      totalRuns,
      history: [result, ...profile.history].slice(0, 30),
      recordedRunIds: [...profile.recordedRunIds, result.id],
      achievements: [...profile.achievements, ...newAchievements.map((a) => a.id)],
      daily: {
        ...profile.daily,
        [key]: {
          ...nextDay,
          rewardedQuests: [...oldDay.rewardedQuests, ...completedQuests.map((quest) => quest.id)],
        },
      },
    },
    recorded: true,
    xpEarned,
    shardsEarned,
    newAchievements: newAchievements.map((achievement) => achievement.id),
    isPersonalBest: profile.totalRuns === 0 || result.score > profile.bestScore,
  }
}

/** Cosmetic unlocks do not modify dice, seeds, scoring, or access to play. */
export function unlockedPalettes(profile: PlayerProfile): readonly PaletteId[] {
  return PALETTES.filter(
    (palette) =>
      palette.id === 'cathedral' ||
      profile.purchasedPalettes.includes(palette.id) ||
      (palette.id === 'aurora' && getLevel(profile.xp).level >= 3) ||
      (palette.id === 'sunset' && profile.totalRuns >= 10),
  ).map((palette) => palette.id)
}

/** Ignore attempts to equip a locked cosmetic. */
export function selectPalette(profile: PlayerProfile, id: PaletteId): PlayerProfile {
  return unlockedPalettes(profile).includes(id) ? { ...profile, selectedPalette: id } : profile
}

/** Spend earned shards on an optional early cosmetic unlock, once per palette. */
export function purchasePalette(
  profile: PlayerProfile,
  id: PaletteId,
): {
  profile: PlayerProfile
  purchased: boolean
  reason: 'purchased' | 'already-unlocked' | 'insufficient-shards' | 'unknown-palette'
} {
  const palette = PALETTES.find((candidate) => candidate.id === id)
  if (!palette) return { profile, purchased: false, reason: 'unknown-palette' }
  if (unlockedPalettes(profile).includes(id))
    return { profile, purchased: false, reason: 'already-unlocked' }
  if (profile.shards < palette.cost)
    return { profile, purchased: false, reason: 'insufficient-shards' }
  return {
    profile: {
      ...profile,
      shards: profile.shards - palette.cost,
      purchasedPalettes: [...profile.purchasedPalettes, id],
    },
    purchased: true,
    reason: 'purchased',
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCount(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value)
}

function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && dailyKey(date) === value
}

function isRunResult(value: unknown): value is RunResult {
  return (
    isObject(value) &&
    isId(value.id) &&
    isCount(value.seed, 0xffffffff) &&
    isId(value.patternId) &&
    (value.mode === 'free' || value.mode === 'daily' || value.mode === 'challenge') &&
    isCount(value.score, 1_000_000) &&
    isCount(value.beamTotal, 1_000_000) &&
    value.beamTotal <= value.score &&
    typeof value.completedAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.completedAt) &&
    Number.isFinite(new Date(value.completedAt).getTime()) &&
    new Date(value.completedAt).toISOString() === value.completedAt
  )
}

function isUniqueArray<T>(value: unknown, valid: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(valid) && new Set(value).size === value.length
}

function isDailyProgress(value: unknown): value is DailyProgress {
  return (
    isObject(value) &&
    isCount(value.runs) &&
    isCount(value.bestScore) &&
    isCount(value.beamTotal) &&
    typeof value.rewardClaimed === 'boolean' &&
    isUniqueArray(value.rewardedQuests, (id): id is QuestId =>
      QUESTS.some((quest) => quest.id === id),
    )
  )
}

function isProfile(value: unknown): value is PlayerProfile {
  if (
    !isObject(value) ||
    value.version !== PROFILE_VERSION ||
    !isCount(value.xp) ||
    !isCount(value.shards) ||
    !isCount(value.bestScore) ||
    !isCount(value.bestBeam) ||
    !isCount(value.totalRuns) ||
    !PALETTES.some((palette) => palette.id === value.selectedPalette) ||
    !isUniqueArray(value.purchasedPalettes, (id): id is PaletteId =>
      PALETTES.some((palette) => palette.id === id),
    ) ||
    !isUniqueArray(value.recordedRunIds, isId) ||
    !isUniqueArray(value.achievements, (id): id is AchievementId =>
      ACHIEVEMENTS.some((a) => a.id === id),
    ) ||
    !Array.isArray(value.history) ||
    value.history.length > 30 ||
    !value.history.every(isRunResult) ||
    !isObject(value.daily) ||
    !Object.entries(value.daily).every(([key, day]) => isDateKey(key) && isDailyProgress(day))
  )
    return false
  const profile = value as unknown as PlayerProfile
  return (
    profile.recordedRunIds.length === profile.totalRuns &&
    new Set(profile.history.map((run) => run.id)).size === profile.history.length &&
    profile.history.every((run) => profile.recordedRunIds.includes(run.id)) &&
    unlockedPalettes(profile).includes(profile.selectedPalette)
  )
}

/** Missing, corrupt, unsupported, or unavailable storage yields a usable fresh profile. */
export function loadProfile(storage?: Pick<StorageLike, 'getItem'>): PlayerProfile {
  try {
    const raw = (storage ?? globalThis.localStorage).getItem(PROFILE_STORAGE_KEY)
    if (raw === null) return createProfile()
    const value: unknown = JSON.parse(raw)
    return isProfile(value) ? value : createProfile()
  } catch {
    return createProfile()
  }
}

/** Return false for blocked storage/quota errors so the UI can keep session progress. */
export function saveProfile(
  profile: PlayerProfile,
  storage?: Pick<StorageLike, 'setItem'>,
): boolean {
  try {
    if (!isProfile(profile)) return false
    ;(storage ?? globalThis.localStorage).setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
    return true
  } catch {
    return false
  }
}
