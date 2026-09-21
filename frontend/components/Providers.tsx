'use client'

import { ToastProvider } from '@/lib/toast-context'
import { ThemeProvider } from '@/lib/theme-context'
import { TooltipProvider } from '@/components/ui/tooltip'
import { OfflineIndicator } from '@/components/OfflineIndicator'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <ToastProvider>
          {children}
          <OfflineIndicator />
        </ToastProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
