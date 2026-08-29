'use client'

import { useEffect, useState } from 'react'

type Band = {
  /** Inclusive start hour in local time. */
  from: number
  lines: string[]
}

/**
 * Time-of-day greetings. Each band holds a few variants; one is picked per
 * calendar day so the copy changes daily without flickering between renders.
 */
const BANDS: Band[] = [
  { from: 0, lines: ['Still up, {name}?', 'Hi night owl, {name}', 'Burning the midnight oil, {name}'] },
  { from: 5, lines: ['Early start, {name}', 'Morning, {name} — you beat the sun', 'Up with the birds, {name}'] },
  { from: 8, lines: ['Good morning, {name}', 'Morning, {name}', 'Fresh start, {name}'] },
  { from: 12, lines: ['Good afternoon, {name}', 'Afternoon, {name}', 'Halfway there, {name}'] },
  { from: 17, lines: ['Good evening, {name}', 'Evening, {name}', 'Winding down, {name}?'] },
  { from: 21, lines: ['Late one, {name}', 'Evening, {name} — one more session?', 'Still going, {name}'] },
]

function bandFor(hour: number): Band {
  let match = BANDS[0]
  for (const band of BANDS) if (hour >= band.from) match = band
  return match
}

export function timeOfDayGreeting(name: string, now: Date = new Date()): string {
  const band = bandFor(now.getHours())
  const dayIndex = Math.floor(now.getTime() / 86_400_000)
  return band.lines[dayIndex % band.lines.length].replace('{name}', name)
}

/**
 * Renders `fallback` on the server and first paint, then swaps to the
 * time-aware greeting after mount. Avoids a hydration mismatch, since the
 * server's clock and timezone need not match the visitor's.
 */
export function useTimeOfDayGreeting(name: string, fallback: string): string {
  const [greeting, setGreeting] = useState(fallback)

  useEffect(() => {
    setGreeting(timeOfDayGreeting(name))
    // Re-check hourly so a long-lived tab keeps up with the clock.
    const id = setInterval(() => setGreeting(timeOfDayGreeting(name)), 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [name])

  return greeting
}
