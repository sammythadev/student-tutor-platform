"use client";

import { cn } from "@/lib/utils";

/**
 * Price range slider for filter rails. Uses a native range input styled with
 * Geist tokens; value shown as a formatted label. Purposeful only.
 */
export function PriceSlider({
  min,
  max,
  step = 1000,
  value,
  onChange,
  format = (v: number) => `₦${v.toLocaleString()}`,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{value === 0 ? "Any" : format(value)}</span>
        <span className="text-muted-foreground">max /hr</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Maximum hourly rate"
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        style={{
          background: `linear-gradient(to right, var(--primary) ${pct}%, var(--muted) ${pct}%)`,
        }}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
