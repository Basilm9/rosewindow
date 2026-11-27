import { spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Each test spawns the UML generator (TypeScript compiler API) one or more times.
 * That takes ~1s locally but can exceed Vitest's 5s default on shared CI runners,
 * so these tests get a longer timeout without raising the global `testTimeout`.
 */
const UML_TEST_TIMEOUT_MS = 30_000

interface Report {
  readonly status: number | null
  readonly stdout: string
  readonly diagram: string
}

function withProject(check: (root: string, generate: () => string, report: () => Report) => void) {
  const root = mkdtempSync(join(tmpdir(), 'rosewindow-uml-'))
  const project = fileURLToPath(new URL('../../', import.meta.url))
  try {
    mkdirSync(join(root, 'scripts'))
    mkdirSync(join(root, 'src'))
    mkdirSync(join(root, 'tests'))
    cpSync(join(project, 'scripts/generate-uml.mjs'), join(root, 'scripts/generate-uml.mjs'))
    symlinkSync(join(project, 'node_modules'), join(root, 'node_modules'), 'junction')
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { strict: true, target: 'ES2022' }, include: ['src'] }),
    )
    // `report` allows a failing exit status, for the import-rule tests.
    const report = (): Report => {
      const result = spawnSync(process.execPath, [join(root, 'scripts/generate-uml.mjs')], {
        encoding: 'utf8',
        cwd: tmpdir(),
      })
      expect(result.stderr).toBe('')
      const diagram = readFileSync(join(root, 'docs/uml-class-diagram.md'), 'utf8')
      return { status: result.status, stdout: result.stdout, diagram }
    }
    const generate = () => {
      const result = report()
      expect(result.status).toBe(0)
      return result.diagram
    }
    check(root, generate, report)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

it(
  'derives class members and relationships from types, aliases, and executable references',
  () => {
    withProject((root, generate) => {
      writeFileSync(
        join(root, 'src/die.ts'),
        `export class Die {
        constructor(readonly color: string, readonly value: number) {}
        static equals(a: Die, b: Die): boolean { return a.value === b.value }
      }`,
      )
      writeFileSync(
        join(root, 'src/game.ts'),
        `import { Die as PaneDie } from './die'
      export interface Pattern { constraints: readonly Constraint[] }
      export type Grid = readonly (readonly (PaneDie | null)[])[]
      export class Config { readonly seed = 3 }
      export class Constraint { readonly accepts = (die: PaneDie): boolean => die.value > 0 }
      export class DomainError extends Error {}
      export class PlacementError extends DomainError { constructor(readonly code: string) { super(code) } }
      export class Window {
        #dice: Grid = []
        readonly demand = new Constraint()
        constructor(readonly config: Config, readonly pattern: Pattern) {}
        get size(): number { return this.#dice.length }
        static empty(config: Config, pattern: Pattern): Window { return new Window(config, pattern) }
        place(die: PaneDie): boolean { return this.demand.accepts(die) }
      }
      export class SeededRandom { next(): number { return 1 } }
      export class Game {
        constructor(readonly board: Window) {}
        run(): number { return new SeededRandom().next() }
        fail(): never { throw new PlacementError('invalid') }
        // Config and SeededRandom mentioned in comments do not create relationships.
      }
      export abstract class AbstractBase {}
      export declare class AmbientClass {}
      class LocalHelper {}
      export function SomeComponent() { return null }
      // export class CommentedOut {}
      `,
      )
      writeFileSync(join(root, 'tests/helper.ts'), 'export class TestHelper {}')
      writeFileSync(join(root, 'src/ambient.d.ts'), 'export class DeclarationOnly {}')

      const output = generate()
      expect(output).toContain('**8 concrete production classes**')
      expect(output).toContain('+string color')
      expect(output).toContain('+equals(a, b) boolean$')
      expect(output).toContain('-Grid dice')
      expect(output).toContain('+number size')
      expect(output).toContain('+accepts(die) boolean')
      expect(output).toContain('+empty(config, pattern) Window$')
      expect(output).toContain('Window --> Die : has')
      expect(output).toContain('Window --> Config : has')
      expect(output).toContain('Window --> Constraint : has')
      expect(output).toContain('Constraint ..> Die : uses')
      expect(output).toContain('Game ..> SeededRandom : uses')
      expect(output).toContain('Game ..> PlacementError : uses')
      expect(output).toContain('DomainError <|-- PlacementError')
      expect(output).not.toContain('Game ..> Config')
      expect(output).toMatch(/\[Die\]\(\.\.\/src\/die\.ts#L1\)/)
      expect(output).toMatch(/class AbstractBase \{\s+<<abstract>>/)
      for (const name of ['AmbientClass', 'LocalHelper', 'TestHelper', 'DeclarationOnly']) {
        expect(output).not.toContain(`class ${name}`)
      }
    })
  },
  UML_TEST_TIMEOUT_MS,
)

it(
  'updates additions, deletions, and member changes without rewriting identical output',
  () => {
    withProject((root, generate) => {
      const source = join(root, 'src/model.ts')
      const removed = join(root, 'src/removed.ts')
      writeFileSync(source, 'export class Model { value = 1 }')
      writeFileSync(removed, 'export class Removed {}')
      const before = generate()
      expect(before).toContain('+number value')
      expect(before).toContain('class Removed')

      writeFileSync(source, 'export class Model { title = "rose" }\nexport class Added {}')
      unlinkSync(removed)
      const after = generate()
      expect(after).not.toBe(before)
      expect(after).not.toContain('class Removed')
      expect(after).not.toContain('+number value')
      expect(after).toContain('+string title')
      expect(after).toContain('class Added')

      const output = join(root, 'docs/uml-class-diagram.md')
      const timestamp = new Date('2020-01-01T00:00:00Z')
      utimesSync(output, timestamp, timestamp)
      expect(generate()).toBe(after)
      expect(statSync(output).mtimeMs).toBe(timestamp.getTime())
    })
  },
  UML_TEST_TIMEOUT_MS,
)

it(
  'keeps classes with identical names in different modules separate',
  () => {
    withProject((root, generate) => {
      writeFileSync(join(root, 'src/first.ts'), 'export class Item { first = true }')
      writeFileSync(join(root, 'src/second.ts'), 'export class Item { second = true }')
      writeFileSync(
        join(root, 'src/holder.ts'),
        `import { Item as First } from './first'
       import { Item as Second } from './second'
       export class Holder { constructor(readonly first: First, readonly second: Second) {} }`,
      )
      const output = generate()
      expect(output).toContain('Holder --> Item : has')
      expect(output).toContain('Holder --> Item_2 : has')
      expect(output).toContain('class Item_2["Item"]')
      expect(output).toContain('+boolean first')
      expect(output).toContain('+boolean second')
    })
  },
  UML_TEST_TIMEOUT_MS,
)

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
    withProject((root, generate) => {
      write(root, 'mvc/AbstractModel.ts', 'export abstract class AbstractModel<E> { last?: E }')
      write(
        root,
        'model/Game.ts',
        `import { AbstractModel } from '../mvc/AbstractModel'
         export class ScoredEvent { readonly kind = 'scored' }
         export class Game extends AbstractModel<ScoredEvent> { readonly round = 1 }`,
      )
      const output = generate()
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
    withProject((root, generate) => {
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
      const output = generate()
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
    withProject((root, _generate, report) => {
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
    withProject((root, _generate, report) => {
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
    withProject((root, _generate, report) => {
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
    withProject((root, _generate, report) => {
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
    withProject((root, _generate, report) => {
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
