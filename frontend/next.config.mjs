/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000'

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
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
