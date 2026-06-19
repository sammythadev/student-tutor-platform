CREATE TYPE "public"."assignment_status" AS ENUM('active', 'completed', 'cancelled', 'waitlisted');--> statement-breakpoint
CREATE TYPE "public"."delivery_mode" AS ENUM('online', 'in-person');--> statement-breakpoint
CREATE TYPE "public"."format_preference" AS ENUM('one-on-one', 'group');--> statement-breakpoint
CREATE TYPE "public"."learning_style" AS ENUM('visual', 'auditory', 'kinesthetic');--> statement-breakpoint
CREATE TYPE "public"."teaching_style" AS ENUM('interactive', 'lecture');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'student', 'tutor');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tutor_id" uuid,
	"status" "assignment_status" DEFAULT 'waitlisted' NOT NULL,
	"match_score" numeric(5, 4),
	"score_breakdown" jsonb,
	"reason" text,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "assignments_match_score_bounds_chk" CHECK ("assignments"."match_score" IS NULL OR ("assignments"."match_score" >= 0 AND "assignments"."match_score" <= 1))
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"user_id" uuid NOT NULL,
	"required_subject" text NOT NULL,
	"grade_level" integer NOT NULL,
	"exam_type" text NOT NULL,
	"requested_availability" jsonb NOT NULL,
	"preference_weights" jsonb,
	"budget" numeric(10, 2),
	"delivery_preference" "delivery_mode",
	"format_preference" "format_preference",
	"learning_style_preference" "learning_style",
	"languages" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"subject_specialization" text,
	"booking_timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_profiles_user_id_pk" PRIMARY KEY("user_id"),
	CONSTRAINT "student_profiles_grade_level_positive_chk" CHECK ("student_profiles"."grade_level" > 0)
);
--> statement-breakpoint
CREATE TABLE "tutor_feedback" (
	"assignment_id" uuid NOT NULL,
	"tutor_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tutor_feedback_assignment_id_pk" PRIMARY KEY("assignment_id"),
	CONSTRAINT "tutor_feedback_rating_bounds_chk" CHECK ("tutor_feedback"."rating" BETWEEN 0 AND 5)
);
--> statement-breakpoint
CREATE TABLE "tutor_profiles" (
	"user_id" uuid NOT NULL,
	"subjects_taught" text[] NOT NULL,
	"specializations" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"grade_levels_supported" integer[] NOT NULL,
	"exam_types_supported" text[] NOT NULL,
	"availability" jsonb NOT NULL,
	"experience_years" integer DEFAULT 0 NOT NULL,
	"languages" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"teaching_style" "teaching_style",
	"delivery_style" "delivery_mode",
	"format_style" "format_preference",
	"avg_rating" numeric(3, 2),
	"hourly_rate" numeric(10, 2) NOT NULL,
	"capacity" integer DEFAULT 0 NOT NULL,
	"assigned_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tutor_profiles_user_id_pk" PRIMARY KEY("user_id"),
	CONSTRAINT "tutor_profiles_experience_non_negative_chk" CHECK ("tutor_profiles"."experience_years" >= 0),
	CONSTRAINT "tutor_profiles_capacity_non_negative_chk" CHECK ("tutor_profiles"."capacity" >= 0),
	CONSTRAINT "tutor_profiles_assigned_count_bounds_chk" CHECK ("tutor_profiles"."assigned_count" >= 0 AND "tutor_profiles"."assigned_count" <= "tutor_profiles"."capacity"),
	CONSTRAINT "tutor_profiles_avg_rating_bounds_chk" CHECK ("tutor_profiles"."avg_rating" IS NULL OR ("tutor_profiles"."avg_rating" >= 0 AND "tutor_profiles"."avg_rating" <= 1))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_feedback" ADD CONSTRAINT "tutor_feedback_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_feedback" ADD CONSTRAINT "tutor_feedback_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_feedback" ADD CONSTRAINT "tutor_feedback_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_profiles" ADD CONSTRAINT "tutor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignments_student_status_idx" ON "assignments" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "assignments_tutor_status_idx" ON "assignments" USING btree ("tutor_id","status");--> statement-breakpoint
CREATE INDEX "assignments_waitlist_idx" ON "assignments" USING btree ("status","assigned_at");--> statement-breakpoint
CREATE INDEX "student_profiles_matching_lookup_idx" ON "student_profiles" USING btree ("required_subject","grade_level","exam_type");--> statement-breakpoint
CREATE INDEX "tutor_feedback_tutor_created_idx" ON "tutor_feedback" USING btree ("tutor_id","created_at");--> statement-breakpoint
CREATE INDEX "tutor_profiles_subjects_gin_idx" ON "tutor_profiles" USING gin ("subjects_taught");--> statement-breakpoint
CREATE INDEX "tutor_profiles_exams_gin_idx" ON "tutor_profiles" USING gin ("exam_types_supported");--> statement-breakpoint
CREATE INDEX "tutor_profiles_capacity_idx" ON "tutor_profiles" USING btree ("capacity","assigned_count");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "users_role_status_idx" ON "users" USING btree ("role","status");