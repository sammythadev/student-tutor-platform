CREATE TYPE "public"."course_provider" AS ENUM('tutor', 'admin');--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "provider" "course_provider" DEFAULT 'tutor' NOT NULL;--> statement-breakpoint
CREATE INDEX "courses_provider_updated_idx" ON "courses" USING btree ("provider","updated_at","id");