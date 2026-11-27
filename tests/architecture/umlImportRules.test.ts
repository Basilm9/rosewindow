import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Packages, abstract classes, interfaces and the import rules of the UML generator (prompt 60).
 * Kept apart from uml.test.ts so the two files can change without touching each other.
 */

/** Spawning the generator can exceed Vitest's 5 s default on shared CI runners. */
const UML_TEST_TIMEOUT_MS = 30_000

interface Report {
  readonly status: number | null
  readonly stdout: string
  readonly diagram: string
}

/** A throw-away project with the real generator; `report` allows a failing exit status. */
function withProject(check: (root: string, report: () => Report) => void) {
  const root = mkdtempSync(join(tmpdir(), 'rosewindow-uml-rules-'))
  const project = fileURLToPath(new URL('../../', import.meta.url))
  try {
    mkdirSync(join(root, 'scripts'))
    mkdirSync(join(root, 'src'))
    writeFileSync(
      join(root, 'scripts/generate-uml.mjs'),
      readFileSync(join(project, 'scripts/generate-uml.mjs')),
    )
    symlinkSync(join(project, 'node_modules'), join(root, 'node_modules'), 'junction')
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { strict: true, target: 'ES2022' }, include: ['src'] }),
    )
    check(root, () => {
      const result = spawnSync(process.execPath, [join(root, 'scripts/generate-uml.mjs')], {
        encoding: 'utf8',
        cwd: tmpdir(),
      })
      expect(result.stderr).toBe('')
      const diagram = readFileSync(join(root, 'docs/uml-class-diagram.md'), 'utf8')
      return { status: result.status, stdout: result.stdout, diagram }
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

/** The diagram of a project whose generator run must succeed. */
function generated(report: () => Report): string {
  const result = report()
  expect(result.status).toBe(0)
  return result.diagram
}

/** Writes `src/<path>` in the temporary project, creating its folder. */
function write(root: string, path: string, code: string) {
  const file = join(root, 'src', path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, code)
}

/*
 * Test-design criterion for the cases below: one case per relationship kind the diagram
 * draws, and input-domain partitioning of the section 5 import rules (allowed, forbidden
 * package, forbidden library, type-only, forbidden global, legacy folder).
 */
describe('packages, abstract classes and interfaces', { timeout: UML_TEST_TIMEOUT_MS }, () => {
  it('U4 groups classes by package and marks an abstract parent', () => {
    withProject((root, report) => {
      write(root, 'mvc/AbstractModel.ts', 'export abstract class AbstractModel<E> { last?: E }')
      write(
        root,
        'model/Game.ts',
        `import { AbstractModel } from '../mvc/AbstractModel'
         export class ScoredEvent { readonly kind = 'scored' }
         export class Game extends AbstractModel<ScoredEvent> { readonly round = 1 }`,
      )
      const output = generated(report)
      expect(output).toContain('namespace mvc {')
      expect(output).toContain('namespace model {')
      expect(output.indexOf('namespace mvc')).toBeLessThan(output.indexOf('namespace model'))
      expect(output).toContain('<<abstract>>')
      expect(output).toContain('AbstractModel <|-- Game')
      expect(output).toContain('Game --> ScoredEvent : has')
      expect(output).toContain('class AbstractModel:::abstract')
      expect(output).toContain('**2 concrete production classes**')
    })
  })

  it('U5 draws an interface, its members and the class that realizes it', () => {
    withProject((root, report) => {
      write(
        root,
        'mvc/listener.ts',
        `export interface Listener { readonly label: string; modelChanged(event: string): void }
         export class Recorder implements Listener {
           readonly label = 'r'
           modelChanged(event: string): void { console.log(event) }
         }
         export class Hub { readonly listeners: Listener[] = [] }`,
      )
      const output = generated(report)
      expect(output).toMatch(/class Listener \{\s+<<interface>>\s+\+string label/)
      expect(output).toContain('+modelChanged(event) void')
      expect(output).toContain('Listener <|.. Recorder')
      expect(output).toContain('Hub --> Listener : has')
      expect(output).not.toContain('Recorder ..> Listener')
    })
  })
})

describe('import rules (MVC_RoseWindow.md section 5)', { timeout: UML_TEST_TIMEOUT_MS }, () => {
  it('U6 fails on a library and on a package the model may not import', () => {
    withProject((root, report) => {
      write(root, 'view/v.ts', 'export const v = 1')
      write(
        root,
        'model/bad.ts',
        `import { useState } from 'react'
import { v } from '../view/v'
export const bad = [useState, v]`,
      )
      const result = report()
      expect(result.status).toBe(1)
      expect(result.stdout).toContain('Import-rule violations: 2')
      expect(result.diagram).toContain("- src/model/bad.ts:1 model → react (import 'react')")
      expect(result.diagram).toContain("- src/model/bad.ts:2 model → view (import '../view/v')")
    })
  })

  it('U7 lets a view import model types but not model values', () => {
    withProject((root, report) => {
      write(root, 'model/g.ts', 'export class G { readonly a = 1 }')
      write(root, 'view/v.ts', "import type { G } from '../model/g'\nexport type V = G")
      const allowed = report()
      expect(allowed.status).toBe(0)
      expect(allowed.stdout).toContain('Import-rule violations: 0')
      write(root, 'view/v.ts', "import { G } from '../model/g'\nexport const g = new G()")
      const refused = report()
      expect(refused.status).toBe(1)
      expect(refused.stdout).toContain('Import-rule violations: 1')
    })
  })

  it('U8 flags browser globals and Math.random in the model, not names that look like them', () => {
    withProject((root, report) => {
      write(
        root,
        'model/ok.ts',
        'export class Board { window = 1; size() { const window = this.window; return window } }',
      )
      expect(report().stdout).toContain('Import-rule violations: 0')
      write(
        root,
        'model/r.ts',
        'export const roll = () => Math.random()\nexport const store = () => localStorage',
      )
      const result = report()
      expect(result.status).toBe(1)
      expect(result.stdout).toContain('Import-rule violations: 2')
      expect(result.diagram).toContain('- src/model/r.ts:1 model → Math.random (use SeededRandom)')
      expect(result.diagram).toContain('- src/model/r.ts:2 model → localStorage (global)')
    })
  })

  it('U9 resolves path aliases and keeps React out of the model', () => {
    withProject((root, report) => {
      writeFileSync(
        join(root, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'bundler',
            paths: { '@progression/*': ['./src/progression/*'], '@mvc/*': ['./src/mvc/*'] },
          },
          include: ['src'],
        }),
      )
      write(root, 'progression/p.ts', 'export const p = 1')
      write(
        root,
        'mvc/react/hook.ts',
        "import { useEffect } from 'react'\nexport const hook = useEffect",
      )
      write(
        root,
        'model/m.ts',
        "import { p } from '@progression/p'\nimport { hook } from '@mvc/react/hook'\nexport const m = [p, hook]",
      )
      const result = report()
      expect(result.stdout).toContain('Import-rule violations: 2')
      expect(result.diagram).toContain("model → progression (import '@progression/p')")
      expect(result.diagram).toContain("model → mvc/react (import '@mvc/react/hook')")
    })
  })

  it('U10 tolerates legacy folders for the old code only, until they are gone', () => {
    withProject((root, report) => {
      write(root, 'engine/old.ts', "import { m } from '../model/m'\nexport const old = m")
      write(root, 'model/m.ts', 'export const m = 1')
      write(root, 'view/v.ts', "import { old } from '../engine/old'\nexport const v = old")
      const before = report()
      expect(before.status).toBe(0)
      expect(before.stdout).toContain('Legacy imports still to remove (prompts 55 to 59): 1')
      write(root, 'controller/c.ts', "import { old } from '../engine/old'\nexport const c = old")
      const broken = report()
      expect(broken.status).toBe(1)
      expect(broken.diagram).toContain("controller → engine (import '../engine/old')")
    })
  })
})
