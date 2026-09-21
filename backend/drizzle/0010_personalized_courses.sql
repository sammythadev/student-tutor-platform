CREATE TABLE "course_enrollments" (
	"course_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_enrollments_pk" PRIMARY KEY("course_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "course_topic_completions" (
	"course_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_topic_completions_pk" PRIMARY KEY("course_id","topic_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "course_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_topics_title_chk" CHECK (char_length(btrim("course_topics"."title")) BETWEEN 1 AND 160),
	CONSTRAINT "course_topics_content_chk" CHECK ("course_topics"."content" IS NULL OR char_length("course_topics"."content") <= 20000),
	CONSTRAINT "course_topics_position_chk" CHECK ("course_topics"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_title_chk" CHECK (char_length(btrim("courses"."title")) BETWEEN 1 AND 120),
	CONSTRAINT "courses_description_chk" CHECK ("courses"."description" IS NULL OR char_length("courses"."description") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_topics_course_id_unique_idx" ON "course_topics" USING btree ("course_id","id");--> statement-breakpoint
ALTER TABLE "course_topic_completions" ADD CONSTRAINT "course_completions_topic_fk" FOREIGN KEY ("course_id","topic_id") REFERENCES "public"."course_topics"("course_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_topic_completions" ADD CONSTRAINT "course_completions_enrollment_fk" FOREIGN KEY ("course_id","student_id") REFERENCES "public"."course_enrollments"("course_id","student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_topics" ADD CONSTRAINT "course_topics_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_enrollments_student_assigned_idx" ON "course_enrollments" USING btree ("student_id","assigned_at","course_id");--> statement-breakpoint
CREATE INDEX "course_completions_course_student_idx" ON "course_topic_completions" USING btree ("course_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_topics_course_position_unique_idx" ON "course_topics" USING btree ("course_id","position");--> statement-breakpoint
CREATE INDEX "courses_tutor_updated_idx" ON "courses" USING btree ("tutor_id","updated_at","id");