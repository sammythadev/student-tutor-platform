"use client";

import { cn } from "@/lib/utils";
import { accentFor, IDENTITY_BG } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import { WhyThisMatchDialog } from "@/components/match/why-this-match";
import { readExplanation, type MatchExplanation } from "@/lib/api/match-explanation";
import { BadgeCheck, CalendarPlus, Heart, MessageSquare } from "lucide-react";

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
  /** Per-candidate "why this match" payload from the matchmaking endpoint. */
  explanation?: MatchExplanation;
};

export type CatalogCardAction =
  | { kind: "book"; label?: string; onClick: () => void }
  | { kind: "message"; label?: string; onClick: () => void }
  | { kind: "view"; label?: string; onClick: () => void };

/**
 * One person, as a card in a grid.
 *
 * Cards laid out in a grid are harder to compare than a list, because each one
 * can put its fields in a different place. The fix is to make the field order
 * identical in every card and hold each block to a fixed height: name on one
 * line, meta on one line, rating on a row that keeps its height when a tutor has
 * no ratings yet, subjects and bio clamped, and the price and buttons pinned to
 * the bottom edge. Same field, same place, same height, so the eye can run down a
 * column of three and compare like with like.
 *
 * `view` is rendered as a target covering the whole card rather than a third
 * button: a tertiary action does not fit a narrow tile, and clicking anywhere on
 * a card to open it is what the pattern leads people to expect.
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
  const parts = data.name.trim().split(/\s+/).filter(Boolean);
  const initials = `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase() || "?";

  // A percentage next to a disabled Book button reads as a contradiction, so an
  // unbookable tutor shows its blocking reason and nothing else.
  const matchPct = data.disabled ? undefined : data.matchPct;
  const explanation = readExplanation(data.explanation);
  // The "Why?" trigger doubles as the card's match figure, so it only replaces
  // that text when there is a score worth explaining.
  const scoredExplanation = explanation?.eligibility.isEligible ? explanation : null;

  const viewAction = actions.find((action) => action.kind === "view");
  const inlineActions = actions.filter((action) => action.kind !== "view");
  const hasFooter = Boolean(data.price) || inlineActions.length > 0;

  return (
    <article
      className={cn(
        "catalog-card relative flex h-full min-w-0 flex-col",
        viewAction &&
          "transition-[box-shadow,border-color] duration-150 hover:border-[var(--border-strong)] hover:shadow-md"
      )}
    >
      {viewAction && (
        <button
          type="button"
          onClick={viewAction.onClick}
          aria-label={viewAction.label ?? `View ${data.name}'s profile`}
          className="absolute inset-0 z-0 cursor-pointer rounded-[inherit] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      )}

      {/* Presentational wrapper, so a click anywhere lands on the card target
          above it. The buttons below opt back in with `pointer-events-auto`. */}
      <div className="pointer-events-none relative z-10 flex h-full min-w-0 flex-col">
        <div className="flex items-start gap-3 p-4 pb-3">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full text-base font-semibold",
              IDENTITY_BG[accentFor(data.id)]
            )}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-1.5">
              {/* h3, not h2: the results heading is the section's h2, and a tutor
                  name inside a card should not outrank it in the outline. */}
              <h3 className="line-clamp-1 min-w-0 text-base font-semibold text-foreground">
                {data.name}
              </h3>
              {data.verified && (
                <BadgeCheck
                  className="mt-0.5 size-4 shrink-0 text-[var(--accent-tracker)]"
                  aria-label="Verified"
                />
              )}
            </div>
            <div className="mt-1 flex min-h-5 flex-wrap items-center gap-2">
              {data.rating != null ? (
                <StarRating rating={data.rating} count={data.ratingCount} size="sm" showCount />
              ) : (
                <span className="text-xs text-[var(--text-secondary)]">No ratings yet</span>
              )}
              {matchPct != null && scoredExplanation && (
                /* Opts back out of the wrapper's `pointer-events-none` so the
                   "why this match" trigger stays clickable above the card target. */
                <span className="pointer-events-auto">
                  <WhyThisMatchDialog
                    explanation={scoredExplanation}
                    matchPct={matchPct}
                    accent={accentFor(data.id)}
                  />
                </span>
              )}
              {matchPct != null && !scoredExplanation && (
                <span className="text-xs font-medium text-[var(--accent-tutors)]">
                  {matchPct}% match
                </span>
              )}
            </div>
            {data.tagline && (
              <p className="mt-1 line-clamp-1 text-xs text-[var(--text-secondary)]">{data.tagline}</p>
            )}
          </div>
          {onToggleLike && (
            <button
              type="button"
              onClick={onToggleLike}
              aria-label={liked ? "Remove from saved" : "Save"}
              aria-pressed={!!liked}
              className={cn(
                "pointer-events-auto flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                liked
                  ? "bg-destructive/10 text-destructive"
                  : "text-[var(--text-secondary)] hover:bg-accent hover:text-foreground"
              )}
            >
              <Heart className="size-4" fill={liked ? "currentColor" : "none"} aria-hidden="true" />
            </button>
          )}
        </div>

        {data.subjects.length > 0 && (
          <p className="line-clamp-2 px-4 text-xs font-medium text-[var(--text-secondary)]">
            {data.subjects.join(" · ")}
          </p>
        )}
        {data.bio && (
          <p className="mt-1.5 line-clamp-2 px-4 text-sm leading-relaxed text-[var(--text-secondary)]">
            {data.bio}
          </p>
        )}
        {/* The reason is the only thing a blocked tutor shows: a plain, one-line
            statement of what stopped it, with no score and no statistics beside it. */}
        {data.disabled && data.disabledReason && (
          <p className="mx-4 mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive-text">
            {data.disabledReason}
          </p>
        )}

        {hasFooter && (
          <div className="mt-auto flex flex-col gap-3 border-t p-4">
            {data.price && (
              <p className="flex items-baseline gap-1">
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {data.price}
                </span>
                {data.priceSuffix && (
                  <span className="text-xs text-[var(--text-secondary)]">{data.priceSuffix}</span>
                )}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {inlineActions.map((action) => {
                if (action.kind === "book") {
                  return (
                    <Button
                      key="book"
                      className="pointer-events-auto h-11 w-full gap-2"
                      disabled={data.disabled}
                      onClick={action.onClick}
                    >
                      <CalendarPlus className="size-4" aria-hidden="true" />
                      {action.label ?? "Book session"}
                    </Button>
                  );
                }
                return (
                  <Button
                    key="message"
                    variant="outline"
                    className="pointer-events-auto h-11 w-full gap-2 shadow-none"
                    onClick={action.onClick}
                  >
                    <MessageSquare className="size-4" aria-hidden="true" />
                    {action.label ?? "Message"}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
