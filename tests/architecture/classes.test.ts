import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

it('enforces 15 distinct production classes without counting types, test fixtures, or duplicate names', () => {
  const root = mkdtempSync(join(tmpdir(), 'rosewindow-classes-'))
  const project = fileURLToPath(new URL('../../', import.meta.url))
  try {
    mkdirSync(join(root, 'scripts'))
    mkdirSync(join(root, 'src'))
    mkdirSync(join(root, 'tests'))
    cpSync(join(project, 'scripts/check-classes.mjs'), join(root, 'scripts/check-classes.mjs'))
    symlinkSync(join(project, 'node_modules'), join(root, 'node_modules'), 'junction')
    const source = Array.from({ length: 14 }, (_, index) => `export class Production${index} {}`)
    source.push(
      'export interface SomeInterface {}',
      'export type SomeAlias = object',
      'export function SomeComponent() { return null }',
      'export abstract class AbstractBase {}',
      'export declare class AmbientClass {}',
      '// export class CommentedOut {}',
    )
    writeFileSync(join(root, 'src/classes.ts'), source.join('\n'))
    writeFileSync(join(root, 'src/duplicate.ts'), 'export class Production0 {}')
    writeFileSync(join(root, 'src/ambient.d.ts'), 'export class DeclarationOnly {}')
    writeFileSync(join(root, 'tests/helper.ts'), 'export class TestHelper {}')
    const run = () =>
      spawnSync(process.execPath, [join(root, 'scripts/check-classes.mjs')], { encoding: 'utf8' })
    const failing = run()
    expect(failing.status).toBe(1)
    expect(failing.stdout).toContain('14 distinct concrete production classes')

    writeFileSync(join(root, 'src/fifteenth.ts'), 'export class Fifteenth {}')
    const passing = run()
    expect(passing.status).toBe(0)
    expect(passing.stdout).toContain('15 distinct concrete production classes')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
