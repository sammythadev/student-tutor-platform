"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";
import { SubjectFilter } from "@/components/catalog/subject-filter";
import { RatingPicker } from "@/components/catalog/rating-picker";
import { PriceSlider } from "@/components/catalog/price-slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SlidersHorizontalIcon, XIcon } from "lucide-react";

export type SortKey = "score" | "rating" | "price_asc" | "price_desc";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Best match" },
  { key: "rating", label: "Top rated" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
];

export type CatalogFilterProps = {
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
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pb-5">
      <p className="catalog-rail-section-title">{title}</p>
      {children}
    </div>
  );
}

function SortSelect({
  sortBy,
  onSortBy,
  id,
}: {
  sortBy: SortKey;
  onSortBy: (key: SortKey) => void;
  id: string;
}) {
  return (
    <Select value={sortBy} onValueChange={value => onSortBy(value as SortKey)}>
      <SelectTrigger id={id} aria-label="Sort tutors">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.key} value={option.key}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Subject plus the two range controls, shared verbatim by the desktop rail and
 * the mobile sheet so the two can never drift apart.
 *
 * Price and rating sit behind a single-select accordion. Expanded, all three
 * groups made the rail a wall of controls and pushed the result count off the
 * screen; collapsed, one is open at a time and the trigger carries the current
 * value so nothing is hidden without a label.
 */
function FilterGroups({
  subjects,
  selectedSubject,
  onSubject,
  minRating,
  onMinRating,
  maxRate,
  onMaxRate,
  rateMax,
  showSubjectSearch,
}: Omit<CatalogFilterProps, "sortBy" | "onSortBy" | "hasFilters" | "onReset" | "className" | "rateMax"> & {
  /** Non-optional: `groupProps` resolves the default before it gets here. */
  rateMax: number;
  showSubjectSearch: boolean;
}) {
  return (
    <div>
      {subjects.length > 1 && (
        <Section title="Subject">
          <SubjectFilter
            subjects={subjects}
            value={selectedSubject}
            onChange={onSubject}
            showSearch={showSubjectSearch}
          />
        </Section>
      )}
      <Accordion className="border-t">
        <AccordionItem value="rating">
          <AccordionTrigger>
            <span className="flex min-w-0 flex-wrap items-center gap-x-2">
              Minimum rating
              {minRating > 0 && (
                <span className="text-sm font-normal text-muted-foreground">{minRating} and up</span>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <RatingPicker value={minRating} onChange={onMinRating} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="price">
          <AccordionTrigger>
            <span className="flex min-w-0 flex-wrap items-center gap-x-2">
              Hourly rate
              {maxRate > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  up to {maxRate.toLocaleString()}
                </span>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <PriceSlider min={0} max={rateMax} value={maxRate} onChange={onMaxRate} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/** How many filter terms `onReset` clears — shared by the rail badge and the toolbar. */
function countActiveFilters(props: CatalogFilterProps): number {
  return (
    (props.minRating > 0 ? 1 : 0) +
    (props.maxRate > 0 ? 1 : 0) +
    (props.selectedSubject !== "All" ? 1 : 0) +
    (props.sortBy !== "score" ? 1 : 0)
  );
}

function groupProps(props: CatalogFilterProps) {
  return {
    subjects: props.subjects,
    selectedSubject: props.selectedSubject,
    onSubject: props.onSubject,
    minRating: props.minRating,
    onMinRating: props.onMinRating,
    maxRate: props.maxRate,
    onMaxRate: props.onMaxRate,
    // The slider's ceiling is a display concern, not a filter, so the default
    // lives here rather than at each call site.
    rateMax: props.rateMax ?? 20000,
  };
}

/**
 * The persistent 240px rail. Rendered as a direct grid child at `lg` and up.
 * Exported separately from the mobile toolbar because a `position: sticky`
 * element placed inside a grid cell can only stick within that cell's own
 * height — the toolbar has to live in normal page flow to stay pinned.
 */
export function CatalogFilters(props: CatalogFilterProps) {
  const { sortBy, onSortBy, hasFilters, onReset, className } = props;
  return (
    // `!` is load-bearing: `.catalog-rail` sets `display: flex` from *unlayered*
    // CSS, and in Tailwind v4 unlayered rules outrank the `utilities` layer, so a
    // plain `hidden` loses to it and the rail would never collapse on mobile.
    <aside className={cn("catalog-rail hidden! lg:flex!", className)} aria-label="Filters">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--text-secondary)]">Filters</p>
        {hasFilters && (
          <Button variant="ghost" className="h-11 gap-1" onClick={onReset}>
            <XIcon className="size-4" aria-hidden="true" /> Clear
          </Button>
        )}
      </div>
      <div className="rounded-lg border bg-card p-4">
        <FilterGroups {...groupProps(props)} showSubjectSearch={false} />
        <div className="mt-4 border-t pt-5">
          <p className="catalog-rail-section-title">Sort by</p>
          <SortSelect id="catalog-sort-rail" sortBy={sortBy} onSortBy={onSortBy} />
        </div>
      </div>
    </aside>
  );
}

/**
 * Below `lg` a 240px rail either squeezes the grid to one narrow column or
 * scrolls out of reach, so the same controls collapse into a sticky toolbar
 * whose Filters button opens them in a bottom sheet, with sort kept inline
 * because reordering is a one-tap action that should not cost a sheet.
 */
export function CatalogFilterToolbar(props: CatalogFilterProps) {
  const { sortBy, onSortBy, hasFilters, onReset } = props;
  const activeCount = countActiveFilters(props);

  return (
    <div className="sticky top-[var(--spacing-header,3.5rem)] z-30 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur lg:hidden">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-11 flex-1 justify-start gap-2 shadow-none">
              <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] gap-0 pb-0">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Narrow the tutors you see.</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
              <FilterGroups {...groupProps(props)} showSubjectSearch />
            </div>
            <SheetFooter className="border-t">
              <Button variant="outline" className="h-11" onClick={onReset} disabled={!hasFilters}>
                Clear all
              </Button>
              <SheetClose asChild>
                <Button className="h-11">Show tutors</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <div className="w-[10.5rem] shrink-0">
          <SortSelect id="catalog-sort-toolbar" sortBy={sortBy} onSortBy={onSortBy} />
        </div>
      </div>
    </div>
  );
}
