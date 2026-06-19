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

## Migration Workflow

1. Edit `src/database/schema.ts`.
2. Run `pnpm run db:generate`.
3. Inspect the generated SQL in `drizzle/`.
4. Run `pnpm run db:migrate` only after confirming the SQL targets the intended database.

`schedule_slots` is the normalized availability source for new features; JSON availability on profiles remains for compatibility with existing core fixtures and already-created profile rows.
