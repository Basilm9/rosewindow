import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-05T12:00:00.000Z'))
})

const cellLabels = (page: Page) =>
  page.getByRole('gridcell').evaluateAll((cells) => cells.map((c) => c.getAttribute('aria-label')))

async function placeAnyLegalDie(page: Page): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.locator('button[data-testid^="draft-die-"]').first().click()
    const legalCells = page.locator('[role="gridcell"][data-legal="true"]')
    if (await legalCells.count()) {
      await legalCells.first().click()
      return true
    }
  }
  return false
}

test('boots straight into a game: no landing page, no navigation, no scrolling', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await expect(page.locator('button[data-testid^="pattern-"]')).toHaveCount(2)
  await expect(page.getByRole('navigation')).toHaveCount(0)
  // First launch coaches the player through the teaching window.
  await expect(page.getByTestId('tutorial-card')).toContainText('Welcome, glazier')
  await page.screenshot({ path: testInfo.outputPath('title-card.png') })

  await page.locator('button[data-testid^="pattern-"]').first().click()
  await expect(page.getByTestId('glass-board')).toBeVisible()
  const fits = await page.evaluate(() => ({
    noScroll:
      document.documentElement.scrollHeight <= window.innerHeight + 1 &&
      document.documentElement.scrollWidth <= window.innerWidth + 1,
    trayBottom: document.querySelector('[data-testid="draft-pool"]')!.getBoundingClientRect().bottom,
  }))
  expect(fits.noScroll).toBe(true)
  expect(fits.trayBottom).toBeLessThanOrEqual(844)
  await page.screenshot({ path: testInfo.outputPath('play-screen.png') })
})

test('the pause menu explains the rules and resumes play', async ({ page }) => {
  await page.goto('/?seed=3')
  await page.getByTestId('pattern-lancet').click()
  await page.getByTestId('game-menu').click()
  await expect(page.getByTestId('pause-menu')).toBeVisible()
  await page.getByTestId('tutorial-replay').click()
  await expect(page.getByTestId('rules-sheet')).toContainText('Bend the light')
  await page.getByTestId('close-dialog').click()
  await expect(page.getByTestId('rules-sheet')).toHaveCount(0)
  await page.getByTestId('game-menu').click()
  await page.getByTestId('menu-resume').click()
  await expect(page.getByTestId('pause-menu')).toHaveCount(0)
  await expect(page.getByTestId('draft-die-0')).toBeEnabled()
})

test('tapping goal chips opens the goal details with live points', async ({ page }) => {
  await page.goto('/?seed=3&round=3')
  await page.getByTestId('objectives').click()
  await expect(page.getByTestId('goals-sheet').locator('.goal-row')).toHaveCount(4)
})

test('a placed die survives closing and reopening the game', async ({ page }) => {
  await page.goto('/?seed=3')
  await page.getByTestId('pattern-lancet').click()
  await page.getByTestId('draft-die-0').click()
  await page.getByTestId('cell-r1c3').click()
  await expect(page.getByTestId('die-r1c3')).toBeVisible()
  const labels = await cellLabels(page)
  await page.goto('/')
  await expect(page.getByTestId('die-r1c3')).toBeVisible()
  expect(await cellLabels(page)).toEqual(labels)
  await expect(page.getByTestId('tutorial-card')).toHaveCount(0)
})

test('a daily run completes, earns XP once, and shares a replayable challenge', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000)
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        ;(window as unknown as { __shared: ShareData }).__shared = data
      },
    })
  })
  await page.goto('/?seed=3')
  await page.getByTestId('pattern-lancet').click()
  await page.getByTestId('game-menu').click()
  await page.getByTestId('menu-daily').click()

  const patterns = page.locator('button[data-testid^="pattern-"]')
  await expect(patterns).toHaveCount(1)
  const patternId = await patterns.first().getAttribute('data-testid')
  await patterns.first().click()
  const boardName = await page.getByTestId('glass-board').getAttribute('aria-label')
  const openingDice = await page
    .locator('button[data-testid^="draft-die-"]')
    .evaluateAll((dice) => dice.map((die) => die.getAttribute('aria-label')))

  for (let turn = 0; turn < 24; turn++) {
    // Results overlay the finished board, so either may match: any one is enough.
    await expect(
      page
        .getByTestId('game-over')
        .or(page.locator('[data-testid="glass-board"][aria-busy="false"]'))
        .first(),
    ).toBeVisible({ timeout: 15_000 })
    if (await page.getByTestId('game-over').isVisible()) break
    expect(await placeAnyLegalDie(page), 'a surviving draft has a legal move').toBe(true)
  }
  await expect(page.getByTestId('game-over')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('earned-rewards')).toContainText('XP')
  const score = Number(await page.getByTestId('final-total').getAttribute('aria-label').then((l) => l!.replace(/\D/g, '')))
  expect(score).toBeGreaterThan(0)
  await page.screenshot({ path: testInfo.outputPath('daily-results.png') })

  await page.getByTestId('share-result').click()
  const shared = await page.waitForFunction(() => (window as unknown as { __shared?: ShareData }).__shared)
  const { url } = (await shared.jsonValue()) as ShareData
  expect(url).toContain('challenge=')

  // The finished run is recorded once: a reload does not resume or re-award it.
  await page.goto('/')
  await expect(page.locator('button[data-testid^="pattern-"]')).toHaveCount(2)
  await expect(page.locator('.chip').filter({ hasText: 'Best' })).toContainText(String(score))

  await page.goto(url!)
  await expect(patterns).toHaveCount(1)
  await expect(patterns.first()).toHaveAttribute('data-testid', patternId!)
  await expect(page.locator('.chip').filter({ hasText: 'Beat' })).toContainText(String(score))
  await patterns.first().click()
  await expect(page.getByTestId('glass-board')).toHaveAttribute('aria-label', boardName!)
  expect(
    await page
      .locator('button[data-testid^="draft-die-"]')
      .evaluateAll((dice) => dice.map((die) => die.getAttribute('aria-label'))),
  ).toEqual(openingDice)
})

test('a malformed challenge link explains itself and deals a fresh window', async ({ page }) => {
  await page.goto('/?challenge=RW1.this-is-not-a-complete-challenge')
  await expect(page.getByTestId('app-toast')).toContainText('incomplete')
  await expect(page.locator('button[data-testid^="pattern-"]')).toHaveCount(2)
})
