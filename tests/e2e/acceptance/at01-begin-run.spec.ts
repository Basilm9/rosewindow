import { expect, test } from '@playwright/test'
import { ShotLog, freshPage, logFailure, logResult, settledBoard } from './harness'
import { announcedEntry, replicaFor } from './model'
import type { CellConstraint } from './model'

/** The title of a small pane on a pattern card. */
function cardTitle(constraint: CellConstraint): string {
  if (constraint.kind === 'color') return `needs ${constraint.color}`
  return constraint.kind === 'value' ? `needs a ${constraint.value}` : 'anything goes'
}

/** The title of a pane on the board. */
function paneTitle(constraint: CellConstraint): string {
  if (constraint.kind === 'color') return `requires ${constraint.color} glass`
  return constraint.kind === 'value' ? `requires value ${constraint.value}` : 'any color or value'
}

let shots: ShotLog
let urls: string[] = []
test.afterEach(() => logFailure('AT-01', () => ({ urls, shots })))

/** AT-01: FR-1.1 to 1.3, 1.5; FR-5.1; FR-7.1, 7.4, 7.5. */
test('AT-01 begin a run at a chosen seed', async ({ browser }) => {
  shots = new ShotLog('AT01')
  const opened = await freshPage(browser)
  const page = opened.page
  urls = opened.urls
  const replica = replicaFor(3, 'novice-rose')

  await test.step('two different patterns, each with all of its demands', async () => {
    await page.goto('/?seed=3')
    const cards = page.getByTestId('patterns-offered').locator('[data-testid^="pattern-"]')
    await expect(cards).toHaveCount(2)
    const ids = await cards.evaluateAll((all) => all.map((card) => card.getAttribute('data-testid')))
    expect(ids).toEqual(replica.offeredPatterns.map((pattern) => `pattern-${pattern.id}`))
    expect(new Set(ids).size).toBe(2)
    for (const pattern of replica.offeredPatterns) {
      const card = page.getByTestId(`pattern-${pattern.id}`)
      await expect(card.locator('.pick-card__name')).toHaveText(pattern.name)
      await expect(card.locator('.pick-card__desc')).toBeVisible()
      await expect(card.locator('.pick-card__desc')).toHaveText(pattern.description)
      const panes = card.getByLabel(`${pattern.name} layout`).locator('.mini-cell')
      await expect(panes).toHaveCount(16)
      expect(
        await panes.evaluateAll((all) => all.map((pane) => pane.getAttribute('title'))),
      ).toEqual(pattern.constraints.flat().map(cardTitle))
    }
    await expect(page.getByText('Window #3')).toBeVisible()
    await expect(page.getByTestId('tutorial-card')).toHaveCount(0)
    await shots.take(page, 'setup', 'setup')
  })

  await test.step('the chosen window, round 1, with its draft and announced beam', async () => {
    await page.getByTestId('pattern-novice-rose').click()
    await expect(settledBoard(page)).toBeVisible()
    await expect(page.getByTestId('glass-board')).toHaveAttribute(
      'aria-label',
      'Glass window pattern: Novice Rose',
    )
    expect(
      await page
        .getByRole('gridcell')
        .evaluateAll((all) => all.map((cell) => cell.getAttribute('title'))),
    ).toEqual(replica.window!.constraints.flat().map(paneTitle))
    await expect(page.getByTestId('round-indicator')).toHaveText('ROUND 1/8')
    await expect(page.getByLabel('2 left to place this round')).toBeVisible()
    await expect(page.locator('[data-testid^="draft-die-"]')).toHaveCount(5)
    await expect(page.getByTestId('refresh-dice')).toHaveAttribute(
      'aria-label',
      'Reroll dice, 1 left',
    )
    const entry = announcedEntry(replica)
    await expect(
      page.getByTestId(`cell-r${entry.row}c${entry.col}`).getByTestId('entry-arrow'),
    ).toHaveAttribute('aria-label', `beam enters heading ${entry.direction}`)
    // The "Round 1" ribbon crosses the board for 1.5 s; the mockup is the board without it.
    await expect(page.locator('.ribbon')).toHaveCount(0)
    await shots.take(page, 'board', 'board')
  })

  await test.step('the pause menu names the run', async () => {
    await page.getByTestId('game-menu').click()
    await expect(page.getByTestId('pause-menu')).toContainText('Free play · Novice Rose · window #3')
    await shots.take(page, 'pause', 'pause')
  })

  logResult({
    at: 'AT-01',
    urls,
    shots,
    notes: 'Screenshots to be compared with their mockups by a person under the policy above.',
  })
  await page.context().close()
})
