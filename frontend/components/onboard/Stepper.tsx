'use client'

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StepperProps {
  steps: { title: string }[]
  current: number
  onStepChange: (step: number) => void
  disabled?: boolean
}

/** Completed steps are editable; future steps cannot bypass validation. */
export function Stepper({ steps, current, onStepChange, disabled }: StepperProps) {
  return (
    <nav aria-label="Setup progress" className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="font-medium text-foreground">Step {current + 1} of {steps.length}</p>
        <p className="text-muted-foreground">
          {current === steps.length - 1 ? 'Finish your profile' : `Next: ${steps[current + 1].title}`}
        </p>
      </div>
      <ol className="grid grid-cols-5 gap-2 sm:gap-3">
        {steps.map((step, index) => {
          const complete = index < current
          const active = index === current
          return (
            <li key={step.title} aria-current={active ? 'step' : undefined} className="min-w-0">
              <Button
                type="button"
                variant="ghost"
                disabled={disabled || !complete}
                onClick={() => onStepChange(index)}
                aria-label={`${step.title}, ${complete ? 'completed, go back to edit' : active ? 'current step' : 'upcoming step'}`}
                className={cn(
                  'h-auto min-h-11 w-full flex-col items-start gap-2 whitespace-normal rounded-lg p-2 text-left disabled:opacity-100',
                  active ? 'bg-secondary text-foreground' : 'text-muted-foreground',
                )}
              >
                <span className={cn('flex size-6 items-center justify-center rounded-full border text-xs font-semibold',
                  complete ? 'border-primary bg-primary text-primary-foreground' : active ? 'border-primary text-foreground' : 'border-input')}
                >
                  {complete ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                </span>
                <span className="text-[10px] leading-4 sm:text-xs">{step.title}</span>
              </Button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
