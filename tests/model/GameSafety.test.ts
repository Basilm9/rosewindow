/**
 * Test-design criterion: PROPERTY CHECKS over the input domain of seeds 1–100 (NFR-1.8 sample),
 * one `it.each` row per seed. Every run uses the max-flex auto-player on offeredPatterns[0]
 * (see tests/helpers/safety.ts); a fresh Game per row. NFR-6.5 (paused) is the controller's:
 * prompt 51.
 * Cases:
 *  NFR-6.1  rejectedPlacementAudit(seed): windowChanged 0 and handChanged 0 (100 rows), plus one
 *           aggregate test: the union of rejection kinds over seeds 1–100 is exactly the five
 *           reachable laws {cellOccupied, constraintMismatch, adjacencyViolation,
 *           illegalFirstPlacement, disconnectedPlacement} (dieNotInPool cannot reach placeDie:
 *           Game checks the held die only).
 *  NFR-6.2  beamStopAuditForSeed(seed): repeats 0, badEndings 0, longest <= 64 (100 rows)
 *  NFR-6.3  runningTotalDrift(seed) equals [0,0,0,0,0,0,0,0] (100 rows)
 *  NFR-6.4  recastCounters(seed): after equals before for round, placementsRemaining,
 *           roundScores, totalScore, placedCount; after.refreshesRemaining 0; roundsPlayed 8
 *           (FR-6.6) (100 rows)
 * Error kinds: none raised by the properties themselves; rejection kinds are collected by the
 * NFR-6.1 audit and asserted in the aggregate test.
 */
import { describe, expect, it } from 'vitest'
import {
  beamStopAuditForSeed,
  recastCounters,
  rejectedPlacementAudit,
  runningTotalDrift,
} from '../helpers/safety'

/** Seeds 1–100, the NFR-1.8 sample used here. */
const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1)

/** The five placement laws reachable through Game.placeDie. */
const REACHABLE_KINDS = [
  'adjacencyViolation',
  'cellOccupied',
  'constraintMismatch',
  'disconnectedPlacement',
  'illegalFirstPlacement',
]

describe('NFR-6.1 a rejected placement never changes the window', () => {
  it.each(SEEDS)('NFR-6.1 seed %i: no rejected placement changes the window or the hand', (seed) => {
    const audit = rejectedPlacementAudit(seed)
    expect(audit.windowChanged).toBe(0)
    expect(audit.handChanged).toBe(0)
  })

  it('NFR-6.1 aggregate: seeds 1–100 reject with exactly the five reachable laws', () => {
    const kinds = new Set(SEEDS.flatMap((seed) => [...rejectedPlacementAudit(seed).kinds]))
    expect([...kinds].sort()).toEqual(REACHABLE_KINDS)
  })
})

describe('NFR-6.2 the beam always stops', () => {
  it.each(SEEDS)('NFR-6.2 seed %i: no repeated (cell, direction), known endings, longest <= 64', (seed) => {
    const audit = beamStopAuditForSeed(seed)
    expect(audit.repeats).toBe(0)
    expect(audit.badEndings).toBe(0)
    expect(audit.longest).toBeLessThanOrEqual(64)
  })
})

describe('NFR-6.3 the running total equals the sum of round scores', () => {
  it.each(SEEDS)('NFR-6.3 seed %i: zero drift at every roundScored', (seed) => {
    expect(runningTotalDrift(seed)).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
  })
})

describe('NFR-6.4 a recast never grants a placement, round or point', () => {
  it.each(SEEDS)('NFR-6.4 seed %i: counters unchanged by a recast after the first placement', (seed) => {
    const { before, after, roundsPlayed } = recastCounters(seed)
    expect(after.round).toBe(before.round)
    expect(after.placementsRemaining).toBe(before.placementsRemaining)
    expect(after.roundScores).toEqual(before.roundScores)
    expect(after.totalScore).toBe(before.totalScore)
    expect(after.placedCount).toBe(before.placedCount)
    expect(before.refreshesRemaining).toBe(1)
    expect(after.refreshesRemaining).toBe(0)
    expect(roundsPlayed).toBe(8)
  })
})
