# Agent Prompts — Student-Tutor Matchmaking Core Engine

Four prompts, run in order. They assume your agent already knows the tech stack, SOLID
conventions, and repository pattern — these prompts focus on *what* to build and *why*,
not framework syntax. Each one (except the first) should be given `algorithm-spec.md`
as attached context — it's the source of truth for every formula and algorithm; don't
let the agent invent its own normalization or ordering logic.

---

## Prompt 1 — Domain Entity Models

```
Design the domain entity layer for a student-tutor matchmaking engine. These are plain
domain types with zero framework or persistence coupling — no ORM annotations, no
framework decorators, no HTTP concerns.

Entities required:
- Student: id, requiredSubject, gradeLevel, examType, requestedAvailability (time slots),
  preferenceWeights (optional per-criterion override), bookingTimestamp
- Tutor: id, subjectsTaught[], gradeLevelsSupported[], examTypesSupported[], availability
  (time slots), experienceYears, languages[], teachingStyle, avgRating (nullable —
  null means no completed sessions yet), hourlyRate, capacity, assignedCount
- AvailabilitySlot: value object for a time interval, with an overlap/intersection method
- CriterionWeights: value object for the six weights, with a validation invariant that
  they sum to 1.0 within floating-point tolerance; provide the default instance:
  subjectFit=0.30, availability=0.25, experience=0.15, languageStyleFit=0.15,
  feedback=0.10, loadFactor=0.05
- MatchScore: wraps a 0–1 score plus a per-criterion breakdown (needed for explainability)
- Assignment: studentId, tutorId, matchScore, assignedAt, status (active/completed/
  cancelled/waitlisted)

Define repository interfaces only (no implementations) for Student, Tutor, and
Assignment — scoped to exactly the methods the matching engine will call, not generic
CRUD. Concrete persistence implementations come later and are out of scope here.

Flag anything in this list that seems redundant or missing before generating code.
```

---

## Prompt 2 — Core Matching Engine

```
Implement the matching engine exactly as defined in algorithm-spec.md (attached) —
do not redesign the hard filter, normalization formulas, scoring equation, or the
Iterative Best-Match-First assignment algorithm; implement them as specified, including
the cold-start default and the capped experience normalization.

Keep filtering, normalization, scoring, and assignment ordering as separate,
independently testable units — none of them should know how to construct the others
directly; wire dependencies the way the rest of this codebase already does it.

Implement both operating modes from §5 of the spec: batch assignment over a pending pool,
and incremental single-request handling with waitlisting. Implement the assignment
lifecycle (completion/cancellation decrements assignedCount, recomputes LoadFactor,
re-checks the waitlist) — this was missing from the original design and must not be
skipped.

Explicitly out of scope for this prompt: any HTTP/API surface, persistence
implementations of the repositories, the feedback/rating ingestion pipeline beyond
reading avgRating. Leave TODO markers referencing this boundary.

If anything in algorithm-spec.md is ambiguous or under-specified for implementation,
stop and ask rather than filling the gap yourself.
```

---

## Prompt 3 — Edge Cases

```
Review the engine built in the previous step against algorithm-spec.md and add explicit,
intentional handling (not silent fallback) for:

1. Zero eligible tutors remain after the hard filter for a given student.
2. A tutor has capacity = 0 going in — must never be selected, not just skipped after
   the fact.
3. A student's preferenceWeights don't sum to 1, or are missing/negative entries —
   decide: reject the request, or auto-renormalize? State which and why.
4. requestedSlots = 0 (division by zero in Availability Score).
5. A student submits no availability at all.
6. A tie in MatchScore between two+ tutors — apply the tiebreaker from spec §4 (lower
   assignedCount, then lowest tutor id) so output is deterministic and reproducible.
7. Oversubscription — more students than aggregate tutor capacity. The algorithm should
   return an explicit "unassignable" result with a reason, never a silent omission.
8. A new tutor with avgRating = null — confirm the cold-start default (0.6) from spec
   §2.5 is applied, not a crash or a 0.
9. Two students with identical bookingTimestamp — confirm this can't desync the
   Iterative Best-Match-First order (it shouldn't depend on bookingTimestamp at all in
   batch mode — confirm that's actually true in the implementation, not assumed).
10. A tutor's only remaining feasible slot gets filled mid-batch — confirm the next
     iteration's hard filter correctly excludes them, proven with a test, not assumed.
11. An incremental request arrives for a tutor who is exactly at capacity — confirm it
     waitlists rather than erroring or silently dropping the request.
12. An assignment is cancelled — confirm the waitlist is re-checked and a previously
     waitlisted student can now be matched, automatically.

For each case, leave a one-line comment explaining the tradeoff where you chose a
fallback over a hard rejection — these need to be defensible to a supervisor later.
```

---

## Prompt 4 — Test Suite and Proof of Results

```
Build correctness tests and a separate evaluation harness for the matching engine.

PART A — Correctness:
- Hand-crafted fixtures (3–5 students, 5–8 tutors) with manually pre-computed expected
  MatchScores using the exact formulas in algorithm-spec.md §2 — show the by-hand
  calculation in a comment so it can be verified independently of the code.
- One test per edge case from the previous prompt.
- A randomized/property-based test confirming no assignment ever exceeds a tutor's
  capacity, across many generated fixtures.
- A test confirming CriterionWeights always sums to 1 after normalization, including the
  dynamic per-student override path.
- A test proving the Iterative Best-Match-First algorithm actually outperforms a naive
  FCFS ordering on average match quality, on the same fixture set — this is the evidence
  for the design choice in algorithm-spec.md §4, not just an assertion.

PART B — Evaluation harness (standalone, not part of the test suite):
- A synthetic dataset generator: configurable N students / M tutors, randomized but
  bounded criteria values and availability.
- Match quality metric: average MatchScore across successful assignments, and percentage
  of students left unassigned, at varying N/M ratios.
- Fairness metric: variance (or Jain's fairness index) of assignedCount across tutors
  after a run — compare a run with loadFactor weight = 0.05 (current default) against a
  run with it set to 0, to produce direct evidence that the load factor weighting
  actually improves distribution.
- Scalability measurement: run at increasing N (e.g. 50, 200, 1000, 5000) and record
  wall-clock time, to produce a chart showing how the O(N²·M) complexity behaves in
  practice versus the theoretical bound.

Output the harness as something runnable that prints or exports a table/CSV — this needs
to become real numbers and a chart in the results chapter, not a "tests passed" message.
```