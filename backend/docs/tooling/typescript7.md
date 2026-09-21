# TypeScript 7 (native `tsc`) migration

Status: applied to the **backend package only** (the frontend stays on its own
`typescript@5.7.3`). September 2026.

## Why

TypeScript 7.0 shipped the Go-native compiler (8–12× faster full builds per the
[announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)).
Measured on this package:

| Command                          | Before (TS 5.9, JS) | After (TS 7.0.2, native) |
| -------------------------------- | ------------------- | ------------------------ |
| `pnpm run typecheck` (cold run)  | ~13.1 s             | ~2.7 s                   |
| `pnpm run typecheck` (warm run)  | not measured        | ~2.6 s                   |

(Before number is a single cold run at the start of the migration session;
after is with both passes cached. Both tsconfig passes — `tsconfig.json` +
`tsconfig.tui.json` — run under the native compiler and report identical
results to the TypeScript 6 API compiler.)

## Layout: TypeScript 7 has no JS API

TS 7 is the compiler only — it ships no programmatic API. Tools that type-check
through the API (`ts-jest`, `ts-node`, `typescript-eslint` type-aware linting,
`ts-prune`, `fork-ts-checker`, `cosmiconfig-typescript-loader`) must keep the
TypeScript 6 API. Microsoft's documented side-by-side layout is used, adapted
for pnpm (backend/package.json):

```jsonc
// API for TS-based tooling (import "typescript" resolves here):
"typescript": "npm:@typescript/typescript6@^6.0.2",
// Native 7 tsc binary (pnpm exec tsc):
"@typescript/native": "npm:typescript@^7.0.2",
```

- `pnpm exec tsc --version` → `7.0.2`
- `pnpm exec tsc6 --version` → `6.0.x` (JS compiler, for parity checks)
- `require('typescript')` → `6.0.2` (API consumers resolve this alias)

The consumer graph is captured in `typescript-consumer-graph.txt`.

## tsconfig split

One shared config can no longer hold every option because TypeScript 6 errors
on options TypeScript 7 rejects and vice versa:

| File                | Used by                                     | Notes |
| ------------------- | ------------------------------------------- | ----- |
| `tsconfig.json`     | native `tsc` (typecheck), `ts-jest`, `eslint`, `ts-prune` | Modernized: `module: preserve` + `moduleResolution: bundler`, no `baseUrl` (paths are `./`-relative), explicit `rootDir: "."` and `types: ["node", "jest"]` (TS 6 stopped auto-including `@types`; ambient globals must be listed). |
| `tsconfig.build.json` | `nest build` (SWC) + `tsc-alias`          | Adds `baseUrl: "./"` back: SWC canonicalizes `jsc.baseUrl` on Windows and panics without it. |
| `tsconfig.ts6.json`  | `ts-node` CLI scripts only (`eval*`, `db:seed`) | Legacy CJS: `module: commonjs`, `moduleResolution: node10`, `baseUrl`, `ignoreDeprecations: "6.0"`. ts-node emits CommonJS only under `module: commonjs`, and `tsconfig-paths` needs `baseUrl`. Scripts set it via `cross-env TS_NODE_PROJECT=tsconfig.ts6.json`. |

## Code accommodations

- `users.controller.ts`: `AuthenticatedUser` (type-only, used in decorated
  parameters) is now `import type` — TS 1272 under `isolatedModules` +
  `emitDecoratorMetadata` with the new resolution mode.
- `tui/views.tsx`: `figlet.Fonts` referenced the UMD *global* namespace, which
  native TS 7 no longer exposes; the font type is now derived from the module
  itself (`Parameters<typeof figlet.textSync>[1]['font']`).

## Verification

- Native `tsc` (7.0.2): clean on `tsconfig.json` and `tsconfig.tui.json`.
- API compiler `tsc6`: clean on both plus `tsconfig.ts6.json`.
- `pnpm run lint`: unchanged — only the pre-existing formatting debt in files
  untouched by this work.
- `pnpm run test`: 134/134 pass (ts-jest now compiles under the TS 6 API).
- `pnpm run build`: SWC compiles 148 files; tsc-alias rewrites aliases.
- `pnpm run eval*` / `db:seed` (ts-node): verified with a real eval run.

## ts-prune

Full report: `ts-prune-report.txt`. Most entries are false positives — barrel
re-exports (`src/common/index.ts`, `src/core/index.ts`, …) consumed via deep
imports, "used in module" type exports, and TUI files (excluded from the main
tsconfig, so cross-file references aren't seen).

Safe fixes applied: removed the never-imported legacy helpers
`runEvaluation()` / `runTopKSweep()` from `evaluation-harness.ts` (superseded
by the config builders + suite runners).

Left for review (unused but API surface): `OnboardUsersResponseDto`
(`modules/auth/dtos/auth-session.dto.ts`), `GetConversationDto`
(`modules/messages/dtos/message.dto.ts`), and the exports in the scratch file
`scripts/new.ts`.

## Further reading

- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- https://aka.ms/ts6 (TypeScript 6 deprecations and migration notes)
