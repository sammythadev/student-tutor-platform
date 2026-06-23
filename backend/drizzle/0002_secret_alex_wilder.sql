CREATE TYPE "public"."session_status" AS ENUM('upcoming', 'starting-soon', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "post_likes" (
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_likes_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"is_promo" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tutor_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" "session_status" DEFAULT 'upcoming' NOT NULL,
	"meeting_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_time_order_chk" CHECK ("sessions"."end_at" > "sessions"."start_at")
);
--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "subjects" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "learning_goals" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "total_hours_learned" numeric(8, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "streak_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tutor_profiles" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "tutor_profiles" ADD COLUMN "rating_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tutor_profiles" ADD COLUMN "students_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" text DEFAULT 'UTC';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "language" text DEFAULT 'English';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "theme" text DEFAULT 'dark';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "accent_color" text DEFAULT 'lavender';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_prefs" jsonb;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_likes_user_idx" ON "post_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "posts_author_created_idx" ON "posts" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "posts_tags_gin_idx" ON "posts" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "sessions_student_status_start_idx" ON "sessions" USING btree ("student_id","status","start_at");--> statement-breakpoint
CREATE INDEX "sessions_tutor_status_start_idx" ON "sessions" USING btree ("tutor_id","status","start_at");