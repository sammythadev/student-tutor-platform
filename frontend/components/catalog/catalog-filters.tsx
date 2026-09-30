"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDownIcon, SlidersHorizontalIcon } from "lucide-react";

export type SortKey = "score" | "rating" | "price_asc" | "price_desc";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Best match" },
  { key: "rating", label: "Top rated" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
];

/** `0` stands for "no minimum". */
export const RATING_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Any rating" },
  { value: 3, label: "3 stars & up" },
  { value: 4, label: "4 stars & up" },
  { value: 4.5, label: "4.5 stars & up" },
];

/**
 * Price ceilings, `0` meaning "no maximum".
 *
 * Presets instead of the range slider this replaced. A slider hides its value
 * until you are already dragging it, needs a precision touch drag on a phone,
 * and gave this control none of the cues the others have. A named ceiling reads
 * the same at every width and is one tap.
 */
export function rateOptions(rateMax: number): { value: number; label: string }[] {
  const ceilings = [2000, 5000, 10000, 20000].filter((value) => value < rateMax);
  return [
    { value: 0, label: "Any price" },
    ...ceilings.map((value) => ({ value, label: `Up to \u20a6${value.toLocaleString()}` })),
    { value: rateMax, label: `Up to \u20a6${rateMax.toLocaleString()}` },
  ];
}

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
  className?: string;
  /**
   * Draw this bar's own border and padding. Set `false` when the caller drops it
   * inside a larger surface (see `FindTutors`) so the two do not read as two
   * stacked boxes.
   */
  surface?: boolean;
};

/**
 * One dropdown stacked under its own visible label.
 *
 * The name is set with `aria-label` rather than `<label for>` because the trigger
 * renders a `<button>`, and a label element does not name a button. The current
 * value is folded into that name too, so the control is not announced as a bare
 * "button" whose selection is only recoverable from the visible text.
 */
function FilterField({
  id,
  label,
  currentValueLabel,
  value,
  onValueChange,
  children,
  className,
}: {
  id: string;
  label: string;
  currentValueLabel: string;
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <span className="block text-xs font-medium text-[var(--text-secondary)]">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} aria-label={`${label}: ${currentValueLabel}`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

/**
 * Every tutor filter, in one bar that is a disclosure on a phone and an open row
 * on a desktop.
 *
 * Replaces a 240px desktop rail plus a separate sticky mobile toolbar whose
 * Filters button opened a bottom sheet: two full implementations of the same
 * three controls, each with its own arrangement and its own behaviour at the
 * 1024px boundary, so rotating a tablet moved the controls rather than reflowing
 * them.
 *
 * The collapsing is mobile-only on purpose. Four labelled dropdowns cost a third
 * of a phone screen, so they are worth a tap to reveal. On a desktop they fit on
 * one line, and hiding working controls behind a disclosure when nothing is being
 * saved is pure cost.
 *
 * Clearing lives in ActiveFilters, which shows each term as a removable chip, so
 * there is no second "clear all" here competing with it.
 */
export function CatalogFilterBar(props: CatalogFilterProps) {
  const [open, setOpen] = useState(false);

  const rateMax = props.rateMax ?? 20000;
  const rates = rateOptions(rateMax);
  const ratingLabel =
    RATING_OPTIONS.find((option) => option.value === props.minRating)?.label ?? "Any rating";
  const rateLabel = rates.find((option) => option.value === props.maxRate)?.label ?? "Any price";
  const sortLabel =
    SORT_OPTIONS.find((option) => option.key === props.sortBy)?.label ?? "Best match";
  const subjectLabel = props.selectedSubject === "All" ? "All subjects" : props.selectedSubject;

  // Sort is not counted: it reorders the same results rather than narrowing them,
  // so listing it under "Filters" would misstate what the number means.
  const activeCount =
    (props.minRating > 0 ? 1 : 0) +
    (props.maxRate > 0 ? 1 : 0) +
    (props.selectedSubject !== "All" ? 1 : 0);

  const panelId = "catalog-filter-fields";

  return (
    <section
      aria-label="Filters"
      className={cn(
        // `surface={false}` drops this bar's own border, fill and rounding so the
        // caller can host it inside one larger panel next to the search field,
        // instead of the two reading as stacked boxes.
        props.surface === false ? "min-w-0" : "rounded-lg border bg-surface-2",
        props.className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-full cursor-pointer items-center justify-between gap-2 px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
      >
        <span className="flex min-w-0 items-center gap-2">
          <SlidersHorizontalIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">
            Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </span>
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-[var(--text-secondary)] transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {/* Two columns on a phone, so four controls cost two rows rather than four;
          one wrapping row from `md`. The `open`/`hidden` pair is on the same
          element as `grid`/`md:flex`, so no two display values ever collide. */}
      <div
        id={panelId}
        className={cn(
          "gap-3",
          // Hosted inside a larger panel: that panel already provides the padding,
          // so adding it here would inset the controls twice.
          props.surface === false ? "" : "p-3 md:p-4",
          open ? "grid grid-cols-2" : "hidden md:flex",
          "md:flex md:flex-wrap md:items-end",
        )}
      >
        {props.subjects.length > 1 && (
          <FilterField
            id="catalog-subject"
            label="Subject"
            currentValueLabel={subjectLabel}
            value={props.selectedSubject}
            onValueChange={props.onSubject}
            className="col-span-2 md:min-w-[12rem] md:flex-1"
          >
            <SelectItem value="All">All subjects</SelectItem>
            {props.subjects
              .filter((subject) => subject !== "All")
              .map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
          </FilterField>
        )}

        <FilterField
          id="catalog-rating"
          label="Rating"
          currentValueLabel={ratingLabel}
          value={String(props.minRating)}
          onValueChange={(value) => props.onMinRating(Number(value))}
          className="md:min-w-[9rem] md:flex-1"
        >
          {RATING_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </FilterField>

        <FilterField
          id="catalog-rate"
          label="Hourly rate"
          currentValueLabel={rateLabel}
          value={String(props.maxRate)}
          onValueChange={(value) => props.onMaxRate(Number(value))}
          className="md:min-w-[9rem] md:flex-1"
        >
          {rates.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </FilterField>

        <FilterField
          id="catalog-sort"
          label="Sort by"
          currentValueLabel={sortLabel}
          value={props.sortBy}
          onValueChange={(value) => props.onSortBy(value as SortKey)}
          className="col-span-2 md:min-w-[10rem] md:flex-1"
        >
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.key} value={option.key}>
              {option.label}
            </SelectItem>
          ))}
        </FilterField>
      </div>
    </section>
  );
}
