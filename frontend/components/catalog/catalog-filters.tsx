"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";
import { SubjectFilter } from "@/components/catalog/subject-filter";
import { RatingPicker } from "@/components/catalog/rating-picker";
import { PriceSlider } from "@/components/catalog/price-slider";
import { Button } from "@/components/ui/button";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

/** Responsive catalog filters; all controls share their caller's state. */
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
  const controls = (
    <>
      <Section title="Minimum rating">
        <RatingPicker value={minRating} onChange={onMinRating} />
      </Section>
      <Section title="Hourly rate">
        <PriceSlider min={0} max={rateMax} value={maxRate} onChange={onMaxRate} />
      </Section>
      <Section title="Sort by">
        <div className="flex flex-col gap-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onSortBy(option.key)}
              aria-pressed={sortBy === option.key}
              className={cn(
                "flex min-h-11 cursor-pointer items-center rounded-md px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                sortBy === option.key
                  ? "bg-accent font-semibold text-foreground"
                  : "text-[var(--text-secondary)] hover:bg-accent hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Section>
    </>
  );

  return (
    <aside className={cn("catalog-rail", className)} aria-label="Filters">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          {hasFilters ? "Filters active" : "Filters"}
        </p>
        {hasFilters && (
          <Button variant="ghost" className="min-h-11 gap-1" onClick={onReset}>
            <X className="size-4" aria-hidden="true" /> Clear
          </Button>
        )}
      </div>
      <div className="space-y-4 rounded-lg border bg-background p-4">
        {subjects.length > 1 && (
          <Section title="Subject">
            <SubjectFilter subjects={subjects} value={selectedSubject} onChange={onSubject} />
          </Section>
        )}
        <Collapsible className="lg:hidden">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="h-11 w-full justify-start">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              More filters
              <ChevronDown className="ml-auto size-4" aria-hidden="true" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">{controls}</CollapsibleContent>
        </Collapsible>
        <div className="hidden space-y-4 lg:block">{controls}</div>
      </div>
    </aside>
  );
}
