"use client";

import Link from "next/link";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PageHeroStat = {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  label: string;
  value: string;
};

/** Which product surface this hero belongs to; picks the accent for icon wells. */
export type PageHeroTone = "tutors" | "courses" | "tracker";

export type PageHeroAction = {
  label: string;
  href: string;
  variant?: "primary" | "outline";
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
};

/**
 * Icon-well fills per tone. A solid (monochrome) button cannot carry a tinted
 * well — the accent hues sit around 4–6:1 on white and fall below 3:1 on the
 * near-black primary fill — so it keeps a foreground-tinted well and the accent
 * only ever appears on the outline treatment.
 */
const TONE_WELL: Record<PageHeroTone, { solid: string; subtle: string }> = {
  tutors: {
    solid: "bg-primary-foreground/15 text-primary-foreground",
    subtle: "bg-accent-tutors/12 text-accent-tutors",
  },
  courses: {
    solid: "bg-primary-foreground/15 text-primary-foreground",
    subtle: "bg-accent-courses/12 text-accent-courses",
  },
  tracker: {
    solid: "bg-primary-foreground/15 text-primary-foreground",
    subtle: "bg-accent-tracker/12 text-accent-tracker",
  },
};

/** Shared static page header with optional supporting content and actions. */
export function PageHero({
  title,
  description,
  stats,
  actions,
  tone = "tutors",
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  stats?: PageHeroStat[];
  actions?: PageHeroAction[];
  tone?: PageHeroTone;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-6", className)}>
      <div className="min-w-0 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
        {stats && stats.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 text-sm">
                <stat.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-semibold tabular-nums text-foreground">{stat.value}</span>
                <span className="text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {actions && actions.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions.map((action) => {
            const isPrimary = action.variant === "primary" || !action.variant;
            return (
              <Button
                key={action.href}
                asChild
                variant={isPrimary ? "default" : "outline"}
                className="h-11"
              >
                <Link href={action.href}>
                  {action.icon && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-6 items-center justify-center rounded-md",
                        TONE_WELL[tone][isPrimary ? "solid" : "subtle"],
                      )}
                    >
                      <action.icon className="size-3.5" aria-hidden="true" />
                    </span>
                  )}
                  {action.label}
                </Link>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
