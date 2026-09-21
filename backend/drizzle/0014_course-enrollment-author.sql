-- 0014 — Who set the course for the student
--
-- A tutor may now assign a Tutorly outline (or another tutor's published course) to
-- their own student, so "which tutor set this course" is no longer derivable from
-- `courses.tutor_id`. The roster, the eligibility union and the student's course
-- grouping all key on this column.
--
-- Existing rows were necessarily set by the course author, so they are backfilled
-- before the NOT NULL constraint is applied. No pre-flight check is needed: the
-- UPDATE can always resolve `courses.tutor_id`.
ALTER TABLE "course_enrollments" ADD COLUMN "added_by" uuid;--> statement-breakpoint
UPDATE "course_enrollments"
SET "added_by" = "courses"."tutor_id"
FROM "courses"
WHERE "courses"."id" = "course_enrollments"."course_id";--> statement-breakpoint
ALTER TABLE "course_enrollments" ALTER COLUMN "added_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_enrollments_added_by_idx" ON "course_enrollments" USING btree ("added_by","assigned_at","course_id");
