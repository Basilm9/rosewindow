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
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

function withProject(check: (root: string, generate: () => string) => void) {
  const root = mkdtempSync(join(tmpdir(), 'rosewindow-uml-'))
  const project = fileURLToPath(new URL('../../', import.meta.url))
  try {
    mkdirSync(join(root, 'scripts'))
    mkdirSync(join(root, 'src'))
    mkdirSync(join(root, 'tests'))
    cpSync(join(project, 'scripts/generate-uml.mjs'), join(root, 'scripts/generate-uml.mjs'))
    symlinkSync(join(project, 'node_modules'), join(root, 'node_modules'), 'dir')
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
      expect(result.status).toBe(0)
      return readFileSync(join(root, 'docs/uml-class-diagram.md'), 'utf8')
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

it('derives class members and relationships from types, aliases, and executable references', () => {
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
    for (const name of [
      'AbstractBase',
      'AmbientClass',
      'LocalHelper',
      'TestHelper',
      'DeclarationOnly',
    ]) {
      expect(output).not.toContain(`class ${name}`)
    }
  })
})

it('updates additions, deletions, and member changes without rewriting identical output', () => {
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
})

it('keeps classes with identical names in different modules separate', () => {
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
})
