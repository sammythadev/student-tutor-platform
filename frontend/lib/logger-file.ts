import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * JSONL file sink for the logger.
 *
 * This module holds the only `node:fs` reference in the logging system, which
 * is exactly why it is a separate file. `lib/logger.ts` is imported by
 * `'use client'` components, so anything reachable from it — including a
 * dynamic `import()` — gets resolved into the browser chunk graph at build
 * time, and the client build fails on `node:fs`.
 *
 * So the dependency is inverted: server-only entry points (currently
 * `proxy.ts`) call `createFileSink()` and hand the result to
 * `registerFileSink()` from `lib/logger.ts`. Never import this from a module
 * that a client component can reach.
 *
 * Rotation is deliberately not handled here — a process manager or log
 * shipper owns that.
 */
export function createFileSink(path?: string): ((line: string) => void) | null {
  const target = (path ?? process.env.LOG_FILE_PATH)?.trim()
  if (!target) return null

  let ensured = false
  let disabled = false

  return (line: string) => {
    if (disabled) return

    try {
      if (!ensured) {
        mkdirSync(dirname(target), { recursive: true })
        ensured = true
      }
      appendFileSync(target, `${line}\n`, 'utf8')
    } catch {
      // Unwritable path, permissions, disk full. `mkdirSync` can be slow to
      // fail on some mounts, and this runs inline on the request path, so a
      // path that cannot work is abandoned for the rest of the process
      // instead of being retried on every single log line.
      disabled = true
    }
  }
}
