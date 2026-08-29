"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Toggle chip for filter rails. No decorative motion — active state is a solid
 * primary background, hover only shifts border/text colour.
 */
export function FilterChip({
  active,
  onClick,
  children,
  className,
  count,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "catalog-filter-chip",
        className
      )}
      data-active={active ? "true" : "false"}
    >
      {children}
      {typeof count === "number" && (
        <span
          className={cn(
            "tabular-nums",
            active ? "text-primary-fg/70" : "text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
