CREATE TABLE "course_subjects" (
	"course_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_subjects_pk" PRIMARY KEY("course_id","subject_id")
);
--> statement-breakpoint
ALTER TABLE "course_subjects" ADD CONSTRAINT "course_subjects_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_subjects" ADD CONSTRAINT "course_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_subjects_subject_course_idx" ON "course_subjects" USING btree ("subject_id","course_id");