'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type ThemeMode = 'light' | 'dark'

interface ThemeContextType {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load saved theme preference
    const saved = localStorage.getItem('tutorly-theme') as ThemeMode | null
    if (saved) {
      setThemeState(saved)
      applyTheme(saved)
    } else {
      // Light is the default; respect it regardless of system preference
      // until the user explicitly toggles.
      setThemeState('light')
      applyTheme('light')
    }
  }, [])

  const applyTheme = (newTheme: ThemeMode) => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark-mode')
      document.documentElement.classList.remove('light-mode')
    } else {
      document.documentElement.classList.add('light-mode')
      document.documentElement.classList.remove('dark-mode')
    }
  }

  const handleSetTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    localStorage.setItem('tutorly-theme', newTheme)
    applyTheme(newTheme)
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
