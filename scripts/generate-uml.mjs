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
/** The MVC packages (MVC_RoseWindow.md section 4), in the order the diagram shows them. */
const PACKAGES = ['mvc', 'model', 'controller', 'view', 'progression', 'util']

/** First folder under `src/`, or null for a file directly in `src/` (the composition root). */
function packageOf(path) {
  const parts = relative(resolve(root, 'src'), path).replaceAll('\\', '/').split('/')
  return parts.length > 1 && parts[0] !== '..' ? parts[0] : null
}

/** Packages first in their fixed order, then any other folder, then files with no package. */
function packageRank(name) {
  if (name === null) return PACKAGES.length + 1
  const index = PACKAGES.indexOf(name)
  return index === -1 ? PACKAGES.length : index
}

const projectPath = (path) => relative(root, path).replaceAll('\\', '/')
const lineOf = (source, node) =>
  source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

// Exported, named production types. `kind` is 'class' (concrete: what the assignment
// checker counts), 'abstract' or 'interface'. Ambient and local types stay out.
const entries = []
for (const path of paths) {
  const source = program.getSourceFile(path)
  for (const node of source.statements) {
    if (!(ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) || !node.name) continue
    const flags = ts.getCombinedModifierFlags(node)
    if (!(flags & ts.ModifierFlags.Export) || flags & ts.ModifierFlags.Ambient) continue
    const kind = ts.isInterfaceDeclaration(node)
      ? 'interface'
      : flags & ts.ModifierFlags.Abstract
        ? 'abstract'
        : 'class'
    entries.push({
      node,
      kind,
      name: node.name.text,
      package: packageOf(path),
      path: projectPath(path),
      line: lineOf(source, node),
    })
  }
}
entries.sort(
  (a, b) =>
    packageRank(a.package) - packageRank(b.package) ||
    compare(a.package ?? '', b.package ?? '') ||
    compare(a.path, b.path) ||
    compare(a.name, b.name),
)
const usedIds = new Set()
for (const entry of entries) {
  const baseId = entry.name.replace(/[^a-zA-Z0-9_]/g, '_')
  entry.id = baseId
  for (let suffix = 2; usedIds.has(entry.id); suffix++) entry.id = `${baseId}_${suffix}`
  usedIds.add(entry.id)
}
const classes = entries.filter((entry) => entry.kind === 'class')

const bySymbol = new Map(
  entries.map((entry) => [checker.getSymbolAtLocation(entry.node.name), entry]),
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
  const found = new Set()
  const add = (nested) => {
    for (const entry of referencedClasses(nested, seen)) found.add(entry)
  }
  const direct = bySymbol.get(type.getSymbol())
  if (direct) {
    found.add(direct)
    // `Base<Arg>` refers to Arg as well as to Base.
    if (type.objectFlags & ts.ObjectFlags.Reference) checker.getTypeArguments(type).forEach(add)
    return found
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
  // Nested object shapes collapse from the inside out; leftover braces would end the box.
  while (/\{[^{}]*\}/.test(label)) label = label.replace(/\{[^{}]*\}/g, 'object')
  label = label.replace(/\([^()]*\)\s*=>\s*[^|&,()]+/g, 'Function').replace(/[()]/g, '')
  return label
    .trim()
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
    : ` ${typeLabel(checker.getReturnTypeOfSignature(signature), node, ts.isMethodDeclaration(node) || ts.isMethodSignature(node) ? node.type : undefined)}`
  const isStatic = ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Static
  return `${visibility(node)}${name}(${parameters})${result}${isStatic ? '$' : ''}`
}

const edges = new Set()
const boxes = entries.map((entry) => {
  const fields = []
  const operations = []
  const associations = new Set()
  const parents = new Set()
  const realized = new Set()
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
    } else if (ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) {
      field(member)
    } else if (ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) {
      const signature = checker.getSignatureFromDeclaration(member)
      if (signature) operations.push(operation(member, memberName(member), signature))
    } else if (ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) {
      const name = memberName(member)
      if (!accessors.has(name)) {
        const type = checker.getTypeAtLocation(member.name)
        fields.push(`${visibility(member)}${typeLabel(type, member, member.type)} ${name}`)
        for (const target of referencedClasses(type)) associations.add(target)
        accessors.add(name)
      }
    }
  }
  for (const clause of entry.node.heritageClauses ?? []) {
    const target = clause.token === ts.SyntaxKind.ExtendsKeyword ? parents : realized
    for (const type of clause.types) {
      const parent = classAt(type.expression)
      if (parent) target.add(parent)
      // GameController extends AbstractController<Game> holds a Game.
      for (const argument of type.typeArguments ?? []) {
        for (const found of referencedClasses(checker.getTypeAtLocation(argument))) {
          associations.add(found)
        }
      }
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
  // One edge per pair: generalization, then realization, association, dependency.
  const drawn = new Set([entry])
  const draw = (targets, edge) => {
    for (const target of targets) {
      if (drawn.has(target)) continue
      drawn.add(target)
      edges.add(`    ${edge(target)}`)
    }
  }
  draw(parents, (target) => `${target.id} <|-- ${entry.id}`)
  draw(realized, (target) => `${target.id} <|.. ${entry.id}`)
  draw(associations, (target) => `${entry.id} --> ${target.id} : has`)
  draw(dependencies, (target) => `${entry.id} ..> ${target.id} : uses`)

  const label = entry.id === entry.name ? '' : `class ${entry.id}["${entry.name}"]\n`
  const stereotype = entry.kind === 'class' ? [] : [`<<${entry.kind}>>`]
  const members = [...stereotype, ...fields, ...operations].map((line) => `    ${line}`)
  return `${label}class ${entry.id} {\n${members.join('\n')}\n}`
})

const indent = (text, by) => text.replace(/^(?=.)/gm, ' '.repeat(by))
const groups = []
entries.forEach((entry, index) => {
  if (groups.at(-1)?.name !== entry.package || groups.length === 0) {
    groups.push({ name: entry.package, boxes: [] })
  }
  groups.at(-1).boxes.push(boxes[index])
})
const inventory = groups.map(({ name, boxes }) =>
  name === null
    ? indent(boxes.join('\n\n'), 4)
    : `    namespace ${name} {\n${indent(boxes.join('\n\n'), 8)}\n    }`,
)
const styles = entries
  .filter((entry) => entry.kind !== 'class')
  .map((entry) => `    class ${entry.id}:::${entry.kind}`)

// Import rules of MVC_RoseWindow.md section 5. `name:type` allows type-only imports.
const ALLOWED = {
  mvc: ['mvc'],
  model: ['model', 'mvc'],
  controller: ['controller', 'model', 'mvc'],
  view: ['view', 'controller', 'mvc', 'util', 'model:type', 'progression:type'],
  progression: ['progression', 'model', 'mvc'],
  util: ['util', 'model'],
}
const FORBIDDEN_EXTERNAL = {
  mvc: ['react', 'react-dom', 'xstate', '@xstate/react'],
  model: ['react', 'react-dom', 'xstate', '@xstate/react'],
  controller: ['react', 'react-dom', '@xstate/react'],
  progression: ['react', 'react-dom', 'xstate', '@xstate/react'],
}
const FORBIDDEN_GLOBALS = new Set(['window', 'document', 'localStorage', 'sessionStorage'])
/** The one part of `mvc` that is React; only views may use it. */
const isReactBridge = (path) => projectPath(path).startsWith('src/mvc/react/')

// The reference code still lives in src/engine, src/machine, src/hooks and src/dev until
// prompt 59 deletes it. While any such folder exists, it is exempt, the code that predates
// the rebuild (view, progression) may keep importing it, and views may keep their old
// progression values; those imports are counted, not reported. New packages never may.
const legacyFolders = new Set(paths.map(packageOf).filter((name) => name && !PACKAGES.includes(name)))
const PREDATES_REBUILD = new Set(['view', 'progression'])
let legacyImports = 0
const violations = []

function typeOnly(node) {
  if (ts.isImportDeclaration(node)) {
    const clause = node.importClause
    if (!clause) return false
    if (clause.isTypeOnly) return true
    const named = clause.namedBindings
    return (
      !clause.name &&
      named !== undefined &&
      ts.isNamedImports(named) &&
      named.elements.length > 0 &&
      named.elements.every((element) => element.isTypeOnly)
    )
  }
  if (ts.isExportDeclaration(node)) {
    const named = node.exportClause
    return (
      node.isTypeOnly ||
      (named !== undefined &&
        ts.isNamedExports(named) &&
        named.elements.length > 0 &&
        named.elements.every((element) => element.isTypeOnly))
    )
  }
  return ts.isImportTypeNode(node)
}

/** The module a node imports or re-exports from, if it is such a node. */
function moduleSpecifier(node) {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return node.moduleSpecifier
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    return node.arguments[0]
  }
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) return node.argument.literal
  return undefined
}

for (const path of paths) {
  const from = packageOf(path)
  if (!PACKAGES.includes(from)) continue
  const source = program.getSourceFile(path)
  const report = (node, what) =>
    violations.push({ path: projectPath(path), line: lineOf(source, node), what: `${from} → ${what}` })

  const checkImport = (node, specifier) => {
    const name = specifier.text
    const shown = `(import '${name}')`
    const resolved = ts.resolveModuleName(name, path, parsed.options, ts.sys).resolvedModule
    const target = resolved && resolve(resolved.resolvedFileName)
    if (target && production.has(target)) {
      const to = packageOf(target)
      if (to === null) {
        report(node, `src ${shown}`)
      } else if (!PACKAGES.includes(to)) {
        if (PREDATES_REBUILD.has(from)) legacyImports += 1
        else report(node, `${to} ${shown}`)
      } else if (isReactBridge(target) && !isReactBridge(path) && from !== 'view') {
        report(node, `mvc/react ${shown}`)
      } else if (
        !ALLOWED[from].includes(to) &&
        !(typeOnly(node) && ALLOWED[from].includes(`${to}:type`))
      ) {
        if (from === 'view' && to === 'progression' && legacyFolders.size > 0) legacyImports += 1
        else report(node, `${to} ${shown}`)
      }
      return
    }
    const external = (FORBIDDEN_EXTERNAL[from] ?? []).some(
      (library) => name === library || name.startsWith(`${library}/`),
    )
    if (external && !isReactBridge(path)) report(node, `${name} ${shown}`)
  }

  /** True when the identifier is the global of that name, not a local or a property. */
  const isGlobal = (identifier) => {
    const symbol = checker.getSymbolAtLocation(identifier)
    const declarations = symbol?.declarations ?? []
    const parent = identifier.parent
    if (ts.isPropertyAccessExpression(parent) && parent.name === identifier) return false
    if (ts.isPropertyAssignment(parent) && parent.name === identifier) return false
    return (
      declarations.length > 0 &&
      declarations.every((node) => !production.has(resolve(node.getSourceFile().fileName)))
    )
  }

  const walk = (node) => {
    const specifier = moduleSpecifier(node)
    if (specifier && ts.isStringLiteralLike(specifier)) checkImport(node, specifier)
    if (from === 'model' && ts.isIdentifier(node)) {
      if (FORBIDDEN_GLOBALS.has(node.text) && isGlobal(node)) report(node, `${node.text} (global)`)
      const access = node.parent
      if (
        node.text === 'Math' &&
        ts.isPropertyAccessExpression(access) &&
        access.expression === node &&
        access.name.text === 'random' &&
        isGlobal(node)
      ) {
        report(node, 'Math.random (use SeededRandom)')
      }
    }
    ts.forEachChild(node, walk)
  }
  walk(source)
}
violations.sort(
  (a, b) => compare(a.path, b.path) || a.line - b.line || compare(a.what, b.what),
)
const violationLines = violations.map(({ path, line, what }) => `- ${path}:${line} ${what}`)

const kindCount = (kind) => entries.filter((entry) => entry.kind === kind).length

const markdown = [
  '# Rose Window — UML class diagram',
  '',
  '<!-- Generated by scripts/generate-uml.mjs. Do not edit this file by hand. -->',
  '',
  `This diagram is generated from **${classes.length} concrete production classes** in ` + '`src/`',
  `using the TypeScript compiler API, plus ${kindCount('abstract')} abstract and ${kindCount('interface')} interface types.`,
  '`pnpm build` and `pnpm typecheck` regenerate it',
  'after successful type checking. Run `pnpm uml` to regenerate it on its own.',
  '',
  'Edit the TypeScript source to change this diagram. GitHub renders the Mermaid',
  'block below as a UML class diagram.',
  '',
  '```mermaid',
  "%%{init: {'theme':'base','themeVariables':{'primaryColor':'#FFFFC0','primaryBorderColor':'#A0522D','primaryTextColor':'#000000','lineColor':'#404040','fontFamily':'Arial','fontSize':'12px'}}}%%",
  'classDiagram',
  '    direction TB',
  '',
  inventory.join('\n\n'),
  '',
  [...edges].sort().join('\n'),
  '',
  // Mermaid's class diagram grammar rejects `font-style`, so abstract types get a fill.
  '    classDef abstract fill:#F3E9D8',
  '    classDef interface fill:#FFFFE8',
  ...styles,
  '```',
  '',
  'How to read it:',
  '',
  '- Each titled frame is a package: a folder under `src/`. `<<abstract>>` marks an',
  '  abstract class and `<<interface>>` an interface.',
  "- Each box lists a class's fields and operations. `+` means public, `-` private,",
  '  and `#` protected. Static members are underlined. Accessors appear as fields;',
  '  callable fields appear as operations. Parameters show names; types and',
  '  nullable results come from the compiler. Object shapes are shortened to',
  '  `object`, callback return types to `Function`, and generic brackets to `~`.',
  '- Solid arrows (`has`) represent field references, including references inside',
  '  arrays, unions, and project data records. They do not assert lifecycle ownership.',
  "- Dashed arrows (`uses`) represent other references in a class's code or types.",
  '  A hollow triangle on a solid line points to the parent (generalization), and on a',
  '  dashed line to the interface a class implements (realization). Each pair shows its',
  '  strongest relationship only. Built-in types and aliases are omitted.',
  '- Abstract classes and interfaces are drawn but not counted. Type aliases, React',
  '  function components, ambient types and test helpers are left out.',
  '- Class and relationship order is deterministic; unchanged source does not',
  '  rewrite the file. Source links below identify classes with the same name.',
  '',
  'Source inventory:',
  '',
  ...entries.map(
    (entry) => `- [${entry.name}](../${entry.path}#L${entry.line}) — ` + '`' + entry.path + '`',
  ),
  '',
  '## Import-rule violations',
  '',
  'Imports that break the package rules of `ctxt/MVC_RoseWindow.md` section 5.',
  '',
  ...(violationLines.length ? violationLines : ['None.']),
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
console.log(`Import-rule violations: ${violations.length}`)
for (const line of violationLines) console.log(line)
if (legacyImports > 0) {
  console.log(`Legacy imports still to remove (prompts 55 to 59): ${legacyImports}`)
}
process.exitCode = violations.length > 0 ? 1 : 0
