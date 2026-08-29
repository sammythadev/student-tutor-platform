"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";
import { FilterChip } from "@/components/catalog/filter-chip";
import { RatingPicker } from "@/components/catalog/rating-picker";
import { PriceSlider } from "@/components/catalog/price-slider";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";

export type SortKey = "score" | "rating" | "price_asc" | "price_desc";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Best match" },
  { key: "rating", label: "Top rated" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border pb-5 last:border-0 last:pb-0">
      <p className="catalog-rail-section-title">{title}</p>
      {children}
    </div>
  );
}

/**
 * Left sticky filter rail for catalog pages (marketplace grammar).
 * Sections are optional — render what the page's data supports.
 */
export function CatalogFilters({
  subjects,
  selectedSubject,
  onSubject,
  minRating,
  onMinRating,
  maxRate,
  onMaxRate,
  rateMax = 20000,
  sortBy,
  onSortBy,
  hasFilters,
  onReset,
  className,
}: {
  subjects: string[];
  selectedSubject: string;
  onSubject: (subject: string) => void;
  minRating: number;
  onMinRating: (value: number) => void;
  maxRate: number;
  onMaxRate: (value: number) => void;
  rateMax?: number;
  sortBy: SortKey;
  onSortBy: (key: SortKey) => void;
  hasFilters: boolean;
  onReset: () => void;
  className?: string;
}) {
  return (
    <aside className={cn("catalog-rail", className)} aria-label="Filters">
      <div className="flex items-center justify-between">
        <p className="catalog-rail-section-title mb-0">Filters</p>
        {hasFilters && (
          <Button
            variant="ghost"
            size="xs"
            className="gap-1 text-muted-foreground"
            onClick={onReset}
          >
            <X className="size-3" aria-hidden="true" /> Clear
          </Button>
        )}
      </div>

      <div className="space-y-5 rounded-lg border bg-background p-4">
        {subjects.length > 1 && (
          <Section title="Subject">
            <div className="flex flex-wrap gap-1.5">
              {subjects.map((subject) => (
                <FilterChip
                  key={subject}
                  active={selectedSubject === subject}
                  onClick={() => onSubject(subject)}
                >
                  {subject === "All" ? "All" : subject}
                </FilterChip>
              ))}
            </div>
          </Section>
        )}

        <Section title="Minimum rating">
          <RatingPicker value={minRating} onChange={onMinRating} />
        </Section>

        <Section title="Hourly rate">
          <PriceSlider
            min={0}
            max={rateMax}
            value={maxRate}
            onChange={onMaxRate}
          />
        </Section>

        <Section title="Sort by">
          <div className="flex flex-col gap-1">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => onSortBy(option.key)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  sortBy === option.key
                    ? "bg-accent font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    sortBy === option.key ? "bg-primary" : "bg-transparent"
                  )}
                  aria-hidden="true"
                />
                {option.label}
              </button>
            ))}
          </div>
        </Section>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <SlidersHorizontal className="size-3.5" aria-hidden="true" />
        Results update as you filter
      </div>
    </aside>
  );
}
