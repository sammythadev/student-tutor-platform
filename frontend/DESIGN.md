# Design System: Tutorly Landing Page

> **How to use this file:** The DESIGN.md rules (sections 1–8) tell Stitch *how* to design. The
> **Reference HTML** (section 9) is the *current implementation* — the real landing page rendered as
> semantic HTML with Tailwind classes, so Stitch sees the exact structure, copy, and token usage
> before regenerating screens. Use the rules as the source of truth; use the HTML as visual + content
> context.

---

## 1. Visual Theme & Atmosphere
A **premium SaaS landing page** for a Nigerian student-tutor matchmaking platform. The atmosphere is
**confident, warm-dark, and motion-rich** — like a high-end product launch (Linear × Vercel × Duolingo).
Deep charcoal surfaces with a single blue accent, generous breathing room, and spring-physics motion
that makes every interaction feel weighty and intentional. The hero is a **cinematic dark canvas**
with a composed photographic element and floating proof card — never flat, never all-white.

- **Density:** 4 (Art Gallery Airy) — generous spacing, max 65ch body text
- **Variance:** 6 (Offset Asymmetric) — asymmetric hero split, bento grid, no symmetrical 3-column rows
- **Motion:** 8 (Fluid with Spring Physics) — spring physics on all interactions, perpetual
  micro-loops on decorative elements, staggered cascade reveals

## 2. Color Palette & Roles
- **Deep Canvas** (#0A0A0A) — Hero background, dark section background, footer. Near-black, not pure #000
- **Surface White** (#FFFFFF) — Card backgrounds in light sections, text on dark backgrounds
- **Surface Card** (#FAFAFA) — Light section cards, bento cells
- **Charcoal Ink** (#171717) — Primary text in light mode, matches Geist foreground
- **Muted Steel** (#8F8F8F) — Secondary text, descriptions, metadata in light mode
- **White/70** (rgba(255,255,255,0.70)) — Secondary text on dark backgrounds
- **White/10** (rgba(255,255,255,0.10)) — Borders on dark backgrounds, subtle structural lines
- **Blue Signal** (#0072F5) — Single accent. Used only for: link text, focus rings, status indicators.
  NOT for button backgrounds or decorative elements
- **Emerald Dot** (#45A557) — Minimal status green for trust badges, verified indicators
- **Banned:** Pure black (#000), purple/neon gradients, oversaturated reds, warm/cool mixing

## 3. Typography Rules
- **Display/Headlines:** Geist Sans — Track-tight (-0.03em to -0.04em), weight-driven hierarchy
  (600 semibold only). Scale uses `clamp()`. No gradient text on large headers — use opacity or color
- **Body:** Geist Sans — Relaxed leading (1.5–1.6), 65ch max-width, Muted Steel color
- **Mono:** Geist Mono — For code, metadata, timestamps only
- **Dashboard Constraint:** Sans-Serif exclusively (Geist Sans + Geist Mono)
- **Banned:** Inter, serif fonts, generic system fonts

## 4. Component Stylings
- **Buttons:** Flat, no outer glow. Tactile `scale(0.97)` on active/pressed. White fill on dark
  backgrounds, black fill on light. Secondary variants use ghost/outline with border. Only one primary
  CTA per section. No "Learn more" secondary links
- **Cards:** Generously rounded corners (16px / rounded-2xl). Diffused shadow on hover. Used only when
  elevation serves hierarchy. In high-density areas, use border-top dividers instead of cards
- **Inputs/Forms:** Label above, error below. Focus ring in Blue Signal. No floating labels. Standard
  gap spacing (0.5rem)
- **Loaders:** Skeletal shimmer matching exact layout dimensions — no circular spinners
- **Empty States:** Composed compositions indicating how to populate data — not just "No data" text
- **Stat Badge:** Pill-shaped (`rounded-full`), border, small icon + text, for trust indicators
- **Floating Proof Card:** Translucent glass backdrop (`backdrop-blur-md`), border, subtle shadow,
  sits offset from the hero image

## 5. Layout Principles
- **Hero:** Asymmetric split — left-aligned text column (1.1fr) + right image column (0.9fr).
  Centered hero is BANNED for this project (variance > 4)
- **No overlapping elements** — every element occupies its own clear spatial zone
- **3-column equal card rows BANNED** — use bento/asymmetric grids (2+1, 1+2, 4-col alternating)
- **CSS Grid** over Flexbox for page-level layouts. Max-width containment at 1280px. Section padding
  `py-16` / `py-24`
- **Full-height sections** use `min-h-[100dvh]` — never `h-screen`
- **Mobile-First Collapse (< 768px):** all multi-column layouts collapse to single column. No
  horizontal scroll. Headlines scale via `clamp()`, body min 14px, touch targets ≥ 44px
- **Navigation:** Desktop horizontal nav collapses to clean mobile toggle. Sticky, dark, translucent

## 6. Motion & Interaction
- **Spring Physics default:** `stiffness: 100, damping: 20` — premium, weighty feel. No linear easing
- **Perpetual Micro-Interactions:** Aurora background mesh (pulse-breathe), marquee row (infinite
  scroll), stat numbers (count-up on intersection), floating proof card (subtle float loop)
- **Staggered Orchestration:** Hero elements cascade in with delays 0 / 0.08 / 0.16 / 0.24 / 0.32s.
  Section reveals use `whileInView` with `once: true` and cascade delays
- **Performance:** Animate exclusively via `transform` and `opacity`. Never animate `top`, `left`,
  `width`, `height`
- **Reduced Motion:** `useReducedMotion()` on all motion/react components. CSS
  `prefers-reduced-motion: reduce` disables marquee, pulse, and float animations

## 7. Section Structure (Top to Bottom)
1. **Navigation** — Sticky dark header, translucent backdrop-blur. Logo left, nav center, sign-in +
   get-started right. Mobile: hamburger toggle
2. **Hero** — Dark canvas with aurora mesh. Left: trust badge, headline (gradient fade on last words),
   subtext, two CTAs (primary "Get started free", ghost "Browse tutors"), trust stats row. Right:
   framed product photo (signin-hero.jpg, 4:3) + floating proof card (97% match, star rating, glass)
   offset -bottom-6 -left-6
3. **Marquee** — Dark strip, horizontally scrolling subject names, gradient fade edges, border-y
4. **Stats** — Light tinted section (bg-muted/40). White card with shadow. 4-column grid of count-up
   numbers + labels. Rounded-2xl
5. **Features (Bento)** — Full-width. 3-column grid. Cell 1 (lg:col-span-2): dark primary bento cell
   with aurora + tag chips. Cells 2–4: white cards (icon, title, body)
6. **How Matching Works** — Dark section (bg-black). 4-column grid of glass cards (border, bg-white/5,
   backdrop-blur-sm). Icon, title, body
7. **How It Works** — Light section. 3-column grid of step cards. Step number (circle), title, desc
8. **CTA Band** — Dark card with aurora. Centered headline, subtext, two CTAs. Rounded-2xl, contained
9. **Footer** — Dark with border-t. 3-column nav (Product, Account, Legal) + logo + description +
   copyright

## 8. Anti-Patterns (Banned)
- No emojis anywhere
- No Inter font (Geist is the project font)
- No pure black (#000000) — use #0A0A0A or similar
- No neon/outer glow shadows
- No oversaturated accents
- No excessive gradient text on large headers — one subtle fade on the hero headline's last words only
- No custom mouse cursors
- No overlapping elements
- No 3-column equal card layouts — use bento/asymmetric grids
- No generic names ("John Doe", "Acme", "Nexus")
- No fake round numbers (`99.99%`, `50%`)
- No AI copywriting clichés ("Elevate", "Seamless", "Unleash", "Next-Gen")
- No filler UI text: "Scroll to explore", "Swipe down", scroll arrows, bouncing chevrons
- No broken image links
- No centered Hero sections — asymmetric split only
- No "Learn more" secondary links — only primary CTAs with clear action labels
- No floating labels on inputs

---

## 9. Reference HTML — the current landing page

The exact structure, copy, and Tailwind classes of the shipped page. This is what Stitch should
regenerate (or surpass) using the rules above. Tailwind v4 utility classes; `size-*`, `bg-*`,
`text-*` etc. resolve against the design tokens in section 2.

```html
<!-- ============================================================
     TUTORLY — LANDING PAGE (reference implementation)
     Tailwind v4 · Geist Sans · motion/react spring physics
     ============================================================ -->

<!-- ── NAVIGATION (sticky, dark, translucent) ── -->
<header class="sticky top-0 z-50 border-b border-white/10 bg-black/70 text-white backdrop-blur-md">
  <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
    <!-- Logo -->
    <a href="/" class="flex items-center gap-2" aria-label="Tutorly home">
      <span class="flex size-8 items-center justify-center rounded-lg bg-white text-black">
        <!-- BookOpen icon (24px, stroke 2.25) -->
      </span>
      <span class="text-base font-semibold tracking-tight text-white">Tutorly</span>
    </a>

    <!-- Center nav (hidden on mobile) -->
    <nav class="hidden items-center gap-1 md:flex" aria-label="Primary">
      <a href="#how" class="rounded-md px-3.5 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">How it works</a>
      <a href="#features" class="rounded-md px-3.5 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">Features</a>
      <a href="/tutors" class="rounded-md px-3.5 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">Browse tutors</a>
    </nav>

    <!-- Right actions -->
    <div class="flex items-center gap-2">
      <a href="/signin" class="hidden rounded-md px-4 py-2 text-sm font-medium text-white/70 hover:text-white sm:inline-flex">Sign in</a>
      <a href="/signup" class="inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90">
        Get started <chevron-right class="size-3.5" />
      </a>
      <!-- Mobile hamburger (md:hidden) -->
    </div>
  </div>
</header>

<!-- ── HERO (dark canvas, asymmetric split 1.1fr / 0.9fr) ── -->
<section class="relative overflow-hidden bg-black text-white">
  <!-- Aurora mesh: 3 radial-gradient blobs, pulse-breathe animation, pointer-events-none -->

  <div class="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pt-16 pb-20 md:px-8
              lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pt-24 lg:pb-28">

    <!-- Left column: text -->
    <div class="min-w-0 space-y-6">
      <!-- Trust badge -->
      <div class="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80">
        <shield-check class="size-3.5 text-emerald-400" />
        Fairness-first matching for Nigerian secondary schools
      </div>

      <!-- Headline -->
      <h1 class="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
        The right tutor
        <span class="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
          changes everything.
        </span>
      </h1>

      <!-- Subtext -->
      <div class="space-y-3">
        <p class="text-lg font-medium text-white">
          For WAEC &amp; JAMB prep, A-levels, university entrance — any subject, any level.
        </p>
        <p class="max-w-[42ch] text-sm leading-relaxed text-white/70 sm:text-base">
          Fairness-first matching connects you with tutors based on your learning style, goals, and real compatibility.
        </p>
      </div>

      <!-- CTAs (one primary, one ghost) -->
      <div class="flex flex-col gap-3 sm:flex-row">
        <a href="/signup" class="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-medium text-black hover:bg-white/90 active:scale-[0.97]">
          Get started free <arrow-right class="size-4" />
        </a>
        <a href="/tutors" class="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/20 bg-white/5 px-6 text-sm font-medium text-white hover:bg-white/10 active:scale-[0.97]">
          Browse tutors
        </a>
      </div>

      <!-- Trust stats (3-up) -->
      <dl class="grid grid-cols-3 gap-4 border-t border-white/10 pt-6 lg:max-w-md">
        <div><dt class="sr-only">Criteria</dt><dd class="text-xl font-semibold text-white">4</dd>
          <p class="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-white/50">Criteria</p></div>
        <div><dt class="sr-only">Subject-checked</dt><dd class="text-xl font-semibold text-white">100%</dd>
          <p class="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-white/50">Subject-checked</p></div>
        <div><dt class="sr-only">Waitlist</dt><dd class="text-xl font-semibold text-white">Auto</dd>
          <p class="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-white/50">Waitlist</p></div>
      </dl>
    </div>

    <!-- Right column: photo as canvas + floating proof card -->
    <div class="relative">
      <div class="relative overflow-hidden rounded-2xl border border-white/10">
        <img src="/signin-hero.jpg" alt="Student and tutor working together in a session"
             width="1280" height="960" class="aspect-[4/3] w-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>
      </div>

      <!-- Floating proof card (animate-float, offset bottom-left) -->
      <div class="absolute -bottom-6 -left-6 w-64 rounded-xl border border-white/10 bg-black/80 p-4 backdrop-blur-md animate-float"
           style="box-shadow: var(--shadow-card-hover)">
        <div class="flex items-center gap-2">
          <div class="flex size-10 items-center justify-center rounded-lg bg-white/10 text-white">
            <!-- Sigma icon (24px) -->
          </div>
          <div>
            <p class="text-sm font-semibold text-white">97% match</p>
            <p class="text-xs text-white/60">Adaeze O. · Mathematics</p>
          </div>
        </div>
        <div class="mt-3 flex items-center gap-1 text-amber-400">
          <!-- 5 Star icons, filled, size-3.5 -->
          <span class="ml-1 text-xs font-medium text-white/60">4.9 · 212 reviews</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ── MARQUEE (dark strip, infinite scroll of subjects) ── -->
<section class="border-y border-white/10 bg-black py-6 text-white" aria-label="Subjects taught">
  <div class="relative overflow-hidden">
    <div class="flex w-max gap-10 animate-marquee">
      <!-- Subjects rendered twice for seamless loop:
           Mathematics English Physics Chemistry Biology "Further Maths"
           Economics Government Literature "Computer Science" Accounting Geography -->
    </div>
    <!-- edge fade gradients (from-black to-transparent, left + right, w-24) -->
  </div>
</section>

<!-- ── STATS (light tinted surface, count-up numbers) ── -->
<section class="relative bg-muted/40 py-16 lg:py-20" aria-label="Platform stats">
  <div class="mx-auto max-w-7xl px-4 md:px-8">
    <dl class="grid grid-cols-2 gap-y-10 rounded-2xl border bg-background p-8 md:grid-cols-4 md:p-12"
        style="box-shadow: var(--shadow-md)">
      <div class="text-center"><dd class="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">4</dd>
        <p class="mt-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Weighted match criteria</p></div>
      <div class="text-center"><dd class="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">½</dd>
        <p class="mt-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Approximation guarantee</p></div>
      <div class="text-center"><dd class="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">100%</dd>
        <p class="mt-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Subject-verified tutors</p></div>
      <div class="text-center"><dd class="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">0</dd>
        <p class="mt-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Manual steps to re-match</p></div>
    </dl>
  </div>
</section>

<!-- ── FEATURES (bento: dark 2-col cell + white cards) ── -->
<section id="features" class="mx-auto max-w-7xl px-4 py-16 md:px-8 lg:py-24">
  <div class="max-w-2xl">
    <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Everything you need to learn or teach.</h2>
    <p class="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
      Built for students and tutors in Nigeria, from WAEC prep to university coursework.
    </p>
  </div>

  <div class="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    <!-- Cell 1: dark primary bento (col-span-2) -->
    <div class="relative overflow-hidden rounded-2xl bg-primary p-7 text-primary-foreground lg:col-span-2">
      <!-- Aurora mesh opacity-40 -->
      <div class="relative flex h-full flex-col justify-between gap-6">
        <div>
          <div class="flex size-11 items-center justify-center rounded-xl bg-white/15 text-white"><!-- Sigma icon --></div>
          <h3 class="mt-4 text-xl font-semibold tracking-tight">Fairness-first matching</h3>
          <p class="mt-2 max-w-[52ch] text-sm leading-relaxed text-white/80">
            Our algorithm pairs you with tutors based on learning style, subject depth, and scheduling compatibility. Not just whoever is available.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white">Learning style</span>
          <span class="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white">Subject depth</span>
          <span class="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white">Schedule fit</span>
          <span class="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white">Budget range</span>
        </div>
      </div>
    </div>

    <!-- Cells 2–4: white cards -->
    <div class="rounded-2xl border bg-background p-7">
      <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><!-- CalendarCheck icon --></div>
      <h3 class="mt-4 text-lg font-semibold tracking-tight">Booking that just works</h3>
      <p class="mt-2 text-sm leading-relaxed text-muted-foreground">Pick a time, confirm, done. Both sides get instant confirmation — no back-and-forth messages.</p>
    </div>
    <div class="rounded-2xl border bg-background p-7">
      <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><!-- CheckCircle2 icon --></div>
      <h3 class="mt-4 text-lg font-semibold tracking-tight">Verified tutors only</h3>
      <p class="mt-2 text-sm leading-relaxed text-muted-foreground">Every tutor is subject-checked before they can appear in your list. No guesswork, no unqualified matches.</p>
    </div>
    <div class="rounded-2xl border bg-background p-7">
      <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><!-- Sparkles icon --></div>
      <h3 class="mt-4 text-lg font-semibold tracking-tight">Why this match</h3>
      <p class="mt-2 text-sm leading-relaxed text-muted-foreground">Every rank carries its reasons. Open any tutor to see exactly which criteria raised or lowered their score.</p>
    </div>
  </div>
</section>

<!-- ── HOW MATCHING WORKS (dark glass cards, 4-up) ── -->
<section id="how" class="bg-black py-16 text-white lg:py-24">
  <div class="mx-auto max-w-7xl px-4 md:px-8">
    <div class="max-w-2xl">
      <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Every match can be explained.</h2>
      <p class="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">
        No black box and no pay-to-rank. The same four rules decide every pairing, and each one traces straight back to your profile.
      </p>
    </div>

    <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div class="flex size-10 items-center justify-center rounded-xl bg-white/10 text-white"><!-- Funnel icon --></div>
        <h3 class="mt-4 text-base font-semibold tracking-tight">Subject is a hard filter</h3>
        <p class="mt-2 text-sm leading-relaxed text-white/60">Tutors who do not teach what you need never reach your list. Subject is a filter, not a weighted preference, so there is nothing to trade it away against.</p>
      </div>
      <div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div class="flex size-10 items-center justify-center rounded-xl bg-white/10 text-white"><!-- Sigma icon --></div>
        <h3 class="mt-4 text-base font-semibold tracking-tight">Four criteria, one score</h3>
        <p class="mt-2 text-sm leading-relaxed text-white/60">Availability overlap, learning style, budget and experience each feed a single match score. You can see exactly why a tutor ranked where they did.</p>
      </div>
      <div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div class="flex size-10 items-center justify-center rounded-xl bg-white/10 text-white"><!-- Scale icon --></div>
        <h3 class="mt-4 text-base font-semibold tracking-tight">Assignment stays fair</h3>
        <p class="mt-2 text-sm leading-relaxed text-white/60">A greedy assignment with a proven ½-approximation bound spreads students across tutors instead of piling everyone onto the few most popular ones.</p>
      </div>
      <div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div class="flex size-10 items-center justify-center rounded-xl bg-white/10 text-white"><!-- ShieldCheck icon --></div>
        <h3 class="mt-4 text-base font-semibold tracking-tight">Waitlisting is automatic</h3>
        <p class="mt-2 text-sm leading-relaxed text-white/60">If every eligible tutor is full, you keep your place in the queue and a seat is allocated the moment one frees up. You never have to re-apply.</p>
      </div>
    </div>
  </div>
</section>

<!-- ── HOW IT WORKS (light, 3 numbered steps) ── -->
<section class="mx-auto max-w-7xl px-4 py-16 md:px-8 lg:py-24" aria-label="How it works">
  <div class="grid gap-10 lg:grid-cols-3">
    <div class="relative">
      <div class="flex h-full flex-col gap-4">
        <span class="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">1</span>
        <h3 class="text-xl font-semibold tracking-tight">Find your perfect tutor</h3>
        <p class="text-sm leading-relaxed text-muted-foreground">Our algorithm matches you with tutors based on learning style, subject depth, and schedule. Not just whoever is available.</p>
      </div>
    </div>
    <div class="relative">
      <div class="flex h-full flex-col gap-4">
        <span class="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">2</span>
        <h3 class="text-xl font-semibold tracking-tight">Book a session in seconds</h3>
        <p class="text-sm leading-relaxed text-muted-foreground">Pick a time, confirm, and done. Seamless calendar integration with instant booking confirmations sent to both sides.</p>
      </div>
    </div>
    <div class="relative">
      <div class="flex h-full flex-col gap-4">
        <span class="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">3</span>
        <h3 class="text-xl font-semibold tracking-tight">Track real progress</h3>
        <p class="text-sm leading-relaxed text-muted-foreground">Interactive lessons, shared whiteboards, session recordings, and a progress dashboard that shows exactly how far you have come.</p>
      </div>
    </div>
  </div>
</section>

<!-- ── CTA (dark band with aurora, centered) ── -->
<section class="mx-auto max-w-7xl px-4 pb-20 md:px-8 lg:pb-28">
  <div class="relative overflow-hidden rounded-2xl bg-black px-6 py-14 text-center text-white sm:px-12">
    <!-- Aurora mesh opacity-40 -->
    <div class="relative">
      <h2 class="mx-auto max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
        Create an account and get your first ranked matches in minutes.
      </h2>
      <p class="mx-auto mt-4 max-w-[42ch] text-sm leading-relaxed text-white/60 sm:text-base">
        The right tutor changes everything. Free to start, no commitment.
      </p>
      <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a href="/signup" class="inline-flex h-11 items-center gap-2 rounded-md bg-white px-7 text-sm font-medium text-black hover:bg-white/90 active:scale-[0.97]">
          Get started free <arrow-right class="size-4" />
        </a>
        <a href="/tutors" class="inline-flex h-11 items-center justify-center rounded-md border border-white/20 bg-white/5 px-7 text-sm font-medium text-white hover:bg-white/10 active:scale-[0.97]">
          Browse tutors
        </a>
      </div>
    </div>
  </div>
</section>

<!-- ── FOOTER (dark, 3-col nav) ── -->
<footer class="border-t border-white/10 bg-black text-white">
  <div class="mx-auto max-w-7xl px-4 py-10 md:px-8">
    <div class="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
      <div class="max-w-sm">
        <div class="flex items-center gap-2">
          <span class="flex size-7 items-center justify-center rounded-lg bg-white text-black"><!-- BookOpen icon --></span>
          <span class="text-base font-semibold tracking-tight">Tutorly</span>
        </div>
        <p class="mt-3 text-sm leading-relaxed text-white/60">Student–tutor matchmaking built for Nigerian secondary schools.</p>
      </div>
      <nav class="grid grid-cols-2 gap-8 sm:grid-cols-3" aria-label="Footer">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-white/40">Product</p>
          <ul class="mt-3 space-y-2">
            <li><a href="/tutors" class="text-sm text-white/60 hover:text-white">Browse tutors</a></li>
            <li><a href="/dashboard" class="text-sm text-white/60 hover:text-white">Dashboard</a></li>
            <li><a href="#how" class="text-sm text-white/60 hover:text-white">How it works</a></li>
          </ul>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-white/40">Account</p>
          <ul class="mt-3 space-y-2">
            <li><a href="/signin" class="text-sm text-white/60 hover:text-white">Sign in</a></li>
            <li><a href="/signup" class="text-sm text-white/60 hover:text-white">Create account</a></li>
          </ul>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-white/40">Legal</p>
          <ul class="mt-3 space-y-2">
            <li><a href="/privacy" class="text-sm text-white/60 hover:text-white">Privacy policy</a></li>
            <li><a href="/terms" class="text-sm text-white/60 hover:text-white">Terms of service</a></li>
          </ul>
        </div>
      </nav>
    </div>
    <p class="mt-10 border-t border-white/10 pt-6 text-xs text-white/40">© 2026 Tutorly. Final-year research project.</p>
  </div>
</footer>
```

---

## Notes for Stitch
- **Font:** Geist Sans is loaded via Next.js `next/font` — keep the same stack; never substitute Inter.
- **Icons:** lucide-react, `size-*` utility for sizing, `stroke-width` 2 (2.25 for logo marks). Never
  use emoji or unicode glyphs as icons.
- **Motion:** hero cascade delays `[0, 0.08, 0.16, 0.24, 0.32]`, spring `{ stiffness: 100, damping: 20 }`,
  reveals `whileInView` + `once`. Perpetual loops: `animate-marquee`, `animate-float`,
  `animate-pulse-breathe` (CSS), count-up (motion `animate`). All gated behind
  `prefers-reduced-motion` / `useReducedMotion`.
- **Imagery:** the only real asset is `/signin-hero.jpg` (4:3). All other visuals are CSS-generated
  (aurora mesh, gradients) — keep it that way; no stock-photo dependency.
