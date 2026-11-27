import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import type { Browser, BrowserContextOptions, Page } from '@playwright/test'
import { bestPair } from './model'
import type { Candidate, Game } from './model'

/** Shared acceptance-test harness (prompt 62). It never changes anything under `src/`. */

/** The mockups in `ctxt/mockups/` that acceptance screenshots are compared with. */
export const MOCKUP = {
  setup: '01-setup.png',
  board: '02-board-round1.png',
  legal: '03-legal-preview.png',
  rejected: '04-placement-rejected.png',
  beam: '05-beam.png',
  goals: '06-goal-sheet.png',
  pause: '07-pause-menu.png',
  forfeit: '08-round-forfeit.png',
  report: '09-final-report.png',
  tutorial: '10-tutorial.png',
  challenge: '11-challenge-share.png',
  abandon: '12-pause-abandon-confirm.png',
} as const

export type MockupKey = keyof typeof MOCKUP

/** How every acceptance test compares a screenshot with its mockup; also heads results.md. */
export const MOCKUP_POLICY = [
  'A screen **Fails** (new fault ID) only for (a) missing or wrong content — text, values,',
  'controls absent, extra or wrong — or (b) a broken layout — elements overlapping, clipped,',
  'or the page scrolling where the mockup does not. Purely cosmetic differences — exact',
  'colours, spacing, animation frame captured — are **not** faults: they are recorded in the',
  'notes column (`cosmetic: …`) and the result stays Pass.',
].join('\n')

const project = fileURLToPath(new URL('../../../', import.meta.url))

/**
 * Where screenshots and results go. The `acceptance` project writes the official record in
 * docs/acceptance; `acceptance-dry` writes to test-results, so a rehearsal on an unfinished
 * build never adds a row to it.
 */
export function outputRoot(): string {
  return test.info().project.name === 'acceptance'
    ? resolve(project, 'docs/acceptance')
    : resolve(project, 'test-results/acceptance-dry')
}

/** Longest wait for one beam: at most 64 cells at 400 ms, plus the dwell steps and the tail. */
const BEAM_TIMEOUT = 60_000

/** A clean browser context (no stored game data), 1280×900 unless overridden, logging its URLs. */
export async function freshPage(
  browser: Browser,
  options: BrowserContextOptions = {},
): Promise<{ page: Page; urls: string[] }> {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    viewport: { width: 1280, height: 900 },
    ...options,
  })
  const page = await context.newPage()
  const urls: string[] = []
  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame() || frame.url() === 'about:blank') return
    const { pathname, search } = new URL(frame.url())
    urls.push(`${pathname}${search}`)
  })
  return { page, urls }
}

/** The board, once no beam is running on it. */
export function settledBoard(page: Page) {
  return page.locator('[data-testid="glass-board"][aria-busy="false"]')
}

/** Opens `/?seed=N[&round=R]` and chooses the pattern (a fast-forwarded run has one already). */
export async function startSeeded(
  page: Page,
  seed: number,
  patternId: string,
  round = 1,
): Promise<void> {
  await page.goto(round > 1 ? `/?seed=${seed}&round=${round}` : `/?seed=${seed}`)
  if (round <= 1) await page.getByTestId(`pattern-${patternId}`).click()
  await expect(settledBoard(page)).toBeVisible({ timeout: BEAM_TIMEOUT })
}

/** Animations still running that will end (endless decoration, such as the backdrop, is not one). */
export async function runningAnimations(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().endTime !== Infinity)
        .length,
  )
}

/** Numbered screenshots of one test, each remembered with the mockup it is compared with. */
export class ShotLog {
  readonly at: string
  readonly entries: { readonly file: string; readonly mockup: MockupKey | null }[] = []
  readonly #root: string | undefined

  /** `at` names the folder, e.g. `AT01`; `root` defaults to the project's output folder. */
  constructor(at: string, root?: string) {
    this.at = at
    this.#root = root
  }

  /**
   * Saves `<root>/<AT>/<NN>-<step>.png` and returns its path. It first waits for entrance
   * animations to end, or a card or menu would be caught half-drawn; pass `settle: false`
   * to photograph an animation itself (the beam).
   */
  async take(
    page: Page,
    step: string,
    mockup: MockupKey | null,
    { settle = true }: { readonly settle?: boolean } = {},
  ): Promise<string> {
    const number = String(this.entries.length + 1).padStart(2, '0')
    const file = `${this.at}/${number}-${step}.png`
    this.entries.push({ file, mockup })
    const path = join(this.#root ?? outputRoot(), file)
    if (settle) await expect.poll(() => runningAnimations(page), { timeout: 10_000 }).toBe(0)
    await page.screenshot({ path })
    return path
  }

  /** `AT01/01-setup.png → 01-setup.png`, one per screenshot, for the results table. */
  describe(): string {
    return this.entries
      .map(({ file, mockup }) => (mockup === null ? file : `${file} → ${MOCKUP[mockup]}`))
      .join('<br>')
  }
}

export interface PlayOptions {
  /** Chooses the next move; null means the round is deadlocked. Default: the max-flex player. */
  readonly pick?: (game: Game) => Candidate | null
}

/** Puts the replica where the page is: a round with no legal move forfeits itself. */
function forfeitDeadlocks(replica: Game): void {
  while (replica.phase !== 'gameOver' && !replica.hasLegalMove()) replica.forfeitRound()
}

/** Waits until the page has finished every beam the replica has scored, then compares scores. */
export async function expectScores(page: Page, replica: Game): Promise<void> {
  const rounds = replica.roundScores
  // A round's score appears on its pip only when its beam is done, so this is the wait.
  await expect(page.getByTestId('round-scores').locator('.pip--done')).toHaveText(
    rounds.map(String),
    { timeout: BEAM_TIMEOUT },
  )
  await expect(page.getByTestId('beam-total')).toHaveText(String(replica.totalScore))
  if (replica.phase === 'gameOver') {
    await expect(page.getByTestId('game-over')).toBeVisible({ timeout: BEAM_TIMEOUT })
  } else {
    await expect(settledBoard(page)).toBeVisible()
    await expect(page.getByTestId('round-indicator')).toHaveText(
      `ROUND ${replica.round}/${replica.config.rounds}`,
    )
  }
}

/** Makes one move on the page and on the replica. */
export async function playMove(page: Page, replica: Game, move: Candidate): Promise<void> {
  const { color, value } = move.die
  const { row, col } = move.target
  await page.getByRole('button', { name: `select ${color} ${value}`, exact: true }).first().click()
  await expect(page.getByTestId('held-die')).toBeVisible()
  await page.getByTestId(`cell-r${row}c${col}`).click()
  await expect(page.getByTestId(`die-r${row}c${col}`)).toBeVisible()
  replica.selectDie(move.die)
  replica.placeDie(move.target)
}

/**
 * Mirrors a node-side replica into the page until it reaches `untilRound` (or the end),
 * comparing every round's score after its beam. The page forfeits a deadlocked round by
 * itself, so the replica forfeits it too and no click is made.
 */
export async function playMoves(
  page: Page,
  replica: Game,
  untilRound: number | 'end',
  { pick = bestPair }: PlayOptions = {},
): Promise<void> {
  const last = untilRound === 'end' ? Infinity : untilRound
  forfeitDeadlocks(replica)
  await expectScores(page, replica)
  while (replica.phase !== 'gameOver' && replica.round < last) {
    const scored = replica.roundScores.length
    const move = pick(replica)
    if (move === null) throw new Error(`no move chosen in round ${replica.round}, which is not deadlocked`)
    await playMove(page, replica, move)
    forfeitDeadlocks(replica)
    if (replica.roundScores.length > scored) await expectScores(page, replica)
  }
}

export interface ResultRow {
  /** Test ID, e.g. `AT-01`. */
  readonly at: string
  /** Default `Pass`. A result starting with `Fail` gets the next fault ID. */
  readonly result?: string
  readonly urls: readonly string[]
  readonly shots?: ShotLog
  readonly notes?: string
}

/** F-01 to F-04 were found in the dry run of the reference build (ctxt/acceptance_tests.md). */
const LAST_KNOWN_FAULT = 4

/** The next unused fault ID, given the text of results.md. */
export function nextFaultId(results: string): string {
  const used = [...results.matchAll(/\bF-(\d{2,})\b/g)].map((match) => Number(match[1]))
  return `F-${String(Math.max(LAST_KNOWN_FAULT, ...used) + 1).padStart(2, '0')}`
}

/** Appends one row to results.md, creating the file with its policy and header when missing. */
export function logResult(row: ResultRow, root = outputRoot()): void {
  const file = join(root, 'results.md')
  mkdirSync(root, { recursive: true })
  if (!existsSync(file)) {
    writeFileSync(
      file,
      [
        '# Acceptance test results',
        '',
        'Written by `tests/e2e/acceptance/harness.ts`. Screenshots are in this folder; mockups',
        'are in `ctxt/mockups/`.',
        '',
        '**Comparing with mockups.** ' + MOCKUP_POLICY,
        '',
        '| Date | Test | Result | Fault | URL(s) | Screenshots → mockups | Notes |',
        '| --- | --- | --- | --- | --- | --- | --- |',
        '',
      ].join('\n'),
    )
  }
  const result = row.result ?? 'Pass'
  const cells = [
    new Date().toLocaleDateString('en-CA'),
    row.at,
    result,
    result.startsWith('Fail') ? nextFaultId(readFileSync(file, 'utf8')) : '',
    row.urls.map((url) => `\`${url}\``).join('<br>'),
    row.shots?.describe() ?? '',
    row.notes ?? '',
  ]
  const line = cells.map((cell) => cell.replaceAll('|', '\\|').replace(/\s*\n\s*/g, ' ')).join(' | ')
  appendFileSync(file, `| ${line} |\n`)
}

/**
 * Logs a Fail when the test that just ran did not pass. Every acceptance spec registers it:
 * `test.afterEach(() => logFailure('AT-01', () => ({ urls, shots })))`.
 */
export function logFailure(at: string, context: () => Pick<ResultRow, 'urls' | 'shots'>): void {
  const info = test.info()
  if (info.status === info.expectedStatus || info.status === 'skipped') return
  // Playwright colours its messages; the escape character itself is dropped with the code.
  const message = (info.error?.message ?? 'no error message').split('\n')[0] ?? ''
  const plain = message.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g'), '')
  logResult({ at, result: 'Fail', ...context(), notes: `${info.title}: ${plain}` })
}

/** A path relative to the project, for notes. */
export function projectRelative(path: string): string {
  return relative(project, path).replaceAll('\\', '/')
}
