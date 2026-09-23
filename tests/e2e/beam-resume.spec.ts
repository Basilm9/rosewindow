import { expect, test } from '@playwright/test'
import { bestPair, fastForward } from '../../src/dev/autoPlayer'

test('a deadlocked initial round recovers its beam and leaves the animation gate', async ({
  page,
}) => {
  const game = fastForward(1, 7)
  const entry = game.currentEntry
  expect(game.hasLegalMove()).toBe(false)
  game.forfeitRound()
  expect(game.hasLegalMove()).toBe(true)

  await page.goto('/?seed=1&round=7')
  await expect(page.getByTestId('beam-layer')).toBeVisible()
  await expect(page.getByTestId('entry-hint')).toContainText('The beam scores the window')
  await expect(
    page
      .getByTestId(`cell-r${entry.position.row}c${entry.position.col}`)
      .getByTestId('entry-arrow'),
  ).toHaveAttribute('aria-label', `beam enters heading ${entry.direction}`)
  await expect(page.getByTestId('beam-layer')).toHaveAttribute('data-settled', 'true', {
    timeout: 15000,
  })
  await expect(page.getByTestId('entry-hint')).toContainText('Pick your glass', { timeout: 5000 })
  await expect(page.getByTestId('round-indicator')).toHaveText('ROUND 8/8')
  await expect(page.getByTestId('beam-total')).toHaveText(String(game.totalScore))
  await expect(page.getByTestId('draft-die-0')).toBeEnabled()
})

test('resuming a held die preserves the board and animates the next completed round', async ({
  page,
}) => {
  await page.goto('/?seed=3')
  await page.getByTestId('pattern-lancet').click()
  await page.getByTestId('draft-die-0').click()
  await page.getByTestId('cell-r1c3').click()
  await page.getByTestId('draft-die-0').click()
  const selected = await page.getByTestId('draft-hint').textContent()
  const labels = await page
    .getByRole('gridcell')
    .evaluateAll((cells) => cells.map((cell) => cell.getAttribute('aria-label')))

  await page.goto('/') // reopening the game resumes the saved run
  await expect(page.getByTestId('draft-hint')).toHaveText(selected!)
  expect(
    await page
      .getByRole('gridcell')
      .evaluateAll((cells) => cells.map((cell) => cell.getAttribute('aria-label'))),
  ).toEqual(labels)
  await page.getByTestId('cell-r2c3').click()
  await expect(page.getByTestId('beam-layer')).toBeVisible()
  await expect(page.getByTestId('beam-layer')).toHaveAttribute('data-settled', 'true', {
    timeout: 15000,
  })
  await expect(page.getByTestId('round-indicator')).toHaveText('ROUND 2/8')
  await expect(page.getByTestId('beam-core')).toHaveAttribute('points', '86,38 86,62 86,86')
  await expect(page.getByTestId('beam-total')).toHaveText('12')
})

test('the final beam remains on the board before the result appears', async ({ page }) => {
  const game = fastForward(3, 8)
  const candidate = bestPair(game)!
  game.selectDie(candidate.die)
  game.placeDie(candidate.target)
  if (game.phase !== 'gameOver' && !game.hasLegalMove()) game.forfeitRound()
  expect(game.phase).toBe('gameOver')

  await page.goto('/?seed=3&round=8')
  await page
    .getByRole('button', {
      name: `select ${candidate.die.color} ${candidate.die.value}`,
      exact: true,
    })
    .first()
    .click()
  await page.getByTestId(`cell-r${candidate.target.row}c${candidate.target.col}`).click()
  await expect(page.getByTestId('beam-layer')).toBeVisible()
  await expect(page.getByTestId('game-over')).toHaveCount(0)
  await expect(page.getByTestId('entry-hint')).toContainText('The beam scores the window')
  await expect(page.getByTestId('game-over')).toBeVisible({ timeout: 15000 })
  await expect(page.getByTestId('final-total')).toHaveText(String(game.report!.total))
})
