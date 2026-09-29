import { NextResponse, type NextRequest } from 'next/server'

import { logger, registerFileSink } from '@/lib/logger'
import { createFileSink } from '@/lib/logger-file'

// Proxy runs on the Node runtime, so it is the one place that can hand the
// logger a file destination (LOG_FILE_PATH). Keeping the `node:fs` import here
// is what stops it reaching the browser chunk graph — see `lib/logger-file.ts`.
registerFileSink(createFileSink())

/**
 * Request logging for the `/api/backend/*` proxy path.
 *
 * Next.js 16 deprecated `middleware.ts` in favour of `proxy.ts`
 * (https://nextjs.org/docs/app/api-reference/file-conventions/proxy).
 *
 * This file deliberately does NOT proxy. It returns `NextResponse.next()`, so
 * the `rewrites()` rule in `next.config.mjs` still resolves the request to the
 * NestJS backend exactly as before. The consequence is that we never see the
 * upstream response — Proxy runs before the rewrite resolves, so status and
 * duration are not available here. Those live in the backend's
 * `HttpLoggingInterceptor`; this log covers what the backend cannot see, which
 * is the edge entry point itself.
 *
 * The `x-request-id` is set on the request headers so it can be correlated
 * with whatever the backend records for the same call.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  const requestId = headers.get('x-request-id') ?? crypto.randomUUID()
  headers.set('x-request-id', requestId)

  const { pathname, search } = request.nextUrl

  logger.child('proxy').debug('api request', {
    requestId,
    method: request.method,
    path: pathname,
    query: search || undefined,
  })

  return NextResponse.next({ request: { headers } })
}

export const config = {
  // Only the backend proxy prefix. Everything else — pages, `_next/static`,
  // `/_next/image`, public assets — is skipped so this never adds per-request
  // cost to asset delivery.
  matcher: ['/api/backend/:path*'],
}
