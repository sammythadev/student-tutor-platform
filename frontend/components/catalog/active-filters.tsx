"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ActiveFilter = {
  id: string;
  label: string;
  onRemove: () => void;
};

/**
 * What the result set is currently narrowed by, each term individually
 * removable.
 *
 * Without this the only evidence of a filter is *which rows survived*, so
 * narrowing to nothing and having no tutors at all look identical. Renders
 * nothing when no filter is on — an empty summary bar is just chrome.
 */
export function ActiveFilters({
  filters,
  onClearAll,
  className,
}: {
  filters: ActiveFilter[];
  onClearAll: () => void;
  className?: string;
}) {
  if (filters.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1.5", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Filtering by
      </p>
      <ul className="flex flex-wrap items-center gap-1.5">
        {filters.map((filter) => (
          <li key={filter.id}>
            <button
              type="button"
              onClick={filter.onRemove}
              aria-label={`Remove filter: ${filter.label}`}
              className="catalog-filter-chip"
              data-active="false"
            >
              {filter.label}
              <XIcon className="size-3" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <Button variant="ghost" className="h-11 px-2 text-sm" onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  );
}