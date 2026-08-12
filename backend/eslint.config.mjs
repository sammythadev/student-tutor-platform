// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'coverage-core/**',
      'drizzle/**',
      'node_modules/**',
      '.husky/**',
      'eslint.config.mjs',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        // The eval TUI is excluded from the main tsconfig (it needs bundler
        // module resolution for the ESM-only ink package), so it typechecks
        // under tsconfig.tui.json. List both projects explicitly.
        project: ['./tsconfig.json', './tsconfig.tui.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      // `_`-prefixed names are intentionally unused — destructuring a field out
      // of an object to drop it, or a caught error we deliberately swallow.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    rules: {
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  {
    // Standalone CommonJS scripts are not part of the TS project, so type-aware
    // rules cannot resolve them. Lint them syntactically instead. Must come last
    // so it overrides the type-aware rules enabled above.
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
