'use client'

import { ToastProvider } from '@/lib/toast-context'
import { ThemeProvider } from '@/lib/theme-context'
import { TooltipProvider } from '@/components/ui/tooltip'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
