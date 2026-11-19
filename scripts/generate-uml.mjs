import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const config = ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile)
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'))
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
if (parsed.errors.length) {
  throw new Error(
    parsed.errors
      .map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n'))
      .join('\n'),
  )
}
const paths = ts.sys
  .readDirectory(resolve(root, 'src'), ['.ts', '.tsx'])
  .filter((path) => !path.endsWith('.d.ts'))
  .sort()
const production = new Set(paths.map((path) => resolve(path)))
const program = ts.createProgram(paths, { ...parsed.options, noEmit: true })
const checker = program.getTypeChecker()
const classes = []
const usedIds = new Set()

// Match the assignment checker: exported, named, concrete production classes.
for (const path of paths) {
  const source = program.getSourceFile(path)
  for (const node of source.statements) {
    if (!ts.isClassDeclaration(node) || !node.name) continue
    const flags = ts.getCombinedModifierFlags(node)
    if (!(flags & ts.ModifierFlags.Export)) continue
    if (flags & (ts.ModifierFlags.Abstract | ts.ModifierFlags.Ambient)) continue
    const name = node.name.text
    const baseId = name.replace(/[^a-zA-Z0-9_]/g, '_')
    let id = baseId
    for (let suffix = 2; usedIds.has(id); suffix++) id = `${baseId}_${suffix}`
    usedIds.add(id)
    classes.push({
      node,
      name,
      id,
      path: relative(root, path).replaceAll('\\', '/'),
      line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
    })
  }
}

const bySymbol = new Map(
  classes.map((entry) => [checker.getSymbolAtLocation(entry.node.name), entry]),
)
function classAt(node) {
  let symbol = checker.getSymbolAtLocation(node)
  if (symbol?.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol)
  return bySymbol.get(symbol)
}

// Follow containers, unions, and project data records, without walking through
// another class's members or the DOM/standard library. This also resolves imports
// renamed with `as`, and aliases such as DieGrid and CellConstraint.
function referencedClasses(type, seen = new Set()) {
  if (seen.has(type)) return new Set()
  seen.add(type)
  const direct = bySymbol.get(type.getSymbol())
  if (direct) return new Set([direct])
  const found = new Set()
  const add = (nested) => {
    for (const entry of referencedClasses(nested, seen)) found.add(entry)
  }
  if (type.isUnionOrIntersection()) type.types.forEach(add)
  if (type.objectFlags & ts.ObjectFlags.Reference) {
    checker.getTypeArguments(type).forEach(add)
    return found
  }
  for (const signature of type.getCallSignatures()) {
    add(checker.getReturnTypeOfSignature(signature))
    for (const parameter of signature.parameters) {
      const declaration = parameter.valueDeclaration ?? parameter.declarations?.[0]
      if (declaration) add(checker.getTypeOfSymbolAtLocation(parameter, declaration))
    }
  }
  const localRecord = type
    .getSymbol()
    ?.declarations?.some((node) => production.has(resolve(node.getSourceFile().fileName)))
  if (localRecord) {
    for (const property of type.getProperties()) {
      const declaration = property.valueDeclaration ?? property.declarations?.[0]
      if (declaration) add(checker.getTypeOfSymbolAtLocation(property, declaration))
    }
  }
  return found
}

function visibility(node) {
  const flags = ts.getCombinedModifierFlags(node)
  if (node.name && ts.isPrivateIdentifier(node.name)) return '-'
  if (flags & ts.ModifierFlags.Private) return '-'
  return flags & ts.ModifierFlags.Protected ? '#' : '+'
}

function memberName(node) {
  return ts.isIdentifier(node.name) || ts.isPrivateIdentifier(node.name)
    ? node.name.text.replace(/^#/, '')
    : 'computed'
}

function typeLabel(type, context, annotation) {
  if (type.getCallSignatures().length) return 'Function'
  let label =
    annotation?.getText() ??
    checker.typeToString(type, context, ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope)
  // Parentheses make Mermaid treat a field as an operation. Use an equivalent
  // generic array spelling for nullable/nested arrays before rendering members.
  while (/\(([^()]*)\)\[\]/.test(label)) label = label.replace(/\(([^()]*)\)\[\]/g, 'Array<$1>')
  return label
    .replace(/\{[^{}]*\}/g, 'object')
    .replace(/=>/g, '→')
    .replace(/[<>]/g, '~')
    .replaceAll('"', "'")
    .replace(/\s+/g, ' ')
}

function operation(node, name, signature) {
  const parameters = signature.parameters
    .map((parameter) => {
      const declaration = parameter.valueDeclaration
      const rest = declaration?.dotDotDotToken ? '...' : ''
      const optional = declaration?.questionToken || declaration?.initializer ? '?' : ''
      return `${rest}${parameter.name}${optional}`
    })
    .join(', ')
  const result = ts.isConstructorDeclaration(node)
    ? ''
    : ` ${typeLabel(checker.getReturnTypeOfSignature(signature), node, ts.isMethodDeclaration(node) ? node.type : undefined)}`
  const isStatic = ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Static
  return `${visibility(node)}${name}(${parameters})${result}${isStatic ? '$' : ''}`
}

const edges = new Set()
const boxes = classes.map((entry) => {
  const fields = []
  const operations = []
  const associations = new Set()
  const parents = new Set()
  const dependencies = new Set()
  const field = (node) => {
    const type = checker.getTypeAtLocation(node)
    const signature = type.getCallSignatures()[0]
    if (signature) {
      operations.push(operation(node, memberName(node), signature))
    } else {
      const isStatic = ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Static
      fields.push(
        `${visibility(node)}${typeLabel(type, node, node.type)} ${memberName(node)}${isStatic ? '$' : ''}`,
      )
      for (const target of referencedClasses(type)) associations.add(target)
    }
  }
  const accessors = new Set()
  for (const member of entry.node.members) {
    if (ts.isConstructorDeclaration(member)) {
      for (const parameter of member.parameters) {
        if (ts.isParameterPropertyDeclaration(parameter, member)) field(parameter)
      }
      const signature = checker.getSignatureFromDeclaration(member)
      if (signature) operations.push(operation(member, entry.name, signature))
    } else if (ts.isPropertyDeclaration(member)) {
      field(member)
    } else if (ts.isMethodDeclaration(member)) {
      const signature = checker.getSignatureFromDeclaration(member)
      if (signature) operations.push(operation(member, memberName(member), signature))
    } else if (ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) {
      const name = memberName(member)
      if (!accessors.has(name)) {
        fields.push(
          `${visibility(member)}${typeLabel(checker.getTypeAtLocation(member.name), member, member.type)} ${name}`,
        )
        accessors.add(name)
      }
    }
  }
  for (const clause of entry.node.heritageClauses ?? []) {
    if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue
    for (const type of clause.types) {
      const parent = classAt(type.expression)
      if (parent) parents.add(parent)
    }
  }
  function visit(node) {
    if (ts.isIdentifier(node)) {
      const target = classAt(node)
      if (target) dependencies.add(target)
    }
    if (ts.isTypeNode(node)) {
      for (const target of referencedClasses(checker.getTypeAtLocation(node)))
        dependencies.add(target)
    }
    ts.forEachChild(node, visit)
  }
  visit(entry.node)
  for (const parent of parents) edges.add(`    ${parent.id} <|-- ${entry.id}`)
  for (const target of associations) {
    if (target !== entry && !parents.has(target))
      edges.add(`    ${entry.id} --> ${target.id} : has`)
  }
  for (const target of dependencies) {
    if (target !== entry && !parents.has(target) && !associations.has(target)) {
      edges.add(`    ${entry.id} ..> ${target.id} : uses`)
    }
  }
  const label = entry.id === entry.name ? '' : `    class ${entry.id}["${entry.name}"]\n`
  return `${label}    class ${entry.id} {\n${[...fields, ...operations].map((line) => `        ${line}`).join('\n')}\n    }`
})

const markdown = [
  '# Rose Window — UML class diagram',
  '',
  '<!-- Generated by scripts/generate-uml.mjs. Do not edit this file by hand. -->',
  '',
  `This diagram is generated from **${classes.length} concrete production classes** in ` + '`src/`',
  'using the TypeScript compiler API. `pnpm build` and `pnpm typecheck` regenerate it',
  'after successful type checking. Run `pnpm uml` to regenerate it on its own.',
  '',
  'Edit the TypeScript source to change this diagram. GitHub renders the Mermaid',
  'block below as a UML class diagram.',
  '',
  '```mermaid',
  'classDiagram',
  '    direction TB',
  '',
  boxes.join('\n\n'),
  '',
  [...edges].sort().join('\n'),
  '```',
  '',
  'How to read it:',
  '',
  "- Each box lists a class's fields and operations. `+` means public, `-` private,",
  '  and `#` protected. Static members are underlined. Accessors appear as fields;',
  '  callable fields appear as operations. Parameters show names; types and',
  '  nullable results come from the compiler. Object shapes are shortened to',
  '  `object`, callback return types to `Function`, and generic brackets to `~`.',
  '- Solid arrows (`has`) represent field references, including references inside',
  '  arrays, unions, and project data records. They do not assert lifecycle ownership.',
  "- Dashed arrows (`uses`) represent other references in a class's code or types.",
  '  Hollow triangles point to parent classes. Relationships to built-in types,',
  '  interfaces, aliases, and classes outside this production inventory are omitted.',
  '- Interfaces, type aliases, React function components, abstract/ambient classes,',
  '  and test helpers do not count toward this concrete class inventory.',
  '- Class and relationship order is deterministic; unchanged source does not',
  '  rewrite the file. Source links below identify classes with the same name.',
  '',
  'Source inventory:',
  '',
  ...classes.map(
    (entry) => `- [${entry.name}](../${entry.path}#L${entry.line}) — ` + '`' + entry.path + '`',
  ),
  '',
  'See the [class responsibilities](class-structure.md) for the assignment context.',
  '',
].join('\n')

const output = resolve(root, 'docs/uml-class-diagram.md')
if (!existsSync(output) || readFileSync(output, 'utf8') !== markdown) {
  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, markdown)
}
console.log(`UML updated: ${relative(root, output)} (${classes.length} classes).`)
