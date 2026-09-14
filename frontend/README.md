# Tutorly Frontend

Next.js 16 (App Router) client for the student–tutor matchmaking platform. It
owns the marketing landing page, sign-up/sign-in, onboarding, and the
role-scoped app surface (student, tutor, admin).

Data comes from the NestJS backend in `../backend` — this package owns no
server-side domain logic.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16, App Router, React 19 (RSC by default) |
| Styling | Tailwind CSS 4 (`@theme` tokens in `app/globals.css`) + shadcn/ui-style primitives on Radix |
| State | Zustand (`lib/store/authStore.ts`) for auth; URL/query state for shareable UI |
| Motion | `motion/react` (Framer Motion) for entrances/transitions, GSAP + Lenis for the landing page |
| Landing extras | `embla-carousel-react` (tile carousel), `cobe` (globe) |
| Icons | `lucide-react` |
| HTTP | Axios instance in `lib/axios.ts`, typed API modules in `lib/api/` |
| Dead code | `ts-prune` via `pnpm run deadcode` |

## Quickstart

```bash
pnpm install                 # from the repo root — it is a pnpm workspace
cd frontend
cp .env.example .env.local   # dev/start load this file explicitly
pnpm run dev
```

The dev server runs on `http://localhost:3000`. API calls go to the relative
path `/api/backend/*`, which `next.config.mjs` rewrites to `BACKEND_URL`
(`http://localhost:4000` by default), so start the backend on port 4000 first.

### Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base path the browser calls (default `/api/backend`) |
| `BACKEND_URL` | Rewrite target for `/api/backend/*` — the NestJS origin |

`.env` / `.env.local` are gitignored; only `.env.example` is committed.

### Scripts

| Command | What it does |
|---|---|
| `pnpm run dev` | Dev server with Fast Refresh |
| `pnpm run build` | Production build |
| `pnpm run start` | Serve the production build |
| `pnpm run lint` | ESLint 9 (flat config, `eslint-config-next`) |
| `pnpm run typecheck` | `tsc --noEmit` |
| `pnpm run deadcode` | `ts-prune` — reports exports nothing imports |

`next.config.mjs` also enables the image optimizer (AVIF/WebP) because the
landing page serves real product screenshots.

## Routes

Route groups keep the two shells apart: `(auth)` renders full-bleed pages with
no app chrome, `(app)` renders the authenticated shell.

| Route | Group | Purpose |
|---|---|---|
| `/` | — | Marketing landing page |
| `/signup`, `/signin` | `(auth)` | Account creation and sign-in |
| `/onboard` | `(auth)` | Role-aware onboarding (5 stages per role, live summary) |
| `/dashboard` | `(app)` | Student dashboard (tutor dashboard is separate) |
| `/tutors` | `(app)` | Ranked tutor catalog with filters |
| `/tutor-dashboard` | `(app)` | Tutor home |
| `/tutor-dashboard/find-students` | `(app)` | Student requests for a tutor |
| `/schedules` | `(app)` | Availability and upcoming sessions |
| `/messages` | `(app)` | Conversations |
| `/notifications` | `(app)` | Notification center |
| `/feed` | `(app)` | Activity feed |
| `/profile` | `(app)` | Profile management |
| `/settings` | `(app)` | Account settings |
| `/admin` | `(app)` | Admin overview |

## Directory layout

```
app/
  layout.tsx              root layout — fonts, theme provider
  globals.css             design tokens + mk-* type/utility layer
  page.tsx                landing page composition
  (auth)/                 signup, signin, onboard
  (app)/                  authenticated shell + role pages
components/
  ui/                     shadcn/ui-style primitives (Radix-based)
  landing/                landing sections; content.ts is the copy source of truth
  onboard/                onboarding question primitives (OptionCard, Stepper, sliders)
  catalog/                tutor catalog cards, filters, hero
  widgets/                dashboard widgets and charts
  reactbits/              decorative animation components
  <flat>.tsx              shared app components (AppShell, Modal, Button, …)
lib/
  api/                    typed API clients (auth, users, assignments, sessions, …)
  store/authStore.ts      Zustand auth state
  axios.ts                configured Axios instance
hooks/                    use-mobile and friends
public/                   icons and imagery; asset credits in public/CREDITS.md
types/                    ambient declarations
```

## Conventions

- **Server Components first.** Add `'use client'` at the lowest leaf that needs
  it — never on a page that only composes.
- **Primitives come from `components/ui/`.** Do not hand-roll a dialog, select,
  or popover; if a primitive is missing, add it to `components/ui/` in the
  shadcn style so the token layer keeps applying.
- **Copy lives in data, not markup.** Landing strings come from
  `components/landing/content.ts`; onboarding questions come from the stage
  definitions in the page/component files.
- **Tokens, not literals.** Colours, radii, spacing and type steps come from the
  custom properties in `app/globals.css`. The `mk-*` classes are the marketing
  layer (black canvas, measured type ladder) and are used by the landing page
  only. See `DESIGN.md` for the full system.
- **Accessibility is part of done.** Keyboard paths, visible focus rings,
  `aria-*` state on custom controls, and `prefers-reduced-motion` fallbacks.

## Design system

`DESIGN.md` is the authoritative spec (colour semantics, type scale, spacing,
motion). It is written to be read by both people and agents; the landing page
was rebuilt against a measured reference system, and the token set in
`app/globals.css` documents where each value came from.

## Testing

This package has **no test runner configured** — there is no Jest, Vitest,
Playwright or Testing Library setup, and no test script. The checks that exist
are `pnpm run typecheck`, `pnpm run lint` and `pnpm run deadcode`. Backend
coverage lives in `../backend` (`pnpm run test`, 102 unit tests).

Note on lint: Next.js 16 removed `next lint` and no longer lints during
`next build`, so ESLint is wired directly through `eslint.config.mjs`
(`eslint-config-next` Core Web Vitals + TypeScript rule-sets). It runs, but the
codebase is not clean against it yet — the bulk of the findings are
`react-hooks/set-state-in-effect`, `@typescript-eslint/no-explicit-any` and
unused variables.

## Related documentation

- `../README.md` — monorepo overview, backend setup, architecture
- `../Algorithm.md` — matchmaking algorithm the UI surfaces
- `DESIGN.md` — design system spec
- `../backend/docs/api.md` — endpoint reference the `lib/api/` clients wrap
