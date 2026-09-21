-- 0013 — Tutor course ownership: visibility + per-tutor titles
--
-- `published` marks a course its author opened up beyond the students they set it
-- for; platform material (provider = 'admin') is discoverable regardless.
--
-- Titles are unique PER TUTOR, case- and whitespace-insensitive, so every tutor may
-- own their own "Chemistry" while a single tutor cannot create the same course twice
-- by accident. Published copies stay distinguishable by their author.
--
-- ⚠️ This fails if a database already holds two same-titled courses for one tutor.
-- Check before applying:
--   SELECT tutor_id, lower(btrim(title)), count(*)
--   FROM courses GROUP BY 1, 2 HAVING count(*) > 1;
-- Rename or delete the duplicates, then re-run `pnpm run db:migrate`.
--
ALTER TABLE "courses" ADD COLUMN "published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "courses_published_updated_idx" ON "courses" USING btree ("published","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_tutor_title_unique_idx" ON "courses" USING btree ("tutor_id",lower(btrim("title")));