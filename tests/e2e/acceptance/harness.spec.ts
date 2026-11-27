import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import {
  MOCKUP,
  MOCKUP_POLICY,
  ShotLog,
  freshPage,
  logResult,
  nextFaultId,
  playMoves,
  runningAnimations,
  startSeeded,
} from './harness'
import { replicaFor } from './model'

/**
 * Checks of the harness itself (prompt 62, isolation protocol). They write only to their own
 * output folder and log no acceptance result.
 * Criterion: one case per harness function, plus isolation of storage between two tests.
 */
test.describe('acceptance harness', () => {
  test('H1 startSeeded opens the seeded board with no tutorial', async ({ browser }) => {
    const { page, urls } = await freshPage(browser)
    await startSeeded(page, 3, 'novice-rose')
    await expect(page.getByTestId('glass-board')).toHaveAttribute(
      'aria-label',
      'Glass window pattern: Novice Rose',
    )
    await expect(page.getByTestId('tutorial-card')).toHaveCount(0)
    expect(page.viewportSize()).toEqual({ width: 1280, height: 900 })
    expect(urls[0]).toBe('/?seed=3')
    await page.context().close()
  })

  test('H2 ShotLog numbers its files and never overwrites one', async ({ browser }, info) => {
    const { page } = await freshPage(browser)
    await page.goto('/?seed=3')
    const shots = new ShotLog('AT00', info.outputDir)
    const first = await shots.take(page, 'setup', 'setup')
    const second = await shots.take(page, 'setup', null)
    expect(first).not.toBe(second)
    expect([existsSync(first), existsSync(second)]).toEqual([true, true])
    expect(shots.describe()).toBe('AT00/01-setup.png → 01-setup.png<br>AT00/02-setup.png')
    await page.context().close()
  })

  test('H3 playMoves plays round 1 of the golden game and the scores agree', async ({ browser }) => {
    const { page } = await freshPage(browser)
    await startSeeded(page, 3, 'novice-rose')
    const replica = replicaFor(3, 'novice-rose')
    await playMoves(page, replica, 2)
    expect(replica.roundScores).toEqual([5])
    await expect(page.getByLabel('round 1 scored 5')).toBeVisible()
    await expect(page.getByTestId('round-indicator')).toHaveText('ROUND 2/8')
    await page.context().close()
  })

  test('H4 playMoves follows a round the page forfeits by itself', async ({ browser }) => {
    test.setTimeout(120_000)
    const { page } = await freshPage(browser)
    await startSeeded(page, 7, 'clerestory')
    const replica = replicaFor(7, 'clerestory')
    const blueOne = replica.draftPool.dice.find((die) => die.color === 'blue' && die.value === 1)!
    const corner = { die: blueOne, target: { row: 3, col: 3 } }
    await playMoves(page, replica, 2, { pick: () => corner })
    expect(replica.roundScores).toEqual([0])
    await expect(page.getByTestId('round-indicator')).toHaveText('ROUND 2/8')
    await page.context().close()
  })

  test('H5 each page starts with empty storage', async ({ browser }) => {
    const first = await freshPage(browser)
    await startSeeded(first.page, 3, 'novice-rose')
    await first.page.evaluate(() => localStorage.setItem('harness-probe', '1'))
    const second = await freshPage(browser)
    await second.page.goto('/?seed=3')
    expect(await second.page.evaluate(() => localStorage.getItem('harness-probe'))).toBeNull()
    await first.page.context().close()
    await second.page.context().close()
  })

  // eslint-disable-next-line no-empty-pattern -- Playwright requires the fixtures argument
  test('H6 logResult writes the policy once and numbers faults after F-04', ({}, info) => {
    const root = join(info.outputDir, 'results')
    logResult({ at: 'AT-00', urls: ['/?seed=3'], notes: 'a | b' }, root)
    logResult({ at: 'AT-00', result: 'Fail', urls: ['/'] }, root)
    logResult({ at: 'AT-00', result: 'Fail', urls: ['/'] }, root)
    const text = readFileSync(join(root, 'results.md'), 'utf8')
    expect(text.split(MOCKUP_POLICY)).toHaveLength(2)
    expect(text).toContain('| Pass |  | `/?seed=3` |  | a \\| b |')
    expect(text).toContain('| Fail | F-05 |')
    expect(text).toContain('| Fail | F-06 |')
    expect(nextFaultId('')).toBe('F-05')
  })

  test('H8 a screenshot waits for entrance animations, unless told not to', async ({
    browser,
  }, info) => {
    const { page } = await freshPage(browser)
    const shots = new ShotLog('AT00', info.outputDir)
    await page.goto('/?seed=3')
    await expect(page.getByTestId('pattern-novice-rose')).toBeVisible()
    expect(await runningAnimations(page)).toBeGreaterThan(0)
    await shots.take(page, 'moving', 'setup', { settle: false })
    expect(await runningAnimations(page)).toBeGreaterThan(0)
    await shots.take(page, 'still', 'setup')
    expect(await runningAnimations(page)).toBe(0)
    await page.context().close()
  })

  test('H7 every mockup the harness names exists', () => {
    const missing = Object.values(MOCKUP).filter((file) => !existsSync(join('ctxt/mockups', file)))
    expect(missing).toEqual([])
  })
})
