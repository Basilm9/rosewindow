import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const minimum = 15
const classes = []

// Parse production source with the compiler: interfaces, aliases, components,
// comments, abstract bases, and ambient declarations cannot inflate the count.
for (const path of ts.sys.readDirectory(resolve(root, 'src'), ['.ts', '.tsx']).sort()) {
  if (path.endsWith('.d.ts')) continue
  const source = ts.createSourceFile(
    path,
    ts.sys.readFile(path) ?? '',
    ts.ScriptTarget.Latest,
    true,
  )
  for (const node of source.statements) {
    if (!ts.isClassDeclaration(node) || !node.name) continue
    const modifiers = ts.getCombinedModifierFlags(node)
    if (!(modifiers & ts.ModifierFlags.Export)) continue
    if (modifiers & (ts.ModifierFlags.Abstract | ts.ModifierFlags.Ambient)) continue
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
    classes.push({ name: node.name.text, path: relative(root, path), line })
  }
}

const distinct = new Set(classes.map(({ name }) => name))
for (const entry of classes) {
  console.log(`${entry.name} — ${entry.path}:${entry.line}`)
}
console.log(`\n${distinct.size} distinct concrete production classes; minimum ${minimum}.`)
if (distinct.size < minimum) {
  console.error('The assignment requires at least 15 distinct classes in src/.')
  process.exitCode = 1
}
