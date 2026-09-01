import { expect, test } from '@playwright/test'

test('board renders with 16 cells', async ({ page }) => {
  await page.goto('/')
  const board = page.getByTestId('glass-board')
  await expect(board).toBeVisible()
  const cells = page.getByRole('gridcell')
  await expect(cells).toHaveCount(16)
  await expect(page.getByRole('heading', { name: 'Rose Window' })).toBeVisible()
})
