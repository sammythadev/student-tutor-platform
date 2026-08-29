'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/lib/theme-context'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="size-9" />
  }

  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(next)}
          aria-label={`Switch to ${next} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="size-4 text-muted-foreground" />
          ) : (
            <Moon className="size-4 text-muted-foreground" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Switch to {next} mode
      </TooltipContent>
    </Tooltip>
  )
}
