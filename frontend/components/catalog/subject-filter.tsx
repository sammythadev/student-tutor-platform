"use client";

import { useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterChip } from "@/components/catalog/filter-chip";

/** Searchable subject selection below lg; a chip list when there is room. */
export function SubjectFilter({
  subjects,
  value,
  onChange,
  allLabel = "All",
  className,
}: {
  subjects: string[];
  value: string;
  onChange: (subject: string) => void;
  allLabel?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  if (subjects.length <= 1) return null;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="lg:hidden">
        <Combobox.Root
          items={subjects}
          value={value}
          inputValue={query}
          onInputValueChange={setQuery}
          onValueChange={(subject) => { if (subject !== null) onChange(subject); }}
          onOpenChange={(open) => { if (!open) setQuery(""); }}
          itemToStringLabel={(subject) => subject === "All" ? allLabel : subject}
        >
          <Combobox.Trigger
            aria-label="Filter by subject"
            className="flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="min-w-0 flex-1 truncate">
              <Combobox.Value>{value === "All" ? allLabel : value}</Combobox.Value>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner align="start" sideOffset={4} collisionPadding={16} className="z-50 outline-none">
              <Combobox.Popup className="flex max-h-[min(18rem,50dvh,var(--available-height))] w-[var(--anchor-width)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md">
                <div className="shrink-0 border-b p-2">
                  <Combobox.Input
                    aria-label="Search subjects"
                    placeholder="Search subjects"
                    className="h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
                <Combobox.Empty className="p-4 text-sm text-muted-foreground">No subjects found</Combobox.Empty>
                <Combobox.List className="min-h-0 overflow-y-auto overscroll-contain p-1 outline-none data-empty:p-0">
                  {(subject: string) => (
                    <Combobox.Item
                      key={subject}
                      value={subject}
                      className="grid min-h-11 cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    >
                      <Combobox.ItemIndicator className="col-start-1"><Check className="size-4" aria-hidden="true" /></Combobox.ItemIndicator>
                      <span className="col-start-2 min-w-0 whitespace-normal break-words">{subject === "All" ? allLabel : subject}</span>
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      </div>
      <div className="hidden flex-wrap gap-1.5 lg:flex">
        {subjects.map((subject) => (
          <FilterChip key={subject} active={value === subject} onClick={() => onChange(subject)}>
            {subject === "All" ? allLabel : subject}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}
