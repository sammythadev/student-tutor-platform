"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { STATUS_DOT } from "@/lib/ui";
import type { SessionItem } from "@/lib/api/sessions";

/**
 * Status badge: colored dot + label. Single source of truth for session/entity
 * status across catalog, dashboards and lists.
 */
export function StatusPill({
  status,
  className,
}: {
  status: SessionItem["status"];
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1.5 whitespace-nowrap", className)}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {status}
    </Badge>
  );
}
