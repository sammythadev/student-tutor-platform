# Find Tutors / Find Students — verified environment notes

Written by the designer after a live investigation. Trust this over guessing.

## Servers (both already running — do NOT start new ones)
- Frontend dev: http://localhost:3000 (Next 16 dev, already up; `pnpm dev` will refuse)
- Backend API: http://localhost:4000 (NestJS, up)
- No Playwright. Chrome 154 at /usr/bin/google-chrome.

## Test account — READ THIS, IT IS SURPRISING
`tutor45@email.com` / `kratos1234` logs in fine BUT the user's role is **student**,
not tutor (the JWT literally says `"role":"student"`). Consequences:

- `/tutors` renders **FindTutors** with REAL data: 51 eligible tutors, real names,
  rates, ratings, bios, match %. This page is fully reviewable. ✅
- `/tutor-dashboard/find-students` renders the page shell and then a real
  `403 Insufficient role permissions` alert. The list cannot be seen with this
  account. ❌

So for find-students you are designing against a 403. Options: design it anyway from
the type contract (below) and say clearly it is unverified, OR find a real tutor
account. Do not fake data and present it as verified.

## Working screenshot harness — USE THIS
`/tmp/opencode/real-shot.mjs` — logs in for real, seeds the zustand `auth-store`
into localStorage, then captures. Renders genuine data.

```
node /tmp/opencode/real-shot.mjs <path> <out.png> <w> <h> tutor45@email.com kratos1234 ["<click>|<click>"]
# e.g.
node /tmp/opencode/real-shot.mjs /tutors tut.png 1440 900 tutor45@email.com kratos1234
node /tmp/opencode/real-shot.mjs /tutors m.png 390 844 tutor45@email.com kratos1234
FULL=1 node /tmp/opencode/real-shot.mjs /tutors full.png 1440 900 tutor45@email.com kratos1234
```
It prints page state (h1, visible text, spinners, skeletons, overflow delta) and
console errors. `overflow: N` where N>0 means horizontal overflow.

Also available: `/tmp/opencode/probe.mjs` (overflow sweep), `/tmp/opencode/a11y.mjs`
(headings/landmarks/live regions/contrast/touch targets), `/tmp/opencode/contrast.mjs`
(contrast with proper effective-background resolution).

## Stale-CSS trap
The running dev server served a CSS chunk with the OLD `--text-muted: #8f8f8f`
(3.1:1) while the committed `globals.css:227` is `#6B6B6B` (5.11:1 on canvas). If a
contrast audit fails wholesale, check the served CSS before "fixing" a token that is
already correct. Confirm with:
`curl -s http://localhost:3000/tutors | grep -oE '/_next/static/[^"]*\.css'`

## The data contract — what you may render
`frontend/lib/api/users.ts` is the source of truth. Do not invent fields.

`TutorCandidate`: tutorId, firstName, lastName, region, subjectsTaught[],
score (0-1), rankPercentage (0-100, **prefer this for display**), isEligible?,
reason?, experienceYears, avgRating (string|null, already 0-5), ratingCount,
hourlyRate, bio, isVerified, explanation?: MatchExplanation

`StudentCandidate`: studentId, firstName, lastName, region, requiredSubject,
subjects[], gradeLevel, budget (number|null), score, rankPercentage, isEligible?,
reason?   ← note: no rating, no bio, no avatarUrl, no verification flag

`MatchExplanation` (frontend/lib/api/match-explanation.ts) is rich and real:
headline, summary, criteria[] (academic/preference/schedule/fairness, each with
label, score, weight, contribution, share, subCriteria[]), highlights[], cautions[],
selfAnchor{ pct, poolMedianPct, poolBestPct, percentile }, eligibility.
`readExplanation()` narrows to a renderable shape and degrades to "no panel" on an
unknown version — respect that.

**Two hard invariants from the contract** (they exist to prevent specific
contradictions — do not design around them):
1. `criteria[].contribution` sums to the composite score. Compare with a tolerance.
2. An ineligible candidate carries NO highlights, NO cautions, and a null best/worst
   criterion. **Never show a match percentage beside a disabled action.** The current
   page already violates the spirit of this: it shows ineligible tutors with a greyed
   "Book session" AND a red reason AND still ranks them among the best.

Also: `MatchDistribution` describes the caller's ranked pool, so copy must read
"of the tutors ranked for you", never "of all tutors".

## What is actually wrong with the current Find Tutors page
Observed at 1440x900 with real data. Judge these, don't rediscover them:
- **3-equal-column card grid.** Direct violation of the DESIGN.md ban on 3-column
  equal card rows. Every card identical weight → nothing reads as a recommendation.
- **Ineligible tutors are given equal billing to the best match.** Two of the three
  top cards are ineligible ("Tutor does not support the student grade level"). The
  top-left eligible card ranks *below* them. The ordering is the failure.
- **Greyed "Book session" buttons** — disabled controls styled as the primary CTA.
- **Avatar initials on random pastel hues** (orange, purple) that are not in the
  palette and not derived from anything.
- **The match % is tiny and unexplained** on only ONE card; the other two show
  nothing. A recommendation surface should consistently say why.
- **Duplicate-looking cards** — "Tunde Eze" appears 3x with near-identical bios,
  which reads as a bug to the user.
- **Huge filter bar** (4 controls) above the fold, pushing content down.
- Subject/exam strings are raw lowercase slugs: "civic education · mathematics".

## Rules that bind you
Read `frontend/DESIGN.md` first. Bans: no emojis, no Inter, no pure #000, no neon
glow, no 3-equal-column card rows, no centred hero, no "Learn more", no AI-cliché
copy ("Elevate/Seamless/Unleash/Next-Gen"), no em-dashes in visible copy, Geist only,
blue #0072F5 (`--ring`) for links/focus/status only.

Use the CSS vars in `frontend/app/globals.css` (`--canvas --card --surface-2
--border --border-strong --text-primary --text-secondary --text-muted --primary
--primary-fg --primary-subtle --ring --destructive-text`). Never raw hex.
Dark mode is defined ~line 374; check it, don't assume.

Available primitives in `frontend/components/ui/`: avatar, badge, card, empty, input,
progress, skeleton, tabs, tooltip, sheet, select, separator, button, collapsible.
Already vendored react-bits: `frontend/components/reactbits/{BorderGlow,TiltedCard,
StarBorder,Waves,GradualBlur,LogoLoop}`.

Existing match-explanation components already exist — read before rebuilding:
`frontend/components/match/match-rationale.tsx`,
`frontend/components/MatchRing.tsx`, and `components/match/match-distribution-dialog.tsx`.

## Definition of done
- `pnpm typecheck` clean.
- Your touched files lint clean. Repo has ~105 PRE-EXISTING problems elsewhere; do
  not fix those, do not add new ones. Check with
  `pnpm lint 2>&1 | grep -A4 -E '<yourfile>'`.
- Screenshots ACTUALLY LOOKED at: 1440x900, 1024, 768, 390x844, 320x700. Report what
  you saw. `overflow: 0` at every width.
- Do not change API calls, data fetching, or auth/role logic. Presentation only.
