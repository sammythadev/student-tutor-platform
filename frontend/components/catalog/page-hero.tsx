"use client";

import Link from "next/link";
import type * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type PageHeroStat = {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  label: string;
  value: string;
};

export type PageHeroAction = {
  label: string;
  href: string;
  variant?: "primary" | "outline";
};

/**
 * Shared page header (dashboards, catalog pages, admin).
 * Purposeful fade-up on load only; no decorative motion.
 */
export function PageHero({
  title,
  description,
  stats,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  stats?: PageHeroStat[];
  actions?: PageHeroAction[];
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-6", className)}>
      <div className="min-w-0 max-w-2xl">
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          {title}
        </motion.h1>
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
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="flex shrink-0 flex-wrap items-center gap-2"
        >
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                action.variant === "primary" || !action.variant
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border bg-background text-foreground hover:bg-accent"
              )}
            >
              {action.label}
            </Link>
          ))}
        </motion.div>
      )}
    </div>
  );
}
