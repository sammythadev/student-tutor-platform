# Database Model

## Tables

- `users`: base identity for `admin`, `student`, and `tutor` users; unique case-insensitive email index.
- `subjects`: Nigerian secondary-school subject catalog for seed data and future normalized subject queries.
- `student_profiles`: one-to-one profile for matching inputs such as subject, grade level, exam type, requested availability, weights, budget, and preferences.
- `tutor_profiles`: one-to-one profile for matching supply such as subjects, levels, exams, availability, experience, languages, price, capacity, and assigned count.
- `tutor_subjects`: normalized tutor-to-subject mapping for future subject joins without array-only filtering.
- `schedule_slots`: normalized availability windows marked by students and tutors.
- `assignments`: student-to-tutor matching results, waitlist rows, score breakdown, and lifecycle timestamps.
- `tutor_feedback`: one feedback row per assignment for rating-driven tutor quality updates.
- `courses`: author-owned personalized course metadata (title, optional description, `provider` discriminator, `published` visibility flag) with trimmed-length checks. `provider` is `admin` for Tutorly-provided outlines and `tutor` for a tutor's own; it defaults to `tutor`, so rows created before the column existed stay correct. Titles are unique **per tutor** rather than globally, so every tutor may own their own "Chemistry".
- `course_subjects`: many-to-many link from a course to the platform subjects it covers; optional, and the reason two same-titled courses can be told apart.
- `course_topics`: ordered outline rows per course; `position` is unique per course and must be non-negative.
- `course_enrollments`: one row per course-student pair, created when a tutor sets a course for one of their own students. `added_by` records **which tutor set it**, which is not always `courses.tutor_id`: a tutor may assign a Tutorly outline or another tutor's published course, and the roster, progress and student-facing grouping all key on `added_by`.
- `course_topic_completions`: one row per completed (course, topic, student) triple; composite foreign keys bind each row to a real topic and a real enrollment.
- `session_series`: the recurring request behind a block of sessions — tutor, student, requester, subject, `recurrence` (enum `session_recurrence`: `daily` | `weekdays` | `weekly`), `weekdays` (0 = Sunday … 6 = Saturday, empty for an every-day series), `time_of_day` (`HH:MM`), `duration_minutes`, `starts_on`/`ends_on`, `weeks`, and optional notes/meeting link. Check constraints pin weeks to 1–12, duration to 15–180 minutes, the day order, and the `HH:MM` shape, so a malformed schedule cannot be stored even if the DTO is bypassed.

## Indexes

- `users_email_unique_idx`: prevents duplicate emails with case-insensitive matching.
- `users_role_status_idx`: supports admin filtering by role/status.
- `student_profiles_matching_lookup_idx`: supports matching candidate lookup by required subject context.
- `subjects_code_unique_idx`, `subjects_name_unique_idx`: enforce a clean subject catalog.
- `tutor_profiles_subjects_gin_idx`: supports subject membership queries on tutor subjects.
- `tutor_profiles_exams_gin_idx`: supports exam membership queries on tutor supported exams.
- `tutor_subjects_subject_idx`: supports normalized subject-to-tutor lookup.
- `schedule_slots_user_status_start_idx`, `schedule_slots_available_window_idx`: support user availability and matching-window reads.
- `tutor_profiles_capacity_idx`: supports filtering tutors with remaining capacity.
- `assignments_student_status_idx`, `assignments_tutor_status_idx`, `assignments_waitlist_idx`: support lifecycle and waitlist reads.
- `courses_tutor_updated_idx`: supports the owning tutor's course list ordered by recency.
- `courses_provider_updated_idx`: serves the library read from the index, so the page does not scan or sort every course.
- `courses_tutor_title_unique_idx`: unique on `(tutor_id, lower(btrim(title)))` — one course of a given name per tutor, closing the duplicate-title hole the UI could not detect. Case- and whitespace-insensitive, so " Chemistry " collides with "chemistry".
- `courses_published_updated_idx`: supports the discoverable read (`where published or provider = 'admin' order by updated_at`) beside the provider index.
- `course_subjects_subject_course_idx`: supports the library's subject filter and the per-course subject aggregate.
- `course_topics_course_position_unique_idx`, `course_topics_course_id_unique_idx`: keep outline positions unique per course and make the composite topic reference legal.
- `course_enrollments_student_assigned_idx`: supports a student's enrolled-course reads ordered by assignment time.
- `course_enrollments_added_by_idx`: supports "the courses I set for this student", which is now the roster's read path, plus the assignment-eligibility union.
- `course_completions_course_student_idx`: supports per-student progress counts without scanning the whole completion table.
- `session_series_tutor_created_idx`, `session_series_student_created_idx`: support each side's series list ordered by recency.
- `sessions_series_start_idx`: supports reading one series' occurrences in order.

## Message replies

- `messages.reply_to_id` is a nullable UUID self-reference to `messages.id`, indexed by `messages_reply_to_idx`.
- `ON DELETE SET NULL` preserves the reply message if its original is deleted; legacy/nonreply rows have null reply metadata.
- The message service requires the original to belong to the exact sender/receiver pair in either direction. Thread reads join sender, original message, and original sender in one query (no per-message enrichment queries).
- Migration `0009_late_amphibian.sql` was generated from the schema and inspected. It must be deployed before using reply-aware message endpoints; it has **not** been applied to a live database as part of this change.

## Personalized courses

- `courses`, `course_topics`, `course_enrollments`, and `course_topic_completions` are additive; nothing in the matching, scheduling, or messaging tables changed.
- `course_enrollments` and `course_topic_completions` use composite primary keys (`course_id, student_id` and `course_id, topic_id, student_id`), so enrollment and completion are idempotent by construction rather than by application checks.
- `course_topic_completions` references `course_topics(course_id, id)` and `course_enrollments(course_id, student_id)` with `ON DELETE CASCADE`, which is why deleting a topic or a course removes its progress rows without application-level cleanup. `course_topics_course_id_unique_idx` exists so those composite references are legal.
- `courses.provider` (enum `course_provider`, default `'tutor'`) separates Tutorly-provided outlines from tutor-authored ones. It is set from the authoring account's role at insert time, so `tutor_id` keeps pointing at a real owner — either a tutor or a seeded admin account — and no nullable owner column or second course table was needed.
- Migration `0011_course_provider.sql` was generated from the schema and inspected. Like `0010`, it has **not** been applied to a live database as part of this change; both must be deployed before the course endpoints and the library read are used.
- Migration `0010_personalized_courses.sql` was generated from the schema and inspected. It must be deployed before the course endpoints are used; it has **not** been applied to a live database as part of this change.
- `src/modules/courses/courses.integration.spec.ts` is the suite that needs a database. It migrates whatever `COURSES_TEST_DATABASE_URL` points at and asserts the migration ledger is stable across a second run, so point it at a disposable database only. Without that variable the suite skips and the rest of the unit suites run against fake pools.

## Tutor course ownership

- `courses.published` (boolean, default `false`) is how a tutor opens a course up beyond the students it was set for. Platform material (`provider = 'admin'`) is discoverable regardless, and publishing never transfers ownership: `tutor_id` still names the author, who keeps every edit right.
- `course_enrollments.added_by` (UUID, `NOT NULL`, cascade to `users`) is the relationship of record for "this tutor set this course for this student". It was backfilled from `courses.tutor_id` for existing rows — which is exactly who must have set them — before the constraint was applied.
- The application checks a per-tutor title collision inside the writing transaction and answers `409`; the unique index is the backstop, and a racing `unique_violation` (`23505`) is mapped to the same `409` by the service.
- Migration `0013_cool_hairball.sql` was generated from the schema and inspected. It fails if a database already holds two same-titled courses for one tutor; the file documents the query to check first:
  `SELECT tutor_id, lower(btrim(title)), count(*) FROM courses GROUP BY 1, 2 HAVING count(*) > 1;`
- Migration `0014_course-enrollment-author.sql` was generated from the schema and then edited to add the backfill (`UPDATE … SET added_by = courses.tutor_id`) between adding the nullable column and setting it `NOT NULL`, so it applies to a populated database. Every migration from `0009` onward has **not** been applied to a live database as part of this change; deploy them before using the course endpoints.

## Recurring sessions

- A recurring request is **materialised**, not virtual: `session_series` holds the schedule and `sessions` holds one real row per occurrence (`series_id` + 1-based `series_index`). Every existing flow — accept, propose another time, decline, complete, cancel — therefore works on a single day without changes, and `PATCH /sessions/series/:id/respond|cancel` is the bulk convenience on top rather than a second lifecycle.
- `sessions.series_id` is `ON DELETE SET NULL`: deleting the series row leaves the sessions alone, because cancelling a block is a status change on those sessions, not a delete.
- Both new `sessions` columns are nullable, so every pre-existing session keeps working with `series_id = NULL` and is simply not part of a block.
- The schedule columns are validated twice — by the DTO (`@IsEnum`, `@Matches`, `@Min`/`@Max`) and by the table's check constraints — and the occurrence windows are validated by the service (future, ordered, non-overlapping, no more than `weeks × 7`). The client generates the occurrence list because the browser is the only place that knows the viewer's timezone.
- Migration `0015_session-series.sql` was generated from the schema and inspected. It is additive (one table, one enum, two nullable columns) and safe on populated data. Like `0009` onward, it has **not** been applied to a live database as part of this change.
- The dashboard's learning metrics are computed from `course_topic_completions` and completed `sessions` (`src/modules/dashboard/learning.ts`), so no counter column was added. A day counts as active when either table has a row for it, which is why the streak stays honest without a nightly job.

## Migration Workflow

1. Edit `src/database/schema.ts`.
2. Run `pnpm run db:generate`.
3. Inspect the generated SQL in `drizzle/`.
4. Run `pnpm run db:migrate` only after confirming the SQL targets the intended database.

Local development can skip step 4: with `DB_AUTO_SETUP=true` the API applies
pending migrations on boot (before it accepts requests) and, when
`DB_AUTO_SEED=true` is also set, runs `db:seed` and `db:seed:courses`. Both flags
default to `false` so production keeps step 4 as a deliberate, reviewable
action, and a failure is logged without blocking startup. The seeds are
idempotent, so enabling the flags permanently is safe.

`schedule_slots` is the normalized availability source for new features; JSON availability on profiles remains for compatibility with existing core fixtures and already-created profile rows.
