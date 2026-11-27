import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

/**
 * Fixture tests for the package import boundaries of MVC_RoseWindow.md §5 (prompt 02).
 *
 * Test-design criterion: input-domain partitioning — one partition per §5 rule, plus allowed
 * cases proving the rules do not over-match: type-only model imports from view/progression,
 * model → mvc, and controller → model / XState.
 */

const root = fileURLToPath(new URL('../../', import.meta.url))

/** Rules that implement the boundaries; other rules (unused vars, …) must not affect counts. */
const boundaryRules = new Set([
  '@typescript-eslint/no-restricted-imports',
  'no-restricted-globals',
  'no-restricted-properties',
  'no-restricted-syntax',
])

const VIOLATION = 1
const ALLOWED = 0

const cases: ReadonlyArray<[number, string, string, number]> = [
  [1, 'src/model/X.ts', "import { useState } from 'react'", VIOLATION],
  [2, 'src/model/X.ts', "import { createActor } from 'xstate'", VIOLATION],
  [3, 'src/model/X.ts', 'export const k = localStorage', VIOLATION],
  [4, 'src/model/X.ts', 'export const r = Math.random()', VIOLATION],
  [5, 'src/model/X.ts', "import { a } from '@progression'", VIOLATION],
  [6, 'src/view/X.tsx', "import { Game } from '@model'", VIOLATION],
  [7, 'src/view/X.tsx', "import type { Game } from '@model'", ALLOWED],
  [8, 'src/controller/X.ts', "import { useState } from 'react'", VIOLATION],
  [9, 'src/progression/X.ts', "import { GameController } from '@controller'", VIOLATION],
  [10, 'src/progression/X.ts', "import type { Game } from '@model'", ALLOWED],
  [11, 'src/model/X.ts', "import { AbstractModel } from '@mvc'", ALLOWED],
  [12, 'src/controller/X.ts', "import { Game } from '@model'", ALLOWED],
  [13, 'src/controller/X.ts', "import { createActor } from 'xstate'", ALLOWED],
  [14, 'src/view/X.tsx', "import { loadProfile } from '@progression/profile'", VIOLATION],
  [15, 'src/view/X.tsx', "import type { RunSession } from '@progression'", ALLOWED],
]

const eslint = new ESLint({ cwd: root })

describe('import-boundary rules (§5)', () => {
  it.each(cases)(
    'case %i: %s `%s` -> %i boundary error(s)',
    async (_n, filePath, code, expected) => {
      const [result] = await eslint.lintText(`${code}\n`, { filePath: `${root}${filePath}` })
      const messages = result?.messages ?? []
      // A parse failure would make an "allowed" case pass vacuously.
      expect(messages.filter((m) => m.fatal)).toEqual([])
      const boundary = messages.filter((m) => m.ruleId !== null && boundaryRules.has(m.ruleId))
      expect(boundary).toHaveLength(expected)
    },
  )
})
