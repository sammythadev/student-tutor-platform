# Core Matchmaking Roadmap and API Plan

## Current Core

- `src/core/entities`: framework-free student, tutor, availability, weights, score, and assignment models.
- `src/core/algorithms`: eligibility filtering, academic/preference/schedule/fairness scoring, lazy-greedy assignment, top-k ranking, feedback updates, and weight adaptation.
- `src/core/engine`: service-facing orchestration for batch matching, incremental matching, completion, and cancellation.
- `src/core/evaluation/evaluation-harness.ts`: standalone CSV-producing harness for quality, unassigned rate, fairness, and scalability metrics.

## Weaknesses Removed or Deferred

- Gender preference is not implemented as a scoring criterion because it is a discrimination-risk feature and not required for a defensible v1.
- Region/proximity is kept out of scoring because the current domain model has no location data; add it only when the product has verified address/zone fields.
- Static one-time greedy sorting is not used because fairness becomes stale as tutor load changes during the same batch.
- API, persistence, and auth are intentionally out of `src/core`; future Nest services should call the core engine rather than embedding algorithm logic.

## Service Roadmap

1. `students` module: profile CRUD, required subject, grade level, exam type, availability, budget, and preference weights.
2. `tutors` module: tutor profile CRUD, subjects, supported levels/exams, availability, pricing, capacity, and quality rating.
3. `matching` module: batch run endpoint, incremental request endpoint, top-k recommendations, and result auditing.
4. `assignments` module: assignment persistence, completion, cancellation, waitlist promotion, and tutor load updates in one transaction.
5. `feedback` module: post-session rating intake and tutor quality EMA update.
6. `evaluation` admin task: run synthetic harness and export CSV for research reporting.

## API Plan

### Students

- `POST /students`: create student profile.
- `PATCH /students/:id`: update profile and preferences.
- `GET /students/:id`: fetch profile.
- `PUT /students/:id/availability`: replace requested availability slots.

### Tutors

- `POST /tutors`: create tutor profile.
- `PATCH /tutors/:id`: update tutor profile, capacity, and pricing.
- `GET /tutors/:id`: fetch profile.
- `PUT /tutors/:id/availability`: replace tutor availability slots.

### Matching

- `POST /matching/batch`: run lazy-greedy assignment for pending students.
- `POST /matching/students/:id/request`: run incremental matching for one student; returns active assignment or waitlist result.
- `GET /matching/students/:id/recommendations?limit=5`: return top-k ranked tutors.

### Assignments

- `GET /assignments/:id`: fetch assignment result and score breakdown.
- `POST /assignments/:id/complete`: mark complete and keep tutor load consistent.
- `POST /assignments/:id/cancel`: cancel, decrement tutor load, and re-check waitlist.
- `GET /assignments/waitlist`: inspect currently waitlisted students.

### Feedback

- `POST /feedback`: submit 0-5 rating for a completed assignment.
- `GET /tutors/:id/quality`: fetch current normalized tutor quality score.

## Persistence Notes

- Store score breakdown JSON with each assignment for auditability.
- Update `assignedCount`, assignment status, and waitlist promotion in a database transaction.
- Keep core entities mapped at repository boundaries; do not leak Drizzle row shapes into `src/core`.
