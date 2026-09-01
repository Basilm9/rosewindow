import { expect, test } from '@playwright/test'

test('first-run tutorial walks through draft, place, and the rules', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/') // organic visit: no seed → tutorial appears

  // Step 1 (setup screen): welcome card waits for the pattern choice
  await expect(page.getByTestId('tutorial-card')).toContainText('Welcome, glazier')
  await expect(page.getByTestId('tutorial-card')).toContainText('1/6')
  await page.getByTestId('pattern-novice-rose').click()

  // Step 2: draft instruction auto-advanced with the pattern choice
  await expect(page.getByTestId('tutorial-card')).toContainText('Draft a die')
  await expect(page.getByTestId('tutorial-card')).toContainText('2/6')
  await page.getByTestId('draft-die-0').click()

  // Step 3: placement instruction auto-advanced with the selection
  await expect(page.getByTestId('tutorial-card')).toContainText('Place it')
  await page.getByTestId('cell-r0c0').click()

  // Step 4: post-placement jump straight to the beam rules
  await expect(page.getByTestId('tutorial-card')).toContainText('The beam')
  await expect(page.getByTestId('tutorial-card')).toContainText('4/6')
  await page.getByTestId('tutorial-next').click()
  await expect(page.getByTestId('tutorial-card')).toContainText('Lockout')
  await page.getByTestId('tutorial-next').click()
  await expect(page.getByTestId('tutorial-card')).toContainText('Objectives')
  await page.getByTestId('tutorial-next').click()

  // Finished: card gone, and it never comes back on reload
  await expect(page.getByTestId('tutorial-card')).toHaveCount(0)
  await page.reload()
  await page.getByTestId('pattern-novice-rose').click()
  await expect(page.getByTestId('tutorial-card')).toHaveCount(0)
})

test('?tutorial=1 forces the tutorial and skip dismisses it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/?tutorial=1&seed=3')
  await page.getByTestId('pattern-lancet').click()
  await expect(page.getByTestId('tutorial-card')).toBeVisible()
  await page.getByTestId('tutorial-skip').click()
  await expect(page.getByTestId('tutorial-card')).toHaveCount(0)
  // skip persists: reload WITHOUT the force param stays dismissed
  await page.goto('/?seed=3')
  await page.getByTestId('pattern-lancet').click()
  await expect(page.getByTestId('tutorial-card')).toHaveCount(0)
})

test('seeded runs never show the tutorial', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/?seed=3')
  await page.getByTestId('pattern-novice-rose').click()
  await expect(page.getByTestId('tutorial-card')).toHaveCount(0)
})
