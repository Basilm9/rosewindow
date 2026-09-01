import { expect, test } from '@playwright/test'

test('setup screen offers two patterns; choosing one renders the board', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/?seed=3')
  await expect(page.getByTestId('pattern-novice-rose')).toBeVisible()
  await expect(page.locator('[data-testid^="pattern-"]')).toHaveCount(2)
  await page.screenshot({ path: 'test-results/phase7-setup.png', fullPage: true })

  await page.getByTestId('pattern-novice-rose').click()
  await expect(page.getByTestId('glass-board')).toBeVisible()
  await expect(page.getByRole('gridcell')).toHaveCount(16)
  await expect(page.locator('[data-testid^="draft-die-"]')).toHaveCount(5)
  await expect(page.locator('[data-testid^="objective-"]')).toHaveCount(4)
  await expect(page.getByTestId('round-indicator')).toHaveText('ROUND 1/8')
  // Novice Rose prints a value demand of 5 at r0c2 and a yellow demand at r2c0.
  await expect(page.getByTestId('cell-r0c2')).toContainText('5')
  await expect(page.getByTestId('entry-arrow')).toBeVisible()
  await page.screenshot({ path: 'test-results/phase7-board.png', fullPage: true })
})

test('seeded fast-forward renders a deterministic mid-game state', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const readCellLabels = async (): Promise<string[]> =>
    page.locator('[role="gridcell"]').evaluateAll((els) =>
      els.map((e) => e.getAttribute('aria-label') ?? ''),
    )

  await page.goto('/?seed=3&round=3')
  await expect(page.getByTestId('glass-board')).toBeVisible()
  await expect(page.getByTestId('round-indicator')).toHaveText('ROUND 3/8')
  // Rounds 1 and 2 placed two dice each.
  const placed = page.locator('[role="gridcell"][aria-label*=" die"]')
  await expect(placed).toHaveCount(4)
  const firstRun = await readCellLabels()

  // Determinism: the same seed must produce the identical a11y description.
  await page.goto('/?seed=3&round=3')
  await expect(page.getByTestId('glass-board')).toBeVisible()
  expect(await readCellLabels()).toEqual(firstRun)
  await page.screenshot({ path: 'test-results/phase7-midgame.png', fullPage: true })
})

test('a finished seeded run renders the report with tier', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/?seed=3&round=9')
  await expect(page.getByTestId('game-over')).toBeVisible()
  await expect(page.getByTestId('final-total')).toHaveText('111')
  await expect(page.getByTestId('final-tier')).toHaveText('gold')
  await expect(page.locator('[data-testid^="objective-"]')).toHaveCount(0)
  await expect(page.locator('[data-testid="score-lines"] > div')).toHaveCount(5)
  await page.screenshot({ path: 'test-results/phase7-gameover.png', fullPage: true })
})
