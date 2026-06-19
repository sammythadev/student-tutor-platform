CREATE TYPE "public"."schedule_slot_status" AS ENUM('available', 'booked', 'cancelled');--> statement-breakpoint
CREATE TABLE "schedule_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" "schedule_slot_status" DEFAULT 'available' NOT NULL,
	"region" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_slots_time_order_chk" CHECK ("schedule_slots"."end_at" > "schedule_slots"."start_at")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'secondary' NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_subjects" (
	"tutor_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tutor_subjects_tutor_id_subject_id_pk" PRIMARY KEY("tutor_id","subject_id")
);
--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "tutor_profiles" ADD COLUMN "primary_subject_id" uuid;--> statement-breakpoint
ALTER TABLE "tutor_profiles" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_subjects" ADD CONSTRAINT "tutor_subjects_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_subjects" ADD CONSTRAINT "tutor_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "schedule_slots_user_status_start_idx" ON "schedule_slots" USING btree ("user_id","status","start_at");--> statement-breakpoint
CREATE INDEX "schedule_slots_available_window_idx" ON "schedule_slots" USING btree ("status","start_at","end_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_code_unique_idx" ON "subjects" USING btree (lower("code"));--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_name_unique_idx" ON "subjects" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "subjects_category_active_idx" ON "subjects" USING btree ("category","is_active");--> statement-breakpoint
CREATE INDEX "tutor_subjects_subject_idx" ON "tutor_subjects" USING btree ("subject_id");--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_profiles" ADD CONSTRAINT "tutor_profiles_primary_subject_id_subjects_id_fk" FOREIGN KEY ("primary_subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;