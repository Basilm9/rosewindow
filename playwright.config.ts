import { defineConfig, devices } from '@playwright/test'

const desktopChrome = {
  ...devices['Desktop Chrome'],
  channel: process.env.CI ? undefined : 'chrome',
}

const acceptance = {
  testDir: 'tests/e2e/acceptance',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: desktopChrome,
}

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', testIgnore: 'acceptance/**', use: desktopChrome },
    // Acceptance tests run one at a time against the final build and write the official
    // record in docs/acceptance. The dry project runs the same tests without recording.
    { name: 'acceptance', ...acceptance },
    { name: 'acceptance-dry', ...acceptance },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
