// ESM loader for the eval TUI (`pnpm run tui`).
//
// Ink v4+ is ESM-only, so the TUI must run through Node's ESM loader chain.
// ts-node's ESM loader (`ts-node/esm`) is incompatible with Node 24
// (ERR_REQUIRE_CYCLE_MODULE when an ESM-compiled .tsx entry imports any
// node_modules package), so this loader replaces it entirely:
//
//   - resolve(): maps the repo's `@core/*` tsconfig alias to src/core/*,
//     resolves the entry path, and appends .ts/.tsx to extensionless relative
//     imports (ESM requires explicit extensions).
//   - load(): transpiles .ts/.tsx source with the repo's existing @swc/core
//     dependency (enums, JSX, decorators) and hands Node ESM output.
//
// The bootstrap (`scripts/register-tui.mjs`) registers it via
// `module.register()`, the modern replacement for the deprecated --loader flag.
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join, normalize, resolve as resolvePath, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transform } from '@swc/core';

const PROJECT_ROOT = resolvePath(import.meta.dirname, '..');
const CORE_DIR = join(PROJECT_ROOT, 'src', 'core');

/** Suffixes tried when resolving an extensionless specifier. */
const SOURCE_SUFFIXES = ['', '.ts', '.tsx', '.js', '/index.ts', '/index.tsx', '/index.js'];

function findFile(base) {
  for (const suffix of SOURCE_SUFFIXES) {
    const candidate = `${base}${suffix}`;
    // Directories (e.g. `@core/algorithms` with an index.ts inside) must NOT be
    // matched here — only the later `/index.ts` suffix resolves those.
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return undefined;
}

const isTypeScriptPath = (path) => /\.(ts|tsx|mts|cts)$/.test(path);

export async function resolve(specifier, context, nextResolve) {
  // Alias: @core/<x> -> src/core/<x> (normalized so `..` segments can't escape
  // the core directory).
  if (specifier.startsWith('@core/')) {
    const mapped = normalize(join(CORE_DIR, specifier.slice('@core/'.length)));
    if (mapped.startsWith(CORE_DIR + sep)) {
      const target = findFile(mapped);
      if (target !== undefined) {
        return { url: pathToFileURL(target).href, shortCircuit: true };
      }
    }
  }

  // Entry point: node passes the CLI path with no parent URL.
  if (context.parentURL === undefined && !specifier.startsWith('file:')) {
    const target = findFile(resolvePath(process.cwd(), specifier));
    if (target !== undefined) {
      return { url: pathToFileURL(target).href, shortCircuit: true };
    }
  }

  // Relative imports: exact file match first, then with source suffixes
  // appended (ESM requires extensions, and files like `algorithm-weights.vo.ts`
  // carry a pseudo-extension in their name, so `extname()` alone is unreliable).
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    context.parentURL !== undefined
  ) {
    const base = resolvePath(fileURLToPath(context.parentURL), '..', specifier);
    if (existsSync(base) && statSync(base).isFile()) {
      return { url: pathToFileURL(base).href, shortCircuit: true };
    }
    const target = findFile(base);
    if (target !== undefined) {
      return { url: pathToFileURL(target).href, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}

const SWC_CONFIG = {
  jsc: {
    parser: { syntax: 'typescript', tsx: true, decorators: true },
    transform: {
      react: { runtime: 'automatic' },
      legacyDecorator: true,
    },
    target: 'es2022',
  },
  module: { type: 'es6' },
  sourceMaps: 'inline',
};

export async function load(url, context, nextLoad) {
  if (url.startsWith('file:')) {
    const path = fileURLToPath(url);
    if (isTypeScriptPath(path)) {
      const source = await readFile(path, 'utf8');
      const { code } = await transform(source, { ...SWC_CONFIG, filename: path });
      return { format: 'module', source: code, shortCircuit: true };
    }
  }
  return nextLoad(url, context);
}
