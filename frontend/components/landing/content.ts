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
  /* Points at the product frame. Deliberately in the reader's voice rather than
     the product's — it labels what they are looking at, not what we built. */
  annotation: 'Your shortlist, scored',
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
  headline: 'Find a tutor who fits, this week.',
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
      { label: 'Set the weights', href: '#tune' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Sign in', href: '/signin' },
      { label: 'Create an account', href: '/signup' },
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Profile', href: '/profile' },
      { label: 'Settings', href: '/settings' },
    ],
  },
  {
    heading: 'For tutors',
    links: [
      { label: 'Tutor dashboard', href: '/tutor-dashboard' },
      { label: 'Find students', href: '/tutor-dashboard/find-students' },
      { label: 'Availability', href: '/schedules' },
    ],
  },
  {
    heading: 'Sessions',
    links: [
      { label: 'Schedule', href: '/schedules' },
      { label: 'Messages', href: '/messages' },
      { label: 'Notifications', href: '/notifications' },
      { label: 'Activity', href: '/feed' },
    ],
  },
  {
    heading: 'Getting started',
    links: [
      { label: 'Onboarding', href: '/onboard' },
      { label: 'Create an account', href: '/signup' },
      { label: 'Browse first', href: '/tutors' },
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
  headline: 'Everything a match needs, and nothing it does not.',
  /* The dim second line of the display heading. A complete sentence, because the
     target's is: a trailing fragment in the subtlest ink reads as a rendering bug
     rather than as a deliberate two-tone heading. */
  trailing: 'Ten surfaces, one score.',
} as const

export const TUNE = {
  eyebrow: 'Yours to set',
  headline: 'Decide what counts. Watch the list follow.',
  body: 'Four sliders, no settings page. Drag one and the shortlist reorders in front of you.',
} as const

/* ── Hero frame surfaces ──
   The tab strip inside the product window. Each entry names a real surface of
   the app and carries the hue its charts key off, so switching tabs recolours
   the panel instead of only relabelling it. */
export const FRAME_TABS: readonly { key: string; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'workflow',  label: 'Matching' },
  { key: 'shortlist', label: 'Shortlist' },
  { key: 'schedule',  label: 'Schedule' },
]

/* ── Social proof, honestly framed ──
   A research project has no customer logos, and inventing some would be the one
   unforgivable thing on a page about not gaming rankings. What it does have is a
   syllabus, so the strip names the exam boards and subject spread it was built
   against. Same layout slot, no fabricated endorsement. */
export const PROOF = {
  caption: 'Built against the WAEC and NECO syllabus, across sixteen subjects',
  link: { label: 'See the subject list', href: '/tutors' },
  marks: [
    'WAEC', 'NECO', 'JAMB', 'Cambridge IGCSE', 'NERDC',
    'SS1', 'SS2', 'SS3', 'JSS3', 'Post-UTME',
  ],
} as const

/* ── Carousel tiles ──
   Two-line header per tile: the surface, then what it gives you. The second line
   is set in the muted ink, which is what makes the row scan as pairs.

   `kind` selects the miniature drawn inside the tile (see TileArt). Ten tiles
   sharing one generic mockup is what made the row read as empty no matter how
   long it was: the eye needs each card to be a different shape before a moving
   row means anything. `bg` varies the ground across four measured light values
   for the same reason -- the reference's row is off-white, cream and white, not
   ten of one grey. */
export type TileKind =
  | 'shortlist' | 'weights' | 'overlap' | 'booking' | 'waitlist'
  | 'bothSides' | 'messages' | 'sessions' | 'feedback' | 'fairness'

export const SHOWCASE_TILES: readonly {
  title: string; sub: string; hue: string; bg: string; kind: TileKind
}[] = [
  { title: 'Shortlist',   sub: 'with a score on every name', hue: '#4F8EF7', bg: '#f9fbfd', kind: 'shortlist' },
  { title: 'Weights',     sub: 'you set, in one drag',       hue: '#A855F7', bg: '#faf5ee', kind: 'weights' },
  { title: 'Overlap',     sub: 'only hours you both have',   hue: '#10A37F', bg: '#fefefe', kind: 'overlap' },
  { title: 'Booking',     sub: 'against real availability',  hue: '#C2860B', bg: '#ebecf0', kind: 'booking' },
  { title: 'Waitlist',    sub: 'instead of a near miss',     hue: '#E2557A', bg: '#f9fbfd', kind: 'waitlist' },
  { title: 'Both sides',  sub: 'tutors get a list too',      hue: '#4F8EF7', bg: '#faf5ee', kind: 'bothSides' },
  { title: 'Messages',    sub: 'once a match is made',       hue: '#10A37F', bg: '#fefefe', kind: 'messages' },
  { title: 'Sessions',    sub: 'one shared schedule',        hue: '#C2860B', bg: '#ebecf0', kind: 'sessions' },
  { title: 'Feedback',    sub: 'that moves the next score',  hue: '#A855F7', bg: '#f9fbfd', kind: 'feedback' },
  { title: 'Fairness',    sub: 'nobody buried, nobody idle', hue: '#E2557A', bg: '#faf5ee', kind: 'fairness' },
]

export const CRITERIA_INTRO = {
  heading: 'Four criteria, weighted, and nothing else.',
  lead: 'A score is a weighted sum of <em>four things you can name</em>. Subject match is a filter, not a term — a tutor who does not teach it never reaches your list, so <em>the number never rewards a near miss</em>.',
} as const

/* The two tall cells that open the criteria bento. Longer bodies than the four
   below them, because they carry the argument the four only illustrate. */
export const CRITERIA_CELLS: readonly { title: string; body: string }[] = [
  {
    title: 'The filter runs first',
    body: 'Level and subject are checked before anything is scored. It costs one pass over the candidates and it means the shortlist can be short and still be right.',
  },
  {
    title: 'Then one weighted sum',
    body: 'No hidden term, no tie-break you cannot see, and the same arithmetic on both sides of the match. Nothing is added to the score after the four criteria have spoken.',
  },
]

export const HOW_INTRO = {
  heading: 'Three steps, and the third one books.',
  lead: 'Say what you need, read what comes back, take a slot that exists. <em>No forms you fill twice</em> and no waiting on a reply to find out whether a tutor was free.',
} as const

/* The 2x2 under the steps: what the reader gets out of it, one line each. */
export const HOW_BENEFITS: readonly { title: string; body: string }[] = [
  { title: 'A reason beside the rank',   body: 'Every score opens into the four numbers that produced it.' },
  { title: 'Hours that actually exist',  body: 'Availability is the tutor\'s own calendar, not a claim in a profile.' },
  { title: 'Reordering is free',         body: 'Ask again with different priorities as often as you like. Nothing is charged and nothing is lost.' },
  { title: 'A place, not a near miss',   body: 'If nobody qualifies you get the waitlist, and an allocation when one opens.' },
]

/* The dim 48px line that closes the section. Long enough to wrap to two lines at
   desktop, which is what gives it its weight. */
export const STATEMENT = 'A ranking is only worth reading if you can see what made it.'

export const TUNE_INTRO = {
  heading: 'Set the weights. Read the list it produces.',
  lead: 'Four sliders and no settings page. Drag one and <em>the shortlist reorders in front of you</em> — the same weighted sum the engine runs, in the browser.',
} as const

/* Shown under the demo, tab-switched. Illustrative of the request shape, in the
   project's own API vocabulary. */
export const TUNE_SNIPPETS: readonly { key: string; label: string; code: string }[] = [
  {
    key: 'request',
    label: 'Request',
    code: `POST /matchmaking/requests
{
  "subject": "Physics",
  "level": "SS2",
  "weights": { "academic": 0.3, "preference": 0.25,
               "schedule": 0.25, "fairness": 0.2 },
  "availability": [{ "day": "TUE", "from": "16:00", "to": "18:00" }]
}`,
  },
  {
    key: 'response',
    label: 'Response',
    code: `{
  "assignments": [
    { "tutor": "Ibrahim K.", "score": 0.967,
      "terms": { "academic": 0.98, "preference": 0.96,
                 "schedule": 0.98, "fairness": 0.94 } },
    { "tutor": "Adaeze O.", "score": 0.906 }
  ],
  "filteredOut": [{ "tutor": "Grace N.", "reason": "subject" }]
}`,
  },
  {
    key: 'weights',
    label: 'Weights',
    code: `// Algorithm.md, section 1-4. The four weights sum to 1.
score = a * academicFit
      + b * preferenceFit
      + g * scheduleOverlap
      + d * fairness;

// subject and level are a pre-filter, never a weighted term
`,
  },
]

export const TRUST_INTRO = {
  heading: 'Why the order can be trusted.',
  lead: 'No promoted slots, no advertising, and <em>a bound on how far the greedy pass can fall short</em> of the optimal assignment. The evaluation harness is in the repository.',
} as const

/* Attributed to the work, not to a person: there are no customers to quote. */
/* Four quotable facts, not four testimonials. This project has no customers to
   quote, so the rotator carries what the harness and the spec actually say, each
   attributed to the thing that produced it. Order matters: the first is the
   strongest claim, and it is the one that renders on the server. */
export const TRUST_QUOTES: readonly { quote: string; source: string; detail: string; badge: string }[] = [
  {
    quote:
      'A greedy best-match-first pass is within half of the optimal total score, and on the seeded fixtures it lands well above that bound.',
    source: 'Evaluation harness',
    detail: 'pnpm run eval:gap · greedy against min-cost max-flow',
    badge: 'ev',
  },
  {
    quote:
      'Subject match is a filter, not a weight. A tutor who does not teach the subject is never ranked low — they are never ranked at all.',
    source: 'Algorithm spec',
    detail: 'Algorithm.md §3 · hard eligibility pre-filter',
    badge: 'sp',
  },
  {
    quote:
      'Every score on the page decomposes into the four criteria that produced it, so a rank you disagree with can be argued with rather than merely refused.',
    source: 'Scoring module',
    detail: 'src/core/algorithms/scorers · per-criterion breakdown',
    badge: 'sc',
  },
  {
    quote:
      'The same weighted sum runs in the other direction. A tutor\'s list of students is produced by the arithmetic that produced the student\'s list of tutors, not by a second ranking with its own rules.',
    source: 'Matching engine',
    detail: 'src/core/engine · one scorer, both directions',
    badge: 'me',
  },
]

export const TRUST_CELLS: readonly { title: string; body: string }[] = [
  { title: 'No paid placement',      body: 'There is no promoted slot to buy, so the order is the scores.' },
  { title: 'Ranked for you',         body: 'The order is computed against your own request, not read off a house list everyone shares.' },
  { title: 'Load is spread',         body: 'Fairness is a term in the sum, so nobody collects twenty students.' },
  { title: 'Measured, not asserted', body: 'Greedy is checked against the optimum and two baselines on every run.' },
]

export const TRUST_STAT = { value: '\u2265 50%', label: 'of optimal, guaranteed' } as const

/* The 32px heading on the steps bento's wide row. Distinct from the section
   intro above it: the intro states the claim, this names the mechanism. */
export const HOW_BLOCK_TITLE = 'From a request to a booked hour, in one pass.'

/* The two tall cells that open the trust bento. The target's equivalent row is
   395px deep, and it earns that by carrying the two claims that need more than a
   line -- the bound and the absence of paid placement. */
export const TRUST_TALL: readonly { title: string; body: string; note: string }[] = [
  {
    title: 'Greedy, with a bound',
    body: 'Iterative best-match-first assigns the highest-scoring eligible pair, removes it, and repeats. It is not the optimum, and it is not sold as one: the total score it produces is provably at least half the optimal total, and the harness reports the real gap on every run rather than the worst case.',
    note: 'pnpm run eval:gap',
  },
  {
    title: 'Nothing to buy',
    body: 'There is no promoted slot, no ranking boost and no advertising surface anywhere in the product, so there is nothing for a tutor to pay for. The order you read is the order the weighted sum produced, and moving your own weights is the only thing that changes it.',
    note: 'No billing in the codebase',
  },
]
