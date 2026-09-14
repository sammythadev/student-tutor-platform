import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/* Next.js 16 removed `next lint` and no longer lints during `next build`, so
   ESLint is wired directly here. This is the shape the Next docs prescribe for
   ESLint 9 flat config: the Core Web Vitals rule-set (which upgrades
   LCP-affecting rules to errors) plus the TypeScript rules, with the config
   package's own ignores restated because defining them replaces the defaults. */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    /* Reference captures and clone scratch, never source. */
    '.clone/**',
  ]),
])

export default eslintConfig
