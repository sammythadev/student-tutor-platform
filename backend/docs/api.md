# API

## Users

### `POST /users`

Creates an `admin`, `student`, or `tutor` user. Student and tutor users require their matching profile payload.

- `role=admin`: requires base user fields only.
- `role=student`: requires `studentProfile`.
- `role=tutor`: requires `tutorProfile`.
- Errors: `400` for missing role profile, `409` for duplicate email.

### `GET /users/:id`

Fetches one user and left-joins the matching role-specific profile in a single repository query.

- Errors: `404` when the user does not exist.

## Matchmaking Test

### `GET /test/matchmaking/core`

Runs a fixed in-memory fixture through the core lazy-greedy matching engine and returns assignment count, unassignable count, assigned tutor ID, score, and elapsed seconds. This is a wiring check endpoint, not a persistence-backed matching API.

### `GET /test/matchmaking/database-demo`

Runs seeded database students and tutors through the core matching engine using normalized `schedule_slots` where available, then returns student count, tutor count, assignments, unassignable count, average score, and elapsed seconds.

## Schedules

### `POST /schedules/availability`

Creates an availability slot for a student or tutor.

- Body: `userId`, `startAt`, `endAt`, optional `status`, optional `region`.
- Errors: `400` when `endAt` is not after `startAt`.

### `GET /schedules/users/:userId/availability`

Lists a user's available schedule slots ordered by start time.
