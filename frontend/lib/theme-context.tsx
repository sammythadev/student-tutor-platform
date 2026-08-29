'use client'

import { useEffect, useState } from 'react'
import { ThemeProvider as NextThemeProvider, useTheme as useNextTheme } from 'next-themes'
import type { ReactNode } from 'react'

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemeProvider>
  )
}

type ThemeMode = 'light' | 'dark'

interface ThemeContextType {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
}

/**
 * Compatibility wrapper over next-themes. Consumers get a resolved
 * 'light' | 'dark' value and a two-way setter; "system" resolves before
 * exposure so existing `theme === 'dark'` checks keep working.
 */
export function useTheme(): ThemeContextType {
  const { resolvedTheme, setTheme } = useNextTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const resolved: ThemeMode = resolvedTheme === 'light' ? 'light' : 'dark'

  return {
    // Before hydration, report dark (the brand-default rendering) to avoid flashes.
    theme: mounted ? resolved : 'dark',
    setTheme: (mode: ThemeMode) => setTheme(mode),
  }
}
