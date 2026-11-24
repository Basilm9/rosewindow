import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../', import.meta.url))

/** Every folder the MVC package layout requires (MVC_RoseWindow.md §4, prompt 01). */
const requiredFolders = [
  'src/mvc',
  'src/model',
  'src/controller',
  'src/view',
  'src/progression',
  'src/util',
  'tests/mvc',
  'tests/model',
  'tests/controller',
  'tests/view',
  'tests/progression',
  'tests/util',
]

describe('MVC package structure', () => {
  it.each(requiredFolders)('%s exists', (folder) => {
    expect(existsSync(`${root}${folder}`)).toBe(true)
  })

  it('resolves the @model alias', async () => {
    await expect(import('@model')).resolves.toBeDefined()
  })
})
