import { expect, test } from '@playwright/test'

test('board renders with 16 cells after choosing a pattern', async ({ page }) => {
  await page.goto('/?seed=3')
  await page.getByTestId('pattern-novice-rose').click()
  await expect(page.getByTestId('glass-board')).toBeVisible()
  await expect(page.getByRole('gridcell')).toHaveCount(16)
  await expect(page.getByRole('heading', { name: 'Rose Window' })).toBeVisible()
})
