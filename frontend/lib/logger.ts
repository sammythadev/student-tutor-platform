/**
 * Zero-dependency logger for the Next.js app.
 *
 * One module, three runtimes:
 * - Node (proxy, Server Components, route handlers) → console + optional
 *   JSONL file at LOG_FILE_PATH.
 * - Edge (no Node APIs) → console only.
 * - Browser → console only; `info`/`debug` are dropped in production.
 *
 * Deliberately imports nothing. `app/global-error.tsx` must stay
 * dependency-light, and a logger that pulls in React, Next or axios cannot be
 * used from the boundary that runs when those are exactly what broke.
 */

/* ─── Runtime detection ──────────────────────────────────────────────────── */

const isNode = typeof process !== 'undefined' && typeof process.versions?.node === 'string'
const isBrowser = typeof window !== 'undefined'
const isProduction = process.env.NODE_ENV === 'production'

/**
 * Reading `process.env.NAME` dynamically only resolves on Node. Next inlines
 * literal `process.env.NEXT_PUBLIC_*` references at build time, so public
 * values are read literally below and never through this helper.
 */
function serverEnv(name: string): string | undefined {
  if (!isNode) return undefined
  try {
    return process.env[name]
  } catch {
    return undefined
  }
}

/* ─── Levels ─────────────────────────────────────────────────────────────── */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export type LogMeta = Record<string, unknown>

export interface Logger {
  error(message: string, meta?: LogMeta): void
  warn(message: string, meta?: LogMeta): void
  info(message: string, meta?: LogMeta): void
  debug(message: string, meta?: LogMeta): void
  /** Derives a logger that tags every line with `scope`. */
  child(scope: string): Logger
}

const LEVEL_ORDER: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 }
const VALID_LEVELS: LogLevel[] = ['error', 'warn', 'info', 'debug']
const PRODUCTION_LEVELS: LogLevel[] = ['error', 'warn']
const DEVELOPMENT_LEVELS: LogLevel[] = ['error', 'warn', 'info', 'debug']

function resolveEnabled(): boolean {
  const raw = (
    isBrowser ? process.env.NEXT_PUBLIC_LOG_ENABLED : serverEnv('LOG_ENABLED')
  )?.trim()
  return raw?.toLowerCase() !== 'false'
}

function resolveLevels(): LogLevel[] {
  const raw = (isBrowser ? process.env.NEXT_PUBLIC_LOG_LEVEL : serverEnv('LOG_LEVEL'))?.trim()
  const explicit = raw?.toLowerCase() as LogLevel | undefined

  if (explicit && VALID_LEVELS.includes(explicit)) {
    // Everything at or below the requested level.
    return VALID_LEVELS.filter((level) => LEVEL_ORDER[level] <= LEVEL_ORDER[explicit])
  }

  return isProduction ? PRODUCTION_LEVELS : DEVELOPMENT_LEVELS
}

const enabled = resolveEnabled()
const levels = resolveLevels()

function allows(level: LogLevel): boolean {
  return enabled && LEVEL_ORDER[level] <= LEVEL_ORDER[levels[levels.length - 1]]
}

/* ─── Redaction ──────────────────────────────────────────────────────────── */

/**
 * `lib/axios.ts` reads the persisted Zustand store and sets an
 * `Authorization: Bearer` header, so any error carrying request config can
 * contain a live access *and* refresh token. Nothing reaches a sink without
 * passing through here.
 */
const REDACTED_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'apikey',
  'api_key',
  'password',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'secret',
  'jwt',
])

const BEARER = /\bBearer\s+[\w.~+/-]+=*/gi
const MAX_DEPTH = 4

function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[truncated]'
  if (typeof value === 'string') return value.replace(BEARER, 'Bearer [redacted]')
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1))
  // Error fields are non-enumerable, so this must run before the object branch.
  if (value instanceof Error) return normalizeError(value)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = REDACTED_KEYS.has(key.toLowerCase()) ? '[redacted]' : redact(item, depth + 1)
    }
    return out
  }
  return value
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return '[unserializable]'
  }
}

/**
 * Flattens anything throwable into loggable meta. Carries `digest` so a Next
 * production error can be matched back to its server-side frame.
 */
export function normalizeError(error: unknown): LogMeta {
  if (error instanceof Error) {
    const meta: LogMeta = { name: error.name, message: error.message }
    if (error.stack) meta.stack = error.stack

    const { digest, status } = error as { digest?: unknown; status?: unknown }
    if (typeof digest === 'string') meta.digest = digest
    if (typeof status === 'number') meta.status = status

    return meta
  }

  if (typeof error === 'string') return { message: error }

  return { message: safeStringify(error) }
}

/* ─── File sink ──────────────────────────────────────────────────────────── */

type FileSink = (line: string) => void

let sink: FileSink | null = null

/**
 * Registers a destination for formatted log lines.
 *
 * This is an inversion of the obvious dependency on purpose. `logger.ts` is
 * imported by `'use client'` components, so *anything* it reaches statically
 * or dynamically lands in the browser chunk graph — a dynamic
 * `import('./logger-file')` is still resolved at build time and fails the
 * client build with "the chunking context does not support external modules
 * (request: node:fs)".
 *
 * So the direction is reversed: this module stays pure, and the server-only
 * module that holds `node:fs` pushes a sink in. `proxy.ts` does that at
 * startup. Server Components that want file logging call `registerFileSink`
 * the same way.
 */
export function registerFileSink(next: FileSink | null): void {
  sink = next
}

/* ─── Emit ───────────────────────────────────────────────────────────────── */

function formatDev(scope: string, level: LogLevel, message: string, meta: LogMeta): string {
  const time = new Date().toISOString().slice(11, 23)
  const tag = scope ? ` [${scope}]` : ''
  const extra = Object.keys(meta).length ? ` ${safeStringify(meta)}` : ''
  return `${time} ${level.toUpperCase()}${tag} ${message}${extra}`
}

function formatServer(scope: string, level: LogLevel, message: string, meta: LogMeta): string {
  const record: LogMeta = { ts: new Date().toISOString(), level, msg: message, ...meta }
  if (scope) record.scope = scope
  return safeStringify(record)
}

function emit(level: LogLevel, scope: string, message: string, meta: LogMeta): void {
  if (!allows(level)) return

  const clean = redact(meta) as LogMeta

  // `no-console` is disabled for this file in eslint.config.mjs.
  const write = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log

  if (isBrowser) {
    // Meta stays an object: the dev overlay renders it, and
    // `logging.browserToTerminal` forwards it with source location attached.
    write(`[${scope || 'app'}] ${message}`, clean)
    return
  }

  // Node and Edge. The browser sandbox cannot write files, so a registered
  // sink is the only way anything reaches LOG_FILE_PATH.
  const line = isProduction ? formatServer(scope, level, message, clean) : formatDev(scope, level, message, clean)
  write(line)
  sink?.(line)
}

function makeLogger(scope: string): Logger {
  return {
    error: (message, meta) => emit('error', scope, message, meta ?? {}),
    warn: (message, meta) => emit('warn', scope, message, meta ?? {}),
    info: (message, meta) => emit('info', scope, message, meta ?? {}),
    debug: (message, meta) => emit('debug', scope, message, meta ?? {}),
    child: (child) => makeLogger(scope ? `${scope}:${child}` : child),
  }
}

/** Root logger. Prefer `logger.child('scope')` at the call site. */
export const logger: Logger = makeLogger('')
