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
- Body: `role`, plus the required profile details. Tutors must supply `subjectsTaught`, `gradeLevelsSupported`, `examTypesSupported`, `availability`, and `hourlyRate`. Students must supply `requiredSubject`, `gradeLevel`, `examType`, and `requestedAvailability`. Optional preference fields include the learning/teaching pace (`learningPace` for students, `teachingPace` for tutors — one of `fast`, `moderate`, `steady`).
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
- Body: Optional `budget`, `deliveryPreference`, `formatPreference`, `learningStylePreference`, `learningPace` (`fast`|`moderate`|`steady`), `languages`, `subjectSpecialization`, `preferenceWeights`.
- Errors: `400` if not onboarded as a student, `401` for a missing or invalid bearer token, `403` for non-student roles.

### `PATCH /users/me/tutor-preferences`

Updates optional preferences for an onboarded tutor.

- Auth: `Authorization: Bearer <accessToken>`.
- Role: `tutor`.
- Body: Optional `specializations`, `experienceYears`, `languages`, `teachingStyle`, `teachingPace` (`fast`|`moderate`|`steady`), `deliveryStyle`, `formatStyle`, `capacity`.
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

## Matchmaking

All matchmaking endpoints require `Authorization: Bearer <accessToken>`.

### `POST /matchmaking/batch`

Admin-only endpoint that runs database-backed batch matchmaking for active students without active assignments, persists active assignments, and waitlists unassignable students.

### `GET /matchmaking/candidates?page=1&limit=5`

Student-only endpoint for the current authenticated student. Returns paginated, populated tutor candidates ranked by the core algorithm.

### `GET /matchmaking/candidates/students?page=1&limit=5`

Tutor-only endpoint for the current authenticated tutor. Returns paginated, populated student candidates ranked by the core algorithm.

- Auth: tutor bearer access token.
- Errors: `401` for a missing or invalid bearer token, `403` for non-tutor roles.

### `POST /matchmaking/select`

Student-only endpoint for manually selecting a tutor candidate.

- Body: `tutorId`.
- Result: creates an `active` assignment/session immediately when the tutor has capacity.

### `GET /matchmaking/assignments/me?page=1&limit=10`

Returns paginated assignments/sessions for the current user. Students see their assignments, tutors see their assigned sessions, and admins can see all assignments.

### `PATCH /matchmaking/assignments/:id/status`

Updates a session/assignment status.

- Body: `status` as `completed` or `cancelled`.
- Cancelling an active assignment decrements the tutor's assigned count.

### `POST /matchmaking/assignments/:id/feedback`

Student-only endpoint for submitting feedback after an assignment is completed.

- Body: `rating` from `0` to `5`, optional `comment`.
- Rating meaning: `0` unusable/failed session, `1` very poor, `2` poor, `3` acceptable, `4` good, `5` excellent.
- The core feedback loop normalizes rating with `rating / 5` and updates `tutor_profiles.avg_rating` using EMA.

## Messages

All message endpoints require `Authorization: Bearer <accessToken>`. The sender is always the authenticated user, not a body field.

### `POST /messages`

- Body: `receiverId` (UUID), `content` (string, max 2000 characters), optional `replyToId` (UUID; omit for an ordinary message).
- Reply targets may be messages sent by either participant, but must belong to this exact sender/receiver pair. A reply to a reply quotes only that immediate target, not a recursive chain.
- Response (`201`): existing `id`, `senderId`, `receiverId`, `content`, `readAt`, `createdAt`, `senderName`, `senderIsVerified` fields remain unchanged. Additive fields: `replyToId: string | null` and `replyTo: { id: string, content: string, senderId: string, senderName?: string } | null`.
- Ordinary messages return both reply fields as `null`. If an original is deleted, its replies remain and both reply fields become `null`.
- Errors: `400` invalid input (including malformed or explicit null `replyToId`), `401` unauthenticated, `404` reply target missing or outside the exact conversation. The same error is used to avoid disclosing other conversations.

### `GET /messages/:userId`

Returns the authenticated user's conversation with `userId` as an ascending chronological array. Each message has the same additive reply fields as the send response, including replies to originals outside the returned message set. Existing array shape and sender verification fields are preserved. Reply previews and sender details are joined in a single query.

## Courses

All course endpoints require `Authorization: Bearer <accessToken>` and the `tutor`, `student` or `admin` role; `unassigned` accounts are rejected with `403`. Content is scoped twice: authors (tutors and admins) only see courses they own, a student only sees courses they are enrolled in.

- Out-of-scope content returns `404`, not `403` (`Course not found`), so the API never discloses that an existing course belongs to someone else. `403` is reserved for calls that are in scope but not permitted: an enrolled student using a tutor-only route (`Only the course tutor can perform this action`), and a student creating or editing a course.
- **A discoverable course is readable by every course role without an enrollment** — Tutorly-provided outlines (`provider: 'admin'`) always are, and a tutor's course becomes discoverable once its author sets `published: true`. That is what `GET /courses/library` offers, so `GET /courses/:id` must be able to open one. Reads are the widest right: every author-only route (edit, topics, roster) still resolves against the owning account and answers `404` for anyone else.
- **Assigning is a separate right from authoring.** `POST /courses/:id/students` accepts any course the caller may _assign_: one they own, or a discoverable one. That is what lets a tutor set a Tutorly outline — or another tutor's published course — for their own student. The enrollment records the assigning tutor in `course_enrollments.added_by`, so `students/overview`, a student's `GET /courses` and the per-student progress routes follow the tutor who set it rather than the course author.
- **Course titles are unique per tutor, not globally.** Two tutors may each own a "Chemistry" course; a single tutor creating or renaming onto one of their own titles is refused with `409` (`You already have a course named "X"`), matched case- and whitespace-insensitively by `courses_tutor_title_unique_idx`. Use `GET /courses/subjects` plus `published` to tell two same-titled courses apart.
- `published` is `false` by default: a tutor's course is private to them and the students they set it for until they open it up. `provider: 'admin'` material is discoverable regardless of the flag. Publishing never transfers ownership — the author keeps full edit rights and other tutors can only assign, never restructure.
- `subjects` / `subjectCodes` are the platform subjects a course is linked to, ordered by subject name and aligned index-for-index. They are optional; an unknown code fails the request rather than being dropped.
- List endpoints accept `q` (optional, max 100 characters), `page` (default `1`), and `limit` (default `12`, max `50`), and return `CoursePage<T>`: `{ page, limit, total, data }`. On `GET /courses` the search compares against course title **or** description, ordered by most recently updated; on the author-facing student lists (`eligible-students`, `:id/students`, `students/overview`) it compares against the student's full name and orders by last name.
- `progress` is `{ completedTopics, totalTopics, percentage, status }`, where `percentage` is floor-rounded and `0` for a course with no topics, and `status` is `not_started`, `in_progress`, or `completed`. `CourseSummary.progress` is populated for students and `null` for tutors; `studentCount` is the reverse.
- `CourseDetail` adds `topics`, each a topic plus `completed: boolean` and `completedAt: string | null`.
- `provider` is `admin` for Tutorly-provided outlines and `tutor` for a tutor's own. It is derived from the authoring account's role and is **never** accepted from the request body, so a tutor cannot label their own material as Tutorly-provided.
- `assignedById` / `assignedByName` name the tutor who _set_ the course for the reader, which is not always its author (a tutor may assign a Tutorly outline). Both are `null` for an author, for a reader with no enrollment on the course, and in library rows. The frontend groups a student's courses by this pair, which is what makes "which tutor set this for me" survive platform material.
- Authoring routes are described below as _tutor-only_; an admin holds the same rights over the Tutorly-provided courses it owns. `GET /courses/eligible-students` stays tutor-only, because it lists the students assigned to a tutor.
- Malformed input — a non-UUID path param, an out-of-range `page`/`limit`, or an unlisted body field — fails the global `ValidationPipe` (`transform` + `whitelist`) with `400` before any service logic runs.

### `GET /courses`

Lists the caller's courses: owned courses (with `studentCount`) for a tutor, enrolled courses (with `progress`) for a student.

- Response (`200`): `CoursePage<CourseSummary>`.

### `GET /courses/library`

Lists everything discoverable outside the caller's own scope: Tutorly-provided outlines (`provider: 'admin'`) plus every tutor course whose author published it. Readable by every course role, so students and tutors see the curated material alongside their own courses. Each listed course can be opened through `GET /courses/:id` by the same roles, enrollment or not, and a discoverable course can be assigned to one of the caller's own students.

The `subject` filter matches a linked subject's `code` **or** `name` (case-insensitive, literal); clients that segment locally should request without it, since only one subject can be passed per call.

- Same `q` (title **or** description), `page`, and `limit` rules as `GET /courses`.
- `studentCount` and `progress` are always `null`: library outlines are reference material, not enrollments.
- Response (`200`): `CoursePage<CourseSummary>`.
- Errors: `403` for a role without course access.

### `POST /courses`

Tutor or admin. Creates a course and, optionally, its ordered topics in one transaction. The author's role decides `provider`: an admin authors a Tutorly-provided outline, a tutor authors their own course.

- Body: `title` (string, 1–120 characters, trimmed), optional `description` (string, max 2000 characters, blank becomes `null`), optional `subjectCodes` (array of up to 8 platform subject codes, matched case-insensitively against `GET /courses/subjects`), optional `published` (boolean, default `false`), optional `topics` (array of `{ title, content? }`, max 100 items; topic titles are 1–160 characters and content max 20000).
- Response (`201`): `CourseDetail` with topics positioned in the order supplied and `subjects`/`subjectCodes` linked.
- Errors: `400` when more than 100 topics are supplied or a `subjectCodes` entry does not exist (`Unknown subject code(s): …`), `409` when the caller already owns a course with that title, `403` for non-tutors.

### `GET /courses/subjects`

Lists the platform subjects a course can be linked to, for the editor's picker. Active subjects only, ordered by name; `q` filters by code **or** name.

- Response (`200`): `CourseSubjectOption[]` — `{ code, name, category }`.
- Errors: `403` for `unassigned` accounts.

### `GET /courses/eligible-students`

Tutor-only. Lists the tutor's own students who may be assigned a course, with `q` matching the student's full name. A student qualifies through any relationship that means they are this tutor's — an `active` matchmaking assignment, an accepted session (`upcoming`, `starting-soon` or `completed`), or a course this tutor already set for them — and both accounts must be `active` with a student profile present. A `pending` session request does **not** qualify: the student has not engaged yet.

- Response (`200`): `CoursePage<CourseStudent>` (`studentId`, `firstName`, `lastName`, `avatarUrl`).
- Errors: `403` for a student.

### `GET /courses/students/overview`

Tutor or admin. The author-side rollup: one row per student **this author set a course for**, with every course they were given and that student's own progress. This is the endpoint behind "which course did I set for which student, and how are they following it"; `GET /courses/:id/students` answers the same question from a single course's point of view.

- **Scope is the union of the three relationships that mean "this student is mine"**: an `active` matchmaking assignment (they selected the tutor, or the batch engine matched them), an enrollment in at least one of the caller's courses, or a non-cancelled session with the caller. Enrollments alone hid every student who accepted a tutor before that tutor set a course. Students are de-duplicated across routes and appear once.
- `relationship` reports the earliest of those routes (`assigned` → `enrolled` → `session`), so a matched student with no course yet is still visible — with `courseCount: 0`, an empty `courses` array and a zeroed `progress`. `provider: 'admin'` courses belong to the Tutorly admin account, so an admin sees the platform-wide picture.
- Same `q` (student's full name), `page`, and `limit` rules as the other list endpoints; ordered by last name, then first name, then student id for a stable page boundary.
- Response (`200`): `CoursePage<CourseStudentOverview>` where each entry is `{ student, courses, courseCount, progress, lastCompletedAt }`. `courses` holds `{ courseId, title, provider, assignedAt, totalTopics, completedTopics, progress, lastCompletedAt }` ordered by most recently assigned.
- `progress` rolls every course up by **counting topics** (`completedTopics` / `totalTopics`) rather than averaging per-course percentages, so a one-topic course cannot outweigh a twenty-topic one. `lastCompletedAt` is the newest completion across those courses, or `null` when the student has not completed anything yet.
- Errors: `403` for a student.

### `GET /courses/:id`

Reads one course detail as the owning tutor, an enrolled student, or any course role for a discoverable course (Tutorly-provided, or published by its author).

- `progress` is populated for a student **only when they are enrolled** in that course; it is `null` for an enrolled-less read of a platform outline (matching the library rows), for tutors and admins, and for owners. The UI uses that to hide completion toggles that could not be saved.
- `studentCount` is the reverse: populated for authors, `null` for students. `subjects`/`subjectCodes` carry the linked subjects and `assignedById`/`assignedByName` name the tutor who set the course for the reader, if not its author.
- Response (`200`): `CourseDetail`.
- Errors: `404` when the course does not exist or is outside the caller's scope (a tutor-authored course the caller neither owns nor is enrolled in), `400` when `id` is not a UUID (the global `ValidationPipe` rejects malformed params, query values, and bodies before the service runs).

### `PATCH /courses/:id`

Tutor-only. Updates course metadata: `title`, `description`, `subjectCodes` and/or `published`. At least one field is required.

- Body: `title` (1–120 characters, trimmed), `description` (max 2000 characters, blank becomes `null`), `subjectCodes` (array of up to 8 codes — replaces the links wholesale, so an empty array clears them while omitting the field leaves them untouched), `published` (boolean).
- Response (`200`): updated `CourseDetail`.
- Errors: `400` when no field is provided or a subject code is unknown, `409` when the new title collides with another course the caller owns, `404` outside scope, `403` for an enrolled student.

### `POST /courses/:id/topics`

Tutor-only. Appends a topic to the end of the outline.

- Body: `title` (1–160 characters, trimmed), optional `content` (max 20000 characters, blank becomes `null`).
- Response (`201`): the created `CourseTopic`.
- Errors: `400` when the course already holds 100 topics (`A course can contain at most 100 topics`), `404` outside scope.

### `PATCH /courses/:id/topics/order`

Tutor-only. Sets the complete outline order from a permutation of the current topic ids.

- Body: `topicIds` (array of UUIDs, max 100, unique). The array must contain **every** current topic exactly once.
- Response (`200`): the reordered `CourseTopic[]`.
- Errors: `400` otherwise (`Topic order must include every topic exactly once`). The course row is locked for the operation, so a concurrent topic append either wins the lock or invalidates the permutation — it cannot silently corrupt positions.

### `PATCH /courses/:id/topics/:topicId`

Tutor-only. Edits topic content in place without touching completion records.

- Body: `title` (1–160 characters) and/or `content` (max 20000 characters, blank becomes `null`). At least one field is required.
- Response (`200`): updated `CourseTopic`.
- Errors: `400` when neither field is provided, `404` for an unknown topic or out-of-scope course.

### `DELETE /courses/:id/topics/:topicId`

Tutor-only. Deletes a topic, cascades its completion rows, and compacts the remaining positions back to a gap-free sequence.

- Response: `204` with no body.
- Errors: `404` for an unknown topic or out-of-scope course.

### `GET /courses/:id/students`

Tutor-only. Lists enrolled students with each student's independent progress.

- Response (`200`): `CoursePage<CourseEnrollment>` (`studentId`, `firstName`, `lastName`, `avatarUrl`, `courseId`, `assignedAt`, `progress`), ordered by student last name.
- Errors: `404` outside scope, `403` when an enrolled student asks for the roster.

### `POST /courses/:id/students`

Tutor or admin. Sets a course for one of the caller's own students — the assignment route behind both the course roster and "My students".

- Body: `studentId` (UUID).
- The course may be one the caller owns **or any discoverable course** (Tutorly-provided, or published by its author). The caller must be a live tutor/admin account and the student must be one of theirs under the same union `GET /courses/eligible-students` uses.
- Response (`200`, not `201`): `CourseEnrollment`. Assigning twice is safe and returns the existing enrollment unchanged, so the call is idempotent and a repeat is never an error.
- The row records the assigning tutor (`course_enrollments.added_by`), which is what keeps the student's progress visible to the tutor who set the course even when they did not author it.
- Errors: `403` when the student is not one of the caller's active students (`This student is not one of your active students`), `404` outside scope (including another tutor's unpublished course). Eligibility is rechecked in the same transaction as the insert, with the student row locked.

### `GET /courses/:id/students/:studentId/progress`

Reads one enrolled student's progress and per-topic completion state. The course author may always read it, and so may any other tutor who set that exact course for that exact student — otherwise assigning a Tutorly outline would leave the assigning tutor unable to follow it.

- Response (`200`): `CourseStudentProgress` (`courseId`, `student`, `progress`, `topics` with `completed`/`completedAt`).
- Errors: `404` when the student is not enrolled in this course (`Enrollment not found`) or the caller has no tracking right on it, `403` for an enrolled student reading a peer.

### `PATCH /courses/:id/topics/:topicId/completion`

Student-only. Marks or reopens the caller's own completion for a topic in a course they are enrolled in.

- Body: `completed` (boolean; `true` inserts the completion, `false` removes it).
- Response (`200`): `CompletionResult` (`courseId`, `topicId`, `studentId`, `completed`, `completedAt`, `progress`).
- The operation is idempotent — repeating the same value leaves the completion unchanged and returns the current state. It applies only to the authenticated student, never to a body-supplied id.
- Errors: `404` outside scope or for an unknown topic, `403` for a tutor.

### `PATCH /courses/:id/students/:studentId/topics/:topicId/completion`

Counterpart for recording progress on behalf of an enrolled student: open to the course author and to any tutor who set that course for that student. Same body and `CompletionResult` response as the student route.

- Errors: `404` when the student is not enrolled (`Enrollment not found`) or the course/topic is out of scope.

## Sessions

All session endpoints require `Authorization: Bearer <accessToken>` and are participant-scoped.

A session is one meeting between a student and a tutor, created `pending` and answered by the counterparty. A **recurring request** is stored as one ordinary session per occurrence, all sharing a `session_series` row — so accepting, proposing another time, declining, completing or cancelling any single day keeps working exactly as before, and a series is only the schedule they were generated from plus bulk answers.

### `POST /sessions`

Requests one session. Students book for themselves; tutors must supply `studentId`.

- Body: `tutorId`, optional `studentId` (tutors), `subject`, `startAt`, `endAt` (ISO-8601), optional `meetingUrl`, optional `notes`.
- The `subject` must be one the tutor teaches, and the tutor must be free in that window.
- Response (`201`): the pending `SessionResponseDto`.
- Errors: `400` for a window that is not in the future or ends before it starts, an untaught subject, a clash, or a tutor with no `studentId`; `403` for any other role.

### `POST /sessions/series`

Requests a recurring block — "every day for two weeks", "Mon/Wed/Fri for a term" — as one series: one `session_series` row plus one pending session per occurrence, written in a single transaction. Participants are notified **once** for the request, not once per day.

- Body: `tutorId`, optional `studentId` (tutors), `subject`, `recurrence` (`daily` | `weekdays` | `weekly`), optional `weekdays` (`0` = Sunday … `6` = Saturday; required for `weekdays`/`weekly`), `timeOfDay` (`HH:MM`), `durationMinutes` (15–180), `startsOn`/`endsOn` (`YYYY-MM-DD`), `weeks` (1–12), optional `notes`/`meetingUrl`, and `occurrences` (`[{ startAt, endAt }]`, 1–84 items).
- The client generates `occurrences` from its own calendar: it is the only place that knows the viewer's timezone, and the server refuses to guess one. The server validates the schedule, the horizon and every window.
- Rules: every occurrence must start in the future, end after it starts, and be unique; occurrences may not overlap each other; the block may not contain more than `weeks × 7` sessions; the tutor must be free for all of them (checked in one read, with the first clash named in the message).
- Response (`201`): `{ series, sessions }` — the schedule row and its pending sessions, ordered by `seriesIndex`.
- Errors: `400` per the rules above, including `Choose at least one weekday for this series`; `403` for any other role.

### `GET /sessions/series/:id`

Reads the block and its sessions, oldest occurrence first. `404` for anyone who is not the series' tutor or student, so the API never confirms another pair's request exists.

### `PATCH /sessions/series/:id/respond`

Answers every still-pending occurrence at once — `{ "accept": true | false }` sets them all to `upcoming` or `cancelled`.

- The responder must be a participant and must not be the requester (`403`), mirroring the single-session rule.
- Response (`200`): `{ series, sessions }` after the update.
- Errors: `400` when nothing is left pending.

### `PATCH /sessions/series/:id/cancel`

Stops whatever is left of the block (`pending`, `upcoming`, `starting-soon`). Completed sessions are history and are left untouched.

- Response (`200`): `{ series, sessions }`. Errors: `400` when there is nothing left to cancel, `404` outside scope.

### Single-session routes

Each occurrence of a series is an ordinary session, so these all apply to it directly:

- `GET /sessions/me` — every session the caller is part of, newest first. Each row carries `seriesId`, `seriesIndex` and — when it belongs to a series — `seriesRecurrence`, `seriesWeekdays`, `seriesWeeks` and `seriesTimeOfDay`.
- `PATCH /sessions/:id/accept` · `PATCH /sessions/:id/decline` — answer one pending request.
- `PATCH /sessions/:id/propose` · `PATCH /sessions/:id/accept-proposal` — offer another time, and accept it.
- `PATCH /sessions/:id/tutor` — move a pending or upcoming session to another tutor who teaches the subject and is free.
- `PATCH /sessions/:id/status` — `completed` or `cancelled`.

## Dashboard

All dashboard endpoints require `Authorization: Bearer <accessToken>` and are role-scoped.

### `GET /dashboard/metrics`

Student-only endpoint. Returns the student dashboard KPI cards, weekly learning hours, upcoming sessions, and how the student is learning.

- Response: `kpis` (array of KPI objects, each with `label`, `value`, `trend`, `isUp`, `color`, and `deltaPct`), `weeklyBars` (last 7 days by weekday), `upcomingSessions` (next scheduled sessions), `streakDays`, `totalHoursLearned`, `learning`, `courses`.
- `deltaPct` is the week-over-week percentage change for the KPI, or `null` when there is no prior window to compare (e.g. first-time values, streaks, or average ratings).
- `learning` is derived from **activity, not from a counter column** — `student_profiles.streak_days`/`total_hours_learned` are not written by any flow, so a KPI fed from them is permanently zero. A day counts when a topic was completed or a session was attended.
  - `currentStreak` is the run ending today, and **yesterday keeps it alive** while today is still empty; `longestStreak` is the best run in the last two years; `activeDays` counts distinct active days; `totalHours` sums completed sessions; `topicsCompleted` counts this student's topic completions.
  - `days` is always exactly fourteen entries, oldest first, with idle days filled as zeroes (`{ date, hours, topics, active }`), so the strip needs no gap-filling on the client.
- `courses` is one entry per course the student is enrolled in (`CourseLearningDto`): `title`, `provider`, `published`, `authorName`, `setterName` (the tutor who set it, when that is not the author), `subjects`, `totalTopics`, `completedTopics`, `percent`, `finished`, `lastActivityAt`. `learning.coursesInProgress` counts started-but-unfinished courses and `coursesFinished` counts fully completed ones.

### `GET /dashboard/tutor-metrics`

Tutor-only endpoint. Returns the tutor dashboard KPI cards, weekly teaching hours, upcoming sessions, and what the tutor is teaching.

- Response: `kpis` (same KPI shape as student, with `deltaPct`), `weeklyBars`, `upcomingSessions`, `studentsCount`, `avgRating` (nullable, on a 0–5 scale), `learning`, `courses`.
- `learning` mirrors the student shape, counted on the teaching side: a day counts when the tutor taught a session, or when a student completed a topic on a course the tutor authored **or** set for them. `topicsCompleted` is every completion by those students.
- `courses` is one entry per course the tutor teaches (`CourseRosterDto`) — the ones they authored plus any published course they assigned to a student, so an assigned outline stays trackable: `title`, `provider`, `published`, `authorName`, `subjects`, `studentCount`, `totalTopics`, `completions`, `avgPercent` (mean per-student completion), `finishedStudents`, `lastActivityAt`.

### `GET /dashboard/admin-metrics`

Admin-only endpoint. Returns platform overview counts.

- Response: `totalUsers`, `activeSessions`, `openIssues`, `avgRating` (nullable, 0–5).
