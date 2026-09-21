"use client";

import { cn } from "@/lib/utils";
import { accentFor, IDENTITY_BG } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { BadgeCheck, BookOpen, Heart, MessageSquare, ArrowUpRight } from "lucide-react";

export type CatalogCardData = {
  id: string;
  name: string;
  tagline?: string;
  rating?: string | number | null;
  ratingCount?: number;
  subjects: string[];
  bio?: string;
  price?: string | null;
  priceSuffix?: string;
  matchPct?: number;
  verified?: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

export type CatalogCardAction =
  | { kind: "book"; label?: string; onClick: () => void }
  | { kind: "message"; onClick: () => void }
  | { kind: "view"; onClick: () => void };

/** A static result article; only its explicit actions are interactive. */
export function CatalogCard({
  data,
  actions,
  liked,
  onToggleLike,
}: {
  data: CatalogCardData;
  actions: CatalogCardAction[];
  liked?: boolean;
  onToggleLike?: () => void;
}) {
  const parts = data.name.trim().split(/\s+/).filter(Boolean);
  const initials = `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <article className="catalog-card flex h-full min-w-0 flex-col" data-catalog-card="">
      <div className="flex items-start gap-3 p-4 pb-3">
        <div
          className={cn("flex size-14 shrink-0 items-center justify-center rounded-lg text-lg font-semibold", IDENTITY_BG[accentFor(data.id)])}
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <h2 className="min-w-0 break-words text-base font-semibold text-foreground">{data.name}</h2>
            {data.verified && <BadgeCheck className="mt-1 size-4 shrink-0 text-[var(--chip-green-fg)]" aria-label="Verified" />}
          </div>
          {data.tagline && <p className="break-words text-xs text-[var(--text-secondary)]">{data.tagline}</p>}
          {(data.rating != null || data.matchPct != null) && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {data.rating != null && <StarRating rating={data.rating} count={data.ratingCount} size="sm" showCount />}
              {data.matchPct != null && <span className="text-xs text-[var(--text-secondary)]">{data.matchPct}% match</span>}
            </div>
          )}
        </div>
        {onToggleLike && (
          <button
            type="button"
            onClick={onToggleLike}
            aria-label={liked ? "Remove from saved" : "Save"}
            aria-pressed={!!liked}
            className={cn(
              "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              liked ? "bg-destructive/10 text-destructive" : "text-[var(--text-secondary)] hover:bg-accent hover:text-foreground"
            )}
          >
            <Heart className="size-4" fill={liked ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        )}
      </div>
      {data.subjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {data.subjects.slice(0, 3).map((subject) => (
            <Badge key={subject} variant="secondary" className="max-w-full whitespace-normal break-words text-xs">{subject}</Badge>
          ))}
          {data.subjects.length > 3 && (
            <span className="self-center text-xs text-[var(--text-secondary)]" aria-label={`${data.subjects.length - 3} more subjects`}>+{data.subjects.length - 3}</span>
          )}
        </div>
      )}
      {data.bio && <p className="line-clamp-2 break-words px-4 pb-2 text-sm leading-relaxed text-[var(--text-secondary)]">{data.bio}</p>}
      {data.disabled && data.disabledReason && (
        <p className="mx-4 mb-2 break-words rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{data.disabledReason}</p>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
        {data.price && (
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold tabular-nums text-foreground">{data.price}</p>
            {data.priceSuffix && <p className="text-xs text-[var(--text-secondary)]">{data.priceSuffix}</p>}
          </div>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {actions.map((action) => {
            if (action.kind === "book") {
              return (
                <Button key="book" size="sm" className="h-11 min-w-11 gap-1.5" disabled={data.disabled} onClick={action.onClick}>
                  <BookOpen className="size-4" aria-hidden="true" />{action.label ?? "Book"}
                </Button>
              );
            }
            if (action.kind === "message") {
              return (
                <Button key="message" size="icon" className="size-11" variant="ghost" aria-label="Message" onClick={action.onClick}>
                  <MessageSquare className="size-4" aria-hidden="true" />
                </Button>
              );
            }
            return (
              <Button key="view" size="icon" className="size-11" variant="ghost" aria-label="View profile" onClick={action.onClick}>
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Button>
            );
          })}
        </div>
      </div>
    </article>
  );
}
