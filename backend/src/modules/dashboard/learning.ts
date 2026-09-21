/**
 * Learning metrics, computed from raw activity rather than from a counter column.
 *
 * `student_profiles.streak_days` and `total_hours_learned` are never written by any
 * flow, so a KPI fed from them is permanently zero. Everything here derives from what
 * actually happened — a topic marked complete, or an attended session — so the number
 * on the dashboard always matches the history the user can scroll.
 */

import type { ActivityRow } from './dashboard.types';

export interface Streaks {
  /** Consecutive days of activity ending today (or yesterday, while today is still young). */
  current: number;
  longest: number;
  activeDays: number;
}

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` → days since the epoch, so runs of consecutive days are integer runs. */
function dayNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function utcDayNumber(at: Date): number {
  return Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()) / DAY_MS;
}

/**
 * Current and longest run of consecutive active days. A day counts once, however much
 * happened on it, and today may still be empty without breaking the streak — the day is
 * not over until it is over.
 */
export function computeStreaks(days: string[], today: Date): Streaks {
  const unique = [...new Set(days)].map(dayNumber).sort((left, right) => left - right);
  if (unique.length === 0) return { current: 0, longest: 0, activeDays: 0 };

  let longest = 1;
  let run = 1;
  for (let index = 1; index < unique.length; index += 1) {
    run = unique[index] === unique[index - 1] + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  let current = 0;
  // Yesterday still counts while today has no activity yet; two idle days end the run.
  if (utcDayNumber(today) - unique[unique.length - 1] <= 1) {
    current = 1;
    for (let index = unique.length - 1; index > 0; index -= 1) {
      if (unique[index] !== unique[index - 1] + 1) break;
      current += 1;
    }
  }

  return { current, longest, activeDays: unique.length };
}

/**
 * The last `length` days as a dense strip, oldest first, so a chart can render a gap as
 * a zero without the caller having to know which days are missing from the query.
 */
export function buildActivityStrip(rows: ActivityRow[], today: Date, length = 14): ActivityRow[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const start = utcDayNumber(today) - (length - 1);
  return Array.from({ length }, (_, index) => {
    const date = new Date((start + index) * DAY_MS).toISOString().slice(0, 10);
    return byDate.get(date) ?? { date, hours: 0, topics: 0 };
  });
}

/** Percentage of a course's topics completed, rounded to a whole percent. */
export function coursePercent(completedTopics: number, totalTopics: number): number {
  if (totalTopics <= 0) return 0;
  return Math.round((completedTopics / totalTopics) * 100);
}

/** A course counts as finished once every one of its topics is done. */
export function isCourseFinished(completedTopics: number, totalTopics: number): boolean {
  return totalTopics > 0 && completedTopics >= totalTopics;
}
