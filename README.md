# Rose Window

A single-player stained-glass puzzle game built with TypeScript, React, and XState.

The assignment requires at least **15 distinct classes**. The engine currently
provides 15 concrete classes, each used by the running game. See
[the class inventory and responsibilities](docs/class-structure.md).
The [UML class diagram](docs/uml-class-diagram.md) shows their structure and relationships.
It is generated from the TypeScript source whenever `pnpm build` or
`pnpm typecheck` succeeds. Use `pnpm uml` to refresh it separately; edit the
classes in `src/` rather than editing the generated diagram.

Requires Node >= 22 and pnpm. Run `pnpm install`, then `pnpm dev` to play locally.

Verification:

```sh
pnpm check:classes
pnpm typecheck && pnpm lint && pnpm test
pnpm e2e
pnpm build
```

The class check parses production TypeScript with the compiler API and prints
each class's source location. It also runs automatically before the unit tests.
