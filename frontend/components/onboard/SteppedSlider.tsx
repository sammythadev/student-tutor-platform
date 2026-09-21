'use client'

import { useId } from 'react'
import { RadioGroup } from 'radix-ui'

export interface StepOption {
  value: string
  label: string
  hint?: string
}

interface SteppedSliderProps {
  label: string
  options: StepOption[]
  value: string
  onChange: (value: string) => void
}

/** Named categories use one keyboard-operable radio group, not two controls. */
export function SteppedSlider({ label, options, value, onChange }: SteppedSliderProps) {
  const id = useId()
  const active = options.find(option => option.value === value)
  return (
    <div className="space-y-3">
      <p id={id} className="text-sm font-semibold text-foreground">{label}</p>
      <RadioGroup.Root value={value} onValueChange={onChange} aria-labelledby={id} aria-describedby={`${id}-hint`}
        className="grid grid-cols-3 gap-2">
        {options.map(option => (
          <RadioGroup.Item key={option.value} value={option.value}
            className="min-h-11 rounded-xl border border-input px-2 py-3 text-sm font-medium text-muted-foreground outline-none data-[state=checked]:border-primary data-[state=checked]:bg-secondary data-[state=checked]:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            {option.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      <p id={`${id}-hint`} className="min-h-5 text-sm text-muted-foreground">{active?.hint}</p>
    </div>
  )
}
