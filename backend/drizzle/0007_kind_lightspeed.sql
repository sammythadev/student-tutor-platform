ALTER TYPE "public"."notification_type" ADD VALUE 'session_proposed' BEFORE 'general';--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "proposed_start_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "proposed_end_at" timestamp with time zone;