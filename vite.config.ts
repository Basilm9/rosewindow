import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Absolute path of a project-relative file or folder. */
const path = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url))

/**
 * MVC package aliases, mirroring `compilerOptions.paths` in `tsconfig.json` so tsc, Vite,
 * Vitest and the Playwright dev server resolve them identically. Exact barrel aliases come
 * before their `/*` prefix forms.
 */
const packageAliases = (['mvc', 'model', 'controller', 'view', 'progression', 'util'] as const)
  .flatMap((name) => [
    ...(name === 'view'
      ? []
      : [{ find: new RegExp(`^@${name}$`), replacement: path(`./src/${name}/index.ts`) }]),
    { find: new RegExp(`^@${name}/`), replacement: `${path(`./src/${name}`)}/` },
  ])

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: packageAliases,
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
})
