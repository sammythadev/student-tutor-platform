'use client'

import { useId } from 'react'
import { Slider } from '@base-ui/react/slider'

interface RangeSliderProps {
  min: number
  max: number
  step?: number
  value: number
  onChange: (value: number) => void
  format?: (v: number) => string
  label: string
  minLabel?: string
  maxLabel?: string
  hint?: string
}

/** Base UI owns pointer capture, touch and keyboard input. Values never remount. */
export function RangeSlider({ min, max, step = 1, value, onChange, format = String, label, minLabel, maxLabel, hint }: RangeSliderProps) {
  const id = useId()
  return (
    <Slider.Root min={min} max={max} step={step} largeStep={step * 10} value={value}
      onValueChange={onChange} thumbAlignment="edge" className="w-full min-w-0 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p id={id} className="text-sm font-semibold text-foreground">{label}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className="text-xl font-semibold tracking-tight text-foreground tabular-nums">{format(value)}</span>
      </div>
      <Slider.Control className="relative flex h-11 w-full touch-none select-none items-center">
        <Slider.Track className="relative h-2 w-full overflow-hidden rounded-full bg-input">
          <Slider.Indicator className="h-full rounded-full bg-primary" />
        </Slider.Track>
        <Slider.Thumb aria-labelledby={id} getAriaLabel={() => label}
          getAriaValueText={(_, amount) => `${format(amount)}${hint ? `, ${hint}` : ''}`}
          className="flex size-11 items-center justify-center rounded-full outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
          <span aria-hidden="true" className="size-6 rounded-full border-[3px] border-primary bg-background shadow-sm" />
        </Slider.Thumb>
      </Slider.Control>
      <div aria-hidden="true" className="flex justify-between gap-3 text-xs text-muted-foreground tabular-nums">
        <span>{minLabel ?? format(min)}</span>
        <span>{maxLabel ?? format(max)}</span>
      </div>
    </Slider.Root>
  )
}
