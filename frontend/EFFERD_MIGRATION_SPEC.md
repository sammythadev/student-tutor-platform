# Tutorly Frontend — Efferd Grammar Migration Spec

This file is the canonical spec for migrating remaining Tutorly pages to the
Efferd dashboard-2/dashboard-3 block grammar on the Geist token layer. Follow it
exactly. It is read by migration subagents; keep it concise and prescriptive.

## Goal

Every `app/(app)/**/page.tsx` (and its helper components) must stop using the
legacy Editorial Academy token system (`--surface`, `--text-primary`,
`--accent-*-bg`, `var(--accent-*-fg)`, old `@/components/Button`,
`@/components/Badge`, `@/components/Input`, `@/components/Modal`, old
`DashboardHero`) and render in the Efferd block grammar below, **while keeping
all data fetching, routing, handlers, and behaviour identical**. Do not change
API calls, state shapes, or business logic — only presentation.

## Core visual grammar

### Grid
Use the bordered `gap-px` grid for any multi-card section:
```
<div className="grid grid-cols-1 gap-px bg-border p-px md:grid-cols-2 lg:grid-cols-4">
```
Wide cards get `md:col-span-2`. This is THE signature Efferd look.

### Cards
- `DashboardCard` from `@/components/dashboard-card` — `rounded-none bg-background shadow-none ring-0`.
- `CardHeader`, `CardContent`, `CardFooter`, `CardTitle`, `CardDescription` from `@/components/ui/card`.
- Headers that sit above a list/table get `className="border-b"`.
- Full-bleed content uses `CardContent className="px-0"`.
- Stat cards: `CardTitle className="flex items-center gap-2 font-normal text-xs tracking-wide"` + `p className="font-semibold text-2xl tabular-nums"` + footer `className="gap-1 rounded-none bg-background text-xs"`.

### Delta badges
`@/components/delta` — `<Delta value={n} variant="badge"><DeltaIcon variant="trend" /><DeltaValue /></Delta>`. Positive = emerald, negative = rose. Use for week-over-week deltas; pass `null`/omit when no comparison.

### Buttons & badges
- `@/components/ui/button` (variants: `default`, `outline`, `secondary`, `ghost`, `link`, `destructive`; sizes incl. `sm`, `xs`, `icon`).
- `@/components/ui/badge` (variants: `default`, `secondary`, `outline`, `destructive`). For status pills use `variant="secondary"` with a leading colored dot `<span className={cn('size-1.5 rounded-full', dotClass)} />`.

### Tables
`@/components/ui/table` (Table, TableHeader, TableBody, TableRow, TableHead, TableCell). Rows `h-12`, right-aligned numerics get `text-right tabular-nums`, first/last cells `ps-6`/`pe-6`.

### Forms
`@/components/ui/input`, `@/components/ui/select` (native or shadcn), `@/components/ui/textarea`, `@/components/ui/label`, `@/components/ui/checkbox`. Wrap in a `Card` or plain `space-y-4` form layout.

### Empty states — CRITICAL
Never leave a block blank. When data is empty, render the **shape of the component** with a skeleton/placeholder figure so the user sees what it will look like:
- Use `@/components/ui/empty` (Empty, EmptyHeader, EmptyMedia variant="icon", EmptyTitle, EmptyDescription, EmptyContent) with a real icon and a helpful caption.
- For charts: render the chart frame with a dashed ring / zeroed axis and a caption, OR a `animate-pulse` skeleton block shaped like the chart.
- For lists/tables: show the `Empty` component with the icon + "No X yet" + a hint of what to do.
- Include placeholder "figures" (e.g. a muted `0` or `—`) rather than nothing.

### Animations
Use `motion` from `motion/react` for entrance:
```
const reduce = useReducedMotion()
<motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: stagger(index) }}>
```
`stagger` from `@/lib/ui` caps at 0.4s. Wrap page sections (grids, lists) in motion divs. Respect `useReducedMotion`.

### Colours / tokens
Use Geist tokens only: `bg-background`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `text-primary`, `border`, `bg-border`, `divide-border`, `bg-accent`. Accent identity chips for people/entities: soft 10% tint + coloured text, e.g.
```
const IDENTITY_BG = { lavender: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', mint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', sun: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', coral: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', tangerine: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' }
```
Avatar/initials chips: `<span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold', IDENTITY_BG[accentFor(id)])}>` using `accentFor` from `@/lib/ui`.

### Page header
Use `@/components/dashboard-hero` (DashboardHero) with `greeting`, `subtitle`, optional `stats` (`{ icon, label, value }`), and `actions` (`{ label, href, variant }`).

## DO NOT
- Do not use `@/components/Button`, `@/components/Badge`, `@/components/Input`, `@/components/Modal`, `@/components/DashboardHero` (old one), `@/components/Select`, `@/components/Dropdown`.
- Do not use `var(--surface)`, `var(--text-primary)`, `var(--accent-...)`, `font-heading`.
- Do not change API endpoints, payloads, or business logic.
- Do not delete components other pages import (e.g. shared modals like `SessionJoinModal`, `MessageModal`, `StarRating` — keep them unless trivially replaced).

## Verification
After editing, run `pnpm run typecheck` (must be clean) — the file you touch must not introduce TS errors.
