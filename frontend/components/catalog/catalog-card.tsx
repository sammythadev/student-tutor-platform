"use client";

import type * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { accentFor, IDENTITY_BG } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import {
  BadgeCheck,
  BookOpen,
  Heart,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";

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

/**
 * Marketplace catalog card. No hover-lift, no stagger, no decorative motion —
 * only a pressed scale on the card's active state. Match % is a subtle chip.
 */
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
  const reduce = useReducedMotion();

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="catalog-card flex h-full flex-col"
      data-catalog-card=""
    >
      {/* Header: avatar + identity */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-lg text-lg font-semibold",
            IDENTITY_BG[accentForId(data.id)]
          )}
          aria-hidden="true"
        >
          {initialsOf(data.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[15px] font-semibold text-foreground">{data.name}</p>
            {data.verified && (
              <BadgeCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Verified" />
            )}
          </div>
          {data.tagline && (
            <p className="truncate text-xs text-muted-foreground">{data.tagline}</p>
          )}
          {(data.rating != null || data.matchPct != null) && (
            <div className="mt-1 flex items-center gap-2">
              {data.rating != null && (
                <StarRating rating={data.rating} count={data.ratingCount} size="sm" showCount />
              )}
              {data.matchPct != null && (
                <Badge
                  variant="outline"
                  className="gap-1 rounded-md border-emerald-500/30 bg-emerald-500/5 px-1.5 py-0 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
                >
                  {data.matchPct}% match
                </Badge>
              )}
            </div>
          )}
        </div>
        {onToggleLike && (
          <button
            type="button"
            onClick={onToggleLike}
            aria-label={liked ? "Remove from saved" : "Save"}
            className={cn(
              "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors",
              liked ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Heart className="size-4" fill={liked ? "currentColor" : "none"} />
          </button>
        )}
      </div>

      {/* Subjects */}
      {data.subjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {data.subjects.slice(0, 3).map((subject) => (
            <Badge key={subject} variant="secondary" className="text-[11px]">
              {subject}
            </Badge>
          ))}
          {data.subjects.length > 3 && (
            <span className="self-center text-[10px] font-medium text-muted-foreground">
              +{data.subjects.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Bio */}
      {data.bio && (
        <p className="line-clamp-2 px-4 pb-2 text-[13px] leading-relaxed text-muted-foreground">
          {data.bio}
        </p>
      )}

      {data.disabled && data.disabledReason && (
        <div className="mx-4 mb-2 rounded-md bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-600 dark:text-rose-400">
          {data.disabledReason}
        </div>
      )}

      {/* Footer: price + actions */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t px-4 py-3">
        {data.price ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tabular-nums text-foreground">{data.price}</p>
            {data.priceSuffix && (
              <p className="text-[10px] text-muted-foreground">{data.priceSuffix}</p>
            )}
          </div>
        ) : (
          <span />
        )}

        <div className="flex shrink-0 items-center gap-1.5">
          {actions.map((action) => {
            if (action.kind === "book") {
              return (
                <Button
                  key="book"
                  size="sm"
                  className="gap-1.5"
                  disabled={data.disabled}
                  onClick={action.onClick}
                >
                  <BookOpen className="size-3.5" aria-hidden="true" />
                  {action.label ?? "Book"}
                </Button>
              );
            }
            if (action.kind === "message") {
              return (
                <Button
                  key="message"
                  size="icon"
                  variant="outline"
                  aria-label="Message"
                  onClick={action.onClick}
                >
                  <MessageSquare className="size-4" />
                </Button>
              );
            }
            return (
              <Button
                key="view"
                size="icon"
                variant="outline"
                aria-label="View profile"
                onClick={action.onClick}
              >
                <ArrowUpRight className="size-4" />
              </Button>
            );
          })}
        </div>
      </div>
    </motion.article>
  );
}

/** Stable accent from a string id. */
function accentForId(id: string) {
  return accentFor(id);
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase() || "?";
}
