import { expect, test } from '@playwright/test'

test('round-1 beam animates, strikes dice, floats scores, and gates the round', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/?seed=3')
  await page.getByTestId('pattern-lancet').click()
  await expect(page.getByTestId('glass-board')).toBeVisible()

  // Deterministic setup (seed 3, Lancet): blue 2 at the entry cell (1,3), yellow 5
  // at (2,3). The beam enters (1,3) heading west: blue 2 strikes (+2, cool -> CCW
  // south, multiplier -> 2, lockout 1); yellow 5 is LOCKED (no bend) but still
  // scores 5 x 2 = +10; then the beam exits south through (3,3).
  await page.getByTestId('draft-die-0').click()
  await page.getByTestId('cell-r1c3').click()
  await page.getByTestId('draft-die-0').click()
  await page.getByTestId('cell-r2c3').click()

  // The machine gates in illuminate while the beam animates.
  await expect(page.getByTestId('beam-layer')).toBeVisible()
  await expect(page.getByTestId('entry-hint')).toContainText('the beam scores the window', {
    ignoreCase: true,
  })
  await expect(page.locator('[data-testid^="score-float-"]')).toHaveCount(2, { timeout: 5000 })
  await expect(page.getByTestId('score-float-1')).toContainText('+2')
  await expect(page.getByTestId('score-float-2')).toContainText('+10')
  await expect(page.getByTestId('score-float-2')).toContainText('×2')

  // Struck glass settles lit (full saturation).
  await expect(page.getByTestId('die-r1c3')).toHaveClass(/saturate-100/, { timeout: 5000 })
  await expect(page.getByTestId('die-r2c3')).toHaveClass(/saturate-100/)

  // The animation completes and dispatches BEAM_ANIMATION_DONE: round 2 begins.
  await expect(page.getByTestId('round-indicator')).toHaveText('Round 2 / 8', { timeout: 5000 })
  await expect(page.getByTestId('round-scores')).toContainText('R1: 12')
  // The settled beam dims to a persistent glow holding the full walked path.
  await expect(page.getByTestId('beam-layer')).toHaveClass(/opacity-40/)
  await expect(page.getByTestId('beam-core')).toHaveAttribute('points', '86,38 86,62 86,86')
  await page.screenshot({ path: 'test-results/phase9-beam.png', fullPage: true })
})

test('sound toggle persists and toggles', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/?seed=3')
  await page.getByTestId('pattern-lancet').click()
  const toggle = page.getByTestId('sound-toggle')
  await expect(toggle).toHaveText('🔊')
  await toggle.click()
  await expect(toggle).toHaveText('🔇')
  await page.reload()
  await page.getByTestId('pattern-lancet').click()
  await expect(page.getByTestId('sound-toggle')).toHaveText('🔇')
})
