CREATE TYPE "public"."learning_pace" AS ENUM('fast', 'moderate', 'steady');--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "learning_pace" "learning_pace";--> statement-breakpoint
ALTER TABLE "tutor_profiles" ADD COLUMN "teaching_pace" "learning_pace";