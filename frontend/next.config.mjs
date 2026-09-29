/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000'

const nextConfig = {
  /* Development-only terminal logging. `browserToTerminal` (stable in 16.2)
     forwards client-side console output to the terminal with file:line, which
     is what makes `logger` calls from 'use client' components debuggable.
     Set to 'error', not 'warn': at 'warn' every handled warning lands here
     with an 8-line stack that points at logger.ts, not at the cause. Warn-level
     API failures are already surfaced to the user in a toast, so forwarding
     them too is duplicate noise. `incomingRequests.ignore` suppresses Next's
     built-in request log for the proxy path so it does not duplicate
     `proxy.ts`. */
  logging: {
    browserToTerminal: 'error',
    incomingRequests: { ignore: [/^\/api\/backend\//] },
  },
  images: {
    /* The optimizer is on: the landing page serves four real product screenshots,
       and unoptimized meant full-size PNGs with no AVIF/WebP and no srcset.
       `sharp` is already allowed to build in pnpm-workspace.yaml.
       If this ever moves to `output: 'export'`, set unoptimized back to true and
       pre-convert the PNGs instead. */
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
    ]
  },
}

export default nextConfig
