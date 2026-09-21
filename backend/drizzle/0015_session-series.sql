-- 0015 — recurring session requests. Additive and safe on populated data: one new table,
-- one new enum and two nullable columns on "sessions". Every existing session keeps
-- series_id = NULL and behaves exactly as before. A recurring request is stored as one
-- ordinary session per occurrence, so accept/propose/decline/complete/cancel all keep
-- working one day at a time; "session_series" only holds the schedule they came from.
CREATE TYPE "public"."session_recurrence" AS ENUM('daily', 'weekdays', 'weekly');--> statement-breakpoint
CREATE TABLE "session_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"created_by_id" uuid,
	"subject" text NOT NULL,
	"recurrence" "session_recurrence" NOT NULL,
	"weekdays" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"time_of_day" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"weeks" integer NOT NULL,
	"notes" text,
	"meeting_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_series_weeks_chk" CHECK ("session_series"."weeks" BETWEEN 1 AND 12),
	CONSTRAINT "session_series_duration_chk" CHECK ("session_series"."duration_minutes" BETWEEN 15 AND 180),
	CONSTRAINT "session_series_order_chk" CHECK ("session_series"."ends_on" >= "session_series"."starts_on"),
	CONSTRAINT "session_series_time_chk" CHECK ("session_series"."time_of_day" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "series_id" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "series_index" integer;--> statement-breakpoint
ALTER TABLE "session_series" ADD CONSTRAINT "session_series_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_series" ADD CONSTRAINT "session_series_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_series" ADD CONSTRAINT "session_series_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_series_tutor_created_idx" ON "session_series" USING btree ("tutor_id","created_at","id");--> statement-breakpoint
CREATE INDEX "session_series_student_created_idx" ON "session_series" USING btree ("student_id","created_at","id");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_series_id_session_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."session_series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_series_start_idx" ON "sessions" USING btree ("series_id","start_at");