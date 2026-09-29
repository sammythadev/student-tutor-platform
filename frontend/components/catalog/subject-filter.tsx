"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterChip } from "@/components/catalog/filter-chip";

/**
 * Subject selection as chips at every width.
 *
 * This used to render a Combobox below `lg` and a chip list at `lg`+, so the
 * same control had two mental models and reflowed on rotate. Chips are the one
 * model: tappable, visible in a screenshot, and they wrap instead of collapsing.
 * The search box is opt-in (`showSearch`) and only the bottom sheet asks for it,
 * where the chip list is competing for vertical room with three other groups.
 */
export function SubjectFilter({
  subjects,
  value,
  onChange,
  allLabel = "All",
  showSearch = false,
  className,
}: {
  subjects: string[];
  value: string;
  onChange: (subject: string) => void;
  allLabel?: string;
  showSearch?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(subject => {
      if (subject === "All") return allLabel.toLowerCase().includes(q);
      return subject.toLowerCase().includes(q);
    });
  }, [subjects, query, allLabel]);

  if (subjects.length <= 1) return null;

  return (
    <div className={cn("min-w-0", className)}>
      {showSearch && (
        <div className="relative mb-3">
          <SearchIcon
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Find a subject"
            aria-label="Find a subject"
            className="h-11 w-full min-w-0 rounded-md border border-input bg-surface-2 pl-10 pr-3 text-base text-foreground outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-search-cancel-button]:appearance-none md:text-sm"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 lg:max-h-[calc(100dvh-18rem)] lg:overflow-y-auto lg:pr-1 lg:overscroll-contain">
        {visible.map((subject) => (
          <FilterChip key={subject} active={value === subject} onClick={() => onChange(subject)}>
            {subject === "All" ? allLabel : subject}
          </FilterChip>
        ))}
      </div>
      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground">No subject matches “{query.trim()}”.</p>
      )}
    </div>
  );
}
