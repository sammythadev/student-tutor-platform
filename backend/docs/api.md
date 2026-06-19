# API

## Auth

### `POST /auth/signup`

Creates a student or tutor account and returns an access token, refresh token, and the public user profile.

- Body: `email`, `password`, `firstName`, `lastName`, `role`.
- Errors: `400` for invalid payloads, `409` for duplicate email addresses.

### `POST /auth/login`

Signs in a student or tutor account and returns a new token pair.

- Errors: `401` for invalid credentials, `403` when the account role is not allowed for this endpoint.

### `POST /auth/admin/signup`

Creates an admin account using the bootstrap code and returns a token pair.

- Body: admin user fields plus `signupCode`.
- Errors: `401` for an invalid bootstrap code or invalid credentials, `409` for duplicate email addresses.

### `POST /auth/admin/signin`

Signs in an admin account and returns a token pair.

- Errors: `401` for invalid credentials, `403` when the account is not an admin.

### `GET /auth/verify`

Verifies the current bearer access token and returns the active user record.

- Auth: `Authorization: Bearer <accessToken>`.
- Errors: `401` for a missing or invalid bearer token, `403` when the account is disabled or the token no longer matches the account state.

### `POST /auth/refresh`

Exchanges a refresh token for a new access/refresh token pair.

- Body: `refreshToken`.
- Errors: `400` for an invalid refresh token payload, `401` for a missing or invalid refresh token, `403` when the account is disabled or the token is stale.

### `POST /auth/onboard`

Completes profile onboarding for the currently authenticated student or tutor.

- Auth: `Authorization: Bearer <accessToken>`.
- Body: `role`, plus the required profile details. Tutors must supply `subjectsTaught`, `gradeLevelsSupported`, `examTypesSupported`, `availability`, and `hourlyRate`. Students must supply `requiredSubject`, `gradeLevel`, `examType`, and `requestedAvailability`.
- Errors: `400` for invalid payloads or role mismatch, `401` for a missing or invalid bearer token, `409` if the user is already onboarded.

## Users

### `POST /users`

Creates an `admin`, `student`, or `tutor` user. Student and tutor users require their matching profile payload.

- `role=admin`: requires base user fields only.
- `role=student`: requires `studentProfile`.
- `role=tutor`: requires `tutorProfile`.
- Errors: `400` for missing role profile, `409` for duplicate email.

### `GET /users/:id`

Fetches one user and left-joins the matching role-specific profile in a single repository query.

- Auth: owner or admin bearer access token.
- Errors: `401` for a missing or invalid bearer token, `403` when the request is not for the owner or an admin, `404` when the user does not exist.

### `PATCH /users/me`

Updates general user profile details.

- Auth: `Authorization: Bearer <accessToken>`.
- Body: Optional `firstName`, `lastName`, `region`.
- Errors: `401` for a missing or invalid bearer token.

### `PATCH /users/me/student-preferences`

Updates optional preferences for an onboarded student.

- Auth: `Authorization: Bearer <accessToken>`.
- Role: `student`.
- Body: Optional `budget`, `deliveryPreference`, `formatPreference`, `learningStylePreference`, `languages`, `subjectSpecialization`, `preferenceWeights`.
- Errors: `400` if not onboarded as a student, `401` for a missing or invalid bearer token, `403` for non-student roles.

### `PATCH /users/me/tutor-preferences`

Updates optional preferences for an onboarded tutor.

- Auth: `Authorization: Bearer <accessToken>`.
- Role: `tutor`.
- Body: Optional `specializations`, `experienceYears`, `languages`, `teachingStyle`, `deliveryStyle`, `formatStyle`, `capacity`.
- Errors: `400` if not onboarded as a tutor, `401` for a missing or invalid bearer token, `403` for non-tutor roles.

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
