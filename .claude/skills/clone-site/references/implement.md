# Implementing the clone in this project's stack

Read after step 3 of `SKILL.md`, once `tokens.md` exists.

## What you are building into

`frontend/` — Next.js 16 App Router, React 19, Tailwind CSS v4, TypeScript strict.

| Concern | What is already here | Use it |
| --- | --- | --- |
| Tokens | `app/globals.css`, 1100 lines, Tailwind v4 `@theme inline` over CSS custom properties | Add to it; never hex-literal in a component |
| Components | `components/ui/*`, shadcn `new-york`, `baseColor: neutral`, CSS variables on | Extend before authoring new primitives |
| Class merge | `lib/utils.ts` → `cn()` | Always, for any conditional class |
| Type | `geist` package — Geist Sans + Geist Mono, wired as `--font-geist-sans` / `--font-geist-mono` | Swap only if the target's face is materially different |
| Icons | `lucide-react` | `iconLibrary` is already lucide in `components.json` |
| Motion | `motion` v12, `gsap` + `@gsap/react` (ScrollTrigger), `lenis` for smooth scroll | Pick per section, see below |
| Primitives | `@base-ui/react`, `radix-ui` | Behaviour for menus, dialogs, popovers |
| 3D / canvas | `three`, `ogl` | Only if the target genuinely has it |
| Toasts, charts, dnd | `sonner`, `recharts`, `@dnd-kit/*` | Already available |
| Routing | `app/(app)/*` and `app/(auth)/*` route groups | Marketing clones belong outside both, at `app/` |

Extra shadcn registries are configured in `components.json` — `@react-bits`, `@efferd`,
`@aceternity`, `@21st`. When the target has a distinctive component (marquee, spotlight card,
animated beam) check these before hand-rolling it:
`pnpm dlx shadcn@latest add @aceternity/<name>`.

## Token mapping

`globals.css` already contains a worked precedent — its header reads
`Clone target: Vercel Geist (vercel.com/geist/colors)`. Read the top 120 lines before adding
anything; match that structure rather than inventing a parallel one.

| Measured (`design-*.json`) | Goes to |
| --- | --- |
| `colors.background[0..1].hex` | `--background`, `--card`, `--popover` (+ dark block) |
| `colors.text[0].hex` | `--foreground` |
| `colors.text[1..2].hex` | `--muted-foreground`, then a third text level if one exists |
| `colors.border[0].hex` | `--border`, `--input` |
| the one saturated hue in `colors.*` | `--primary` / `--ring`, with `--primary-foreground` for contrast |
| `radii[0..2]` | `--radius-md` (functional UI) and `--radius-xl` (cards) |
| `shadows[*]` | Verbatim into a `--shadow-*` custom property. Do not retype from memory. |
| `type.families[0]` | `--font-sans`; add the display face separately if headings differ |
| `type.sizes` | The type scale. Keep the target's ladder; do not substitute Tailwind defaults. |
| `spacing.padding` cluster | Confirm the base unit; Tailwind's 4px default usually already fits |
| `sections[].padTop/padBottom` | Section rhythm — its own scale, typically 64–160px, not the base unit |
| `layout.widestContent` | The container `max-w-*`; add an arbitrary value if it is not a Tailwind step |
| `layout.breakpoints` | Compare against Tailwind's 640/768/1024/1280/1536 and note deliberate differences |

Light and dark must be defined together, in lockstep, the way the existing file does it. If you
captured only one scheme, say so rather than inventing the other.

### If `cssVars` came back populated

A token-driven target hands you its system directly — check `cssVars` before deriving anything.
Two cautions: strip framework noise (Tailwind v4 emits its entire `--color-red-50…950` palette
into `:root`, none of which is a design decision), and keep only variables the page actually
references. Names are also worth reading on their own — they tell you how the target's designers
grouped their system, which is a shortcut to the right structure.

## Copy discipline

The goal is **visually faithful to the target, translated into real frontend** — not "inspired by".

Preserve: layout logic, spacing rhythm, section ordering, text/image balance, typography mood,
component family, density, and overall visual cleanliness.

## Anti-drift

The named failure mode: measurements are right, the coded result comes out generic. It happens
gradually, one convenient shortcut per section. Specifically do not:

- simplify a distinctive section into a default row of cards
- compress generous spacing into a denser layout because it "looks tighter"
- flatten a strong type hierarchy into uniform sizes
- merge distinct sections into one repeated pattern that was not in the target
- add nested containers, pills, badges, or micro-labels the target does not have
- improve the design mid-build

Re-open `ref-1440.png` every two or three sections and compare. Drift is invisible from inside the
code and obvious from the screenshot.

## Resolving ambiguity

When a detail is unclear, in this order:

1. Preserve the visible design language
2. Preserve layout and spacing logic
3. Preserve the component family
4. Preserve mood and polish level
5. Re-measure that specific element — `evaluate_script` on its selector returns exact computed values
6. Only then choose the most buildable faithful option

Do not reach for a generic default at step 1. Step 5 is cheap and usually ends the question.

## Motion

Read it off the target rather than inventing it. `motion.transitions` in the JSON gives
property/duration/easing triples; `motion.keyframes` names its animations; for a specific element,
`getComputedStyle(el).transitionTimingFunction` and `.transitionDuration`.

| Target behaviour | Build with |
| --- | --- |
| Hover, press, focus, small state change | CSS transition on `transform`/`opacity` — runs off the main thread |
| Enter/exit, layout change, gesture | `motion` (v12) |
| Scroll-pinned, scrubbed, or stacked sections | `gsap` + ScrollTrigger — already a dependency |
| Page-wide smooth scroll | `lenis`, only if the target actually has it |

Copy easing curves verbatim; a `cubic-bezier` is unguessable and a wrong one is felt immediately.
Keep UI transitions under 300ms unless the target is demonstrably slower. Honour
`prefers-reduced-motion` even when the target does not — drop movement, keep opacity.

## Before reporting done

From `frontend/`:

```bash
pnpm run typecheck     # tsc --noEmit
pnpm run lint          # eslint
pnpm run build         # catches RSC / client-boundary mistakes typecheck misses
```

`'use client'` is required for any component using GSAP, motion, lenis, or hooks — easy to miss
when porting a static page into the App Router, and `build` is what catches it.
