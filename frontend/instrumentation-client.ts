import { logger, normalizeError } from '@/lib/logger'

/**
 * Client-side instrumentation. Runs before hydration, which makes it the only
 * place that can see JavaScript errors thrown before React mounts — the window
 * that `app/error.tsx` and `app/global-error.tsx` are not alive for.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.child('client').error('Unhandled error', {
      ...normalizeError(event.error ?? event.message),
      source: event.filename,
      line: event.lineno,
      column: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    logger.child('client').error('Unhandled promise rejection', normalizeError(event.reason))
  })
}
