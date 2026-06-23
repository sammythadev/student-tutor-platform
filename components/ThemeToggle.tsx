'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/lib/theme-context'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="w-10 h-10" />
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-full glass-card transition-colors duration-200 hover:bg-opacity-80"
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-yellow-400" strokeWidth={2.5} />
      ) : (
        <Moon className="w-4 h-4 text-blue-400" strokeWidth={2.5} />
      )}
    </button>
  )
}
