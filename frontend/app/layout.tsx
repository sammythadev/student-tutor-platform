import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Caveat } from 'next/font/google'
import { Providers } from '@/components/Providers'
import './globals.css'

/* The landing page's handwritten annotations. The face they are set in on the
   reference is a licensed script; Caveat is the open-licensed stand-in, loaded as
   a variable so only the annotation layer pays for it. */
const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-script-face',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Tutorly: ranked tutor matching, with the reasons shown',
  description:
    'Every eligible tutor is scored on academic fit, learning preferences, schedule overlap and an even spread across tutors, and the score is shown. Built for WAEC and JAMB preparation in Nigerian secondary schools.',
  keywords: ['tutoring', 'WAEC', 'JAMB', 'Nigeria', 'tutor matching', 'secondary school'],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F4F5' },
    { media: '(prefers-color-scheme: dark)',  color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  /* No maximumScale. Capping it blocks pinch zoom, which fails WCAG 1.4.4 and
     is the single most common accessibility mistake in a Next.js viewport. */
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${caveat.variable}`}
    >
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
