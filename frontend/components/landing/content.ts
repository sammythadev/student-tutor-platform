/* ──────────────────────────────────────────────────────────
   Landing copy, in one place.

   The desktop and mobile builds used to hold two divergent copies of this —
   the same stat was "Approximation guarantee" in one and "Fairness guarantee
   bound" in the other. One module, one truth.

   Every claim here traces to `Algorithm.md` at the repo root. In particular the
   four weighted criteria are that spec's α, β, γ, δ (academic fit, preferences,
   schedule, fairness), which sum to 1 — not the "schedule / style / budget /
   experience" list the old page named. Style and budget both live *inside*
   preferences; experience lives inside academic fit. Getting this wrong on the
   landing page of a research project is worse than any design flaw.
────────────────────────────────────────────────────────── */

export const BRAND = 'Tutorly'

export const NAV: readonly { label: string; href: string }[] = [
  { label: 'How it works', href: '#how' },
  { label: "Why it's fair", href: '#fair' },
  { label: 'Browse tutors', href: '/tutors' },
]

/* Named actions rather than "Get started". A CTA that says what happens next
   converts better and it is the one thing every generated page gets wrong. */
export const CTA = {
  primary: { label: 'Create your account', href: '/signup' },
  secondary: { label: 'Browse tutors first', href: '/tutors' },
  signIn: { label: 'Sign in', href: '/signin' },
} as const

export const HERO = {
  eyebrow: 'Built for Nigerian secondary schools',
  headline: 'Every tutor, ranked. Every rank, explained.',
  lead:
    'Tell us the subject, your level and when you are free. You get a shortlist with a score beside every name, the hours that actually overlap, and one place to book them.',
} as const

/* ── The four weighted criteria (Algorithm.md §1–§4) ──
   `weight` is the default α, β, γ, δ. `contribution` is this candidate set's
   points from that criterion, which is what the hero timeline fills in.
   Plain-language names, accurate mapping. */
export const CRITERIA = [
  {
    key: 'academic',
    label: 'Academic fit',
    detail: 'Do they teach it, at your level, well.',
    weight: 0.3,
  },
  {
    key: 'preference',
    label: 'How you learn',
    detail: 'Your pace, your budget, your side of town.',
    weight: 0.25,
  },
  {
    key: 'schedule',
    label: 'Hours you both have',
    detail: 'Hours you are free that they still have open.',
    weight: 0.25,
  },
  {
    key: 'fairness',
    label: 'Spread across tutors',
    detail: 'Nobody gets buried under twenty students.',
    weight: 0.2,
  },
] as const

export type CriterionKey = (typeof CRITERIA)[number]['key']

/* ── The worked example the hero scrubs through ──
   Illustrative, and labelled as such in the UI (see HeroRanking). The sub-scores
   are the inputs; every number the page shows is derived from them by the same
   weighted sum the engine uses, so the copy can never drift from the animation.

   The ordering is deliberately chosen so the list re-orders three times as the
   criteria weigh in: Ibrahim overtakes Adaeze on preferences, Chinedu overtakes
   her on schedule, and she reclaims second place once fairness applies. That
   last swap is the whole argument for having a fairness weight at all. */
export const REQUEST = {
  subject: 'Physics',
  level: 'SS3 (WAEC)',
  slots: 'Tue & Thu, 4pm to 6pm',
  budget: '₦4,000 to ₦6,000 / hour',
  style: 'Visual, steady pace',
} as const

export type Candidate = {
  name: string
  teaches: string
  /** Sub-scores in [0,1], one per CRITERIA key, in CRITERIA order. */
  scores: readonly [number, number, number, number]
  /** Set when the subject pre-filter removes them before any scoring. */
  filtered?: string
}

export const CANDIDATES: readonly Candidate[] = [
  { name: 'Adaeze O.',  teaches: 'Physics, Further Maths', scores: [0.99, 0.94, 0.70, 1.00] },
  { name: 'Chinedu A.', teaches: 'Physics, Chemistry',     scores: [0.90, 0.82, 1.00, 0.74] },
  { name: 'Grace N.',   teaches: 'Literature, Government', scores: [0, 0, 0, 0], filtered: 'does not teach Physics' },
  { name: 'Ibrahim K.', teaches: 'Physics, Mathematics',   scores: [0.98, 0.96, 0.98, 0.94] },
  { name: 'Folake B.',  teaches: 'Physics',                scores: [0.82, 0.78, 0.76, 0.80] },
]

/** Weighted sum over the first `upTo` criteria (all four when omitted), 0..1. */
export function scoreThrough(c: Candidate, upTo: number = CRITERIA.length): number {
  let total = 0
  for (let i = 0; i < upTo; i++) total += CRITERIA[i].weight * c.scores[i]
  return total
}

/** Eligible candidates, best first, after `upTo` criteria have weighed in. */
export function rankedThrough(upTo: number = CRITERIA.length): Candidate[] {
  return CANDIDATES.filter(c => !c.filtered).sort(
    (a, b) => scoreThrough(b, upTo) - scoreThrough(a, upTo),
  )
}

export const SUBJECTS: readonly string[] = [
  'Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology',
  'Further Mathematics', 'Economics', 'Government', 'Literature in English',
  'Computer Science', 'Financial Accounting', 'Geography', 'Agricultural Science',
  'Civic Education', 'Commerce', 'Technical Drawing',
]

/* Text ordinals, not numbered circles. The round-number-in-a-circle three-step
   is the most recognisable generated-page tell there is. */
export const STEPS: readonly { ordinal: string; title: string; body: string }[] = [
  {
    ordinal: 'First',
    title: 'Say what you need',
    body: 'Subject, level, the hours you are free and what you can spend. A tutor who does not teach your subject never reaches your list.',
  },
  {
    ordinal: 'Then',
    title: 'Read the shortlist',
    body: 'Every name comes back with a score and the four things behind it. Change what matters and it reorders, free, as often as you like.',
  },
  {
    ordinal: 'After that',
    title: 'Book a real slot',
    body: 'Pick from hours the tutor still has open. The confirmation reaches both of you and lands on one shared schedule.',
  },
]

/* What a student or a parent actually asks. Short, specific, no exam answers. */
export const FAQ: readonly { q: string; a: string }[] = [
  {
    q: 'Can a tutor pay to appear higher?',
    a: 'No. There is no promoted slot to buy and no advertising anywhere in Tutorly, so the order you see is the order the scores produced.',
  },
  {
    q: 'What does it cost?',
    a: 'Nothing. Tutorly is a final-year research project, so there is no plan to choose and no card to enter.',
  },
  {
    q: 'What if nobody teaches my subject at my level?',
    a: 'You get an empty list rather than a near miss, and a place on the waitlist. When a verified tutor opens up, you are allocated one without re-applying.',
  },
  {
    q: 'Can I change what matters most to me?',
    a: 'Yes, and it takes one drag. Move any of the four sliders and the shortlist reorders while you watch.',
  },
]

export const CLOSE = {
  headline: 'Set your weights, and read the list it produces.',
  body: 'Free to use. Tutorly is a final-year research project, so there is no plan to pick and nothing to cancel.',
} as const

/* Only destinations that exist. The old footer linked /privacy and /terms,
   neither of which is a route in this app. */
export const FOOTER: readonly { heading: string; links: readonly { label: string; href: string }[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Browse tutors', href: '/tutors' },
      { label: 'How it works', href: '#how' },
      { label: "Why it's fair", href: '#fair' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Sign in', href: '/signin' },
      { label: 'Create an account', href: '/signup' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
]

export const FOOTER_NOTE =
  'Student and tutor matchmaking, built for Nigerian secondary schools.'

/* ── Product surfaces ──
   Three real captures, described as what they actually show. */
export const SURFACES: readonly {
  eyebrow: string; title: string; body: string
  shot: string; w: number; h: number; focus: string; alt: string
}[] = [
  {
    eyebrow: 'One schedule',
    title: 'Both sides looking at the same week',
    body: 'Book from the hours a tutor actually has left. The next session is one tap from joining.',
    shot: '/shot-schedules.png', w: 1920, h: 878, focus: 'object-left-top',
    alt: 'The shared week and month schedule in Tutorly',
  },
  {
    eyebrow: 'It works both ways',
    title: 'Tutors get a ranked list too',
    body: 'The same criteria run in the other direction, so a tutor sees the students they can genuinely help.',
    shot: '/shot-tutors.png', w: 1920, h: 878, focus: 'object-left-top',
    alt: 'The tutor view in Tutorly, listing students with a match percentage against each',
  },
]

export const SHOWCASE = {
  eyebrow: 'And around it',
  headline: 'The schedule, and the other side of the match.',
} as const

export const TUNE = {
  eyebrow: 'Yours to set',
  headline: 'Decide what counts. Watch the list follow.',
  body: 'Four sliders, no settings page. Drag one and the shortlist reorders in front of you.',
} as const
