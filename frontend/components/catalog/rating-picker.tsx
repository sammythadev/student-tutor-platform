"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Star rating picker for filter rails. Clicking a star selects "≥ that rating";
 * clicking the active star clears the filter. No hover animation, no spring.
 */
export function RatingPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const thresholds = [3, 4, 4.5];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {thresholds.map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? 0 : t)}
            className={cn(
              "catalog-filter-chip",
              active && "text-amber-600 dark:text-amber-400"
            )}
            data-active={active ? "true" : "false"}
          >
            <Star
              className={cn(
                "size-3.5",
                active && "fill-current"
              )}
              aria-hidden="true"
            />
            {t}+
          </button>
        );
      })}
    </div>
  );
}
