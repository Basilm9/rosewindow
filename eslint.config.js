import js from '@eslint/js'
import globals from 'globals'
import jsdoc from 'eslint-plugin-jsdoc'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

/**
 * Legacy reference-implementation folders (strangler migration). They are not restricted yet,
 * but the model must never reach back into them; they are deleted in prompt 59.
 */
const legacy = ['**/engine/*', '**/machine/*', '**/hooks/*', '**/dev/*']

export default tseslint.config(
  { ignores: ['dist', 'playwright-report', 'test-results', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // ---- Package import boundaries (MVC_RoseWindow.md §5) -------------------------------------

  // Determinism: all randomness goes through SeededRandom, everywhere in src/.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use SeededRandom.' },
      ],
    },
  },

  // Model: imports only @mvc and itself; no UI, DOM, browser storage or XState.
  {
    files: ['src/model/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'xstate', '@xstate/*'],
              message: 'Model is UI- and XState-free (§5).',
            },
            {
              group: [
                '@controller',
                '@controller/*',
                '@view/*',
                '@progression',
                '@progression/*',
                '@util',
                '@util/*',
                '@mvc/react/*',
                '../controller/*',
                '../view/*',
                '../progression/*',
                '../util/*',
                ...legacy,
              ],
              message: 'Model imports only @mvc and itself (§5).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'localStorage',
        'sessionStorage',
        'navigator',
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "ThrowStatement > NewExpression[callee.name='Error']",
          message: 'Throw GameError or a subclass.',
        },
      ],
    },
  },

  // Controller: model, mvc and XState only; no React or views.
  {
    files: ['src/controller/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom',
                '@xstate/react',
                '@view/*',
                '../view/*',
                '@progression',
                '@progression/*',
                '@mvc/react/*',
              ],
              message: 'Controller imports model, mvc and XState only (§5).',
            },
          ],
        },
      ],
    },
  },

  // Progression: model (and mvc); never view or controller.
  {
    files: ['src/progression/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom',
                '@view/*',
                '@controller',
                '@controller/*',
                'xstate',
                '@xstate/*',
              ],
              message: 'Progression imports model only; never view or controller (§5).',
            },
          ],
        },
      ],
    },
  },

  // View: controller, mvc, util; model TYPES only. Legacy paths tolerated until prompt 58.
  {
    files: ['src/view/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@model', '@model/*'],
              allowTypeImports: true,
              message: 'Views use model types only (§5).',
            },
          ],
        },
      ],
    },
  },

  // MVC core is framework-free and package-free; the React hook lives in src/mvc/react/.
  {
    files: ['src/mvc/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'xstate', '@*/*', '../*'],
              message: 'MVC core imports no framework and no other package (§5).',
            },
          ],
        },
      ],
    },
  },

  // ---- TSDoc presence at every visibility (new packages only) -------------------------------
  {
    files: ['src/mvc/**/*.{ts,tsx}', 'src/model/**/*.ts', 'src/controller/**/*.ts'],
    plugins: { jsdoc },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: false,
          require: { ClassDeclaration: true, MethodDefinition: true },
          contexts: [
            'PropertyDefinition',
            'TSInterfaceDeclaration',
            'TSPropertySignature',
            'TSMethodSignature',
            'TSTypeAliasDeclaration',
          ],
        },
      ],
    },
  },
)
