import { expect, test } from '@playwright/test'

test('select a die, inspect the legal hover ghost, place it legally', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/?seed=3')
  await page.getByTestId('pattern-novice-rose').click()
  await expect(page.getByTestId('glass-board')).toBeVisible()

  // Seed 3, Novice Rose, first pool die is blue 2 — legal on the open border r0c0.
  await page.getByTestId('draft-die-0').click()
  await expect(page.getByTestId('draft-hint')).toContainText('In hand')

  await page.getByTestId('cell-r0c0').hover()
  await expect(page.getByTestId('ghost-r0c0')).toBeVisible()
  await expect(page.getByTestId('ghost-r0c0')).toHaveAttribute('data-legal', 'true')

  await page.getByTestId('cell-r0c0').click()
  await expect(page.getByTestId('die-r0c0')).toBeVisible()
  await expect(page.locator('[data-testid^="draft-die-"]')).toHaveCount(4)
  await expect(page.getByTestId('draft-hint')).toContainText('Select a die')
})

test('illegal placement shakes the cell, alerts, and keeps the die in hand', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/?seed=3')
  await page.getByTestId('pattern-novice-rose').click()
  await page.getByTestId('draft-die-0').click()

  await page.getByTestId('cell-r1c1').click() // interior: first-placement law
  await expect(page.getByTestId('rejection-hint')).toContainText('illegalFirstPlacement')
  await expect(page.getByTestId('cell-r1c1')).toHaveAttribute('data-rejected', 'true')
  await expect(page.getByTestId('draft-hint')).toContainText('In hand')
  await expect(page.getByTestId('die-r1c1')).toHaveCount(0)

  // The die is not consumed: a legal cell still accepts it.
  await page.getByTestId('cell-r0c0').click()
  await expect(page.getByTestId('die-r0c0')).toBeVisible()
})

test('hover ghost flags illegal cells and outlines offending neighbors (seeded mid-game)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/?seed=3&round=3') // Lancet: purple2@(0,1) yellow5@(1,0) red2@(2,1) purple3@(2,2)
  await expect(page.getByTestId('round-indicator')).toHaveText('Round 3 / 8')

  // Disconnected interior-ish cell is illegal for the first pool die (blue 1).
  await page.getByTestId('draft-die-0').click()
  await page.getByTestId('cell-r3c0').hover()
  await expect(page.getByTestId('ghost-r3c0')).toHaveAttribute('data-legal', 'false')

  // Red 3 (index 1 after blue 1 left the pool) at (1,1) would share red with
  // red 2 at (2,1): ghost illegal + the offending neighbor outlined.
  await page.getByTestId('draft-die-1').click()
  await page.getByTestId('cell-r1c1').hover()
  await expect(page.getByTestId('ghost-r1c1')).toHaveAttribute('data-legal', 'false')
  await expect(page.getByTestId('cell-r2c1')).toHaveAttribute('data-offending', 'true')
  await page.screenshot({ path: 'test-results/phase8-reject-hover.png', fullPage: true })
})

test('completing two placements advances the round with a fresh pool', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/?seed=3')
  await page.getByTestId('pattern-novice-rose').click()
  // Round 1: blue 2 -> r0c0, then yellow 5 (now draft-die-0) -> r0c1 (touches r0c0,
  // different color and value). r0c2 would be disconnected and must be rejected.
  await page.getByTestId('draft-die-0').click()
  await page.getByTestId('cell-r0c0').click()
  await expect(page.getByTestId('die-r0c0')).toBeVisible()
  await page.getByTestId('draft-die-0').click()
  await page.getByTestId('cell-r0c2').click()
  await expect(page.getByTestId('rejection-hint')).toContainText('disconnectedPlacement')
  await page.getByTestId('cell-r0c1').click()
  await expect(page.getByTestId('die-r0c1')).toBeVisible()
  await expect(page.getByTestId('round-indicator')).toHaveText('Round 2 / 8')
  await expect(page.locator('[data-testid^="draft-die-"]')).toHaveCount(5)
  await expect(page.getByTestId('round-scores')).toContainText('R1:')
})
