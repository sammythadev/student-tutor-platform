import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'student', 'tutor', 'unassigned']);
export const userStatusEnum = pgEnum('user_status', ['active', 'disabled']);
export const assignmentStatusEnum = pgEnum('assignment_status', [
  'active',
  'completed',
  'cancelled',
  'waitlisted',
]);
export const deliveryModeEnum = pgEnum('delivery_mode', ['online', 'in-person']);
export const formatPreferenceEnum = pgEnum('format_preference', [
  'one-on-one',
  'group',
]);
export const learningStyleEnum = pgEnum('learning_style', [
  'visual',
  'auditory',
  'kinesthetic',
]);
export const teachingStyleEnum = pgEnum('teaching_style', [
  'interactive',
  'lecture',
]);
export const scheduleSlotStatusEnum = pgEnum('schedule_slot_status', [
  'available',
  'booked',
  'cancelled',
]);
export const sessionStatusEnum = pgEnum('session_status', [
  'pending',
  'upcoming',
  'starting-soon',
  'completed',
  'cancelled',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash'),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    region: text('region'),
    role: userRoleEnum('role').notNull(),
    status: userStatusEnum('status').notNull().default('active'),
    // User settings & display
    avatarUrl: text('avatar_url'),
    timezone: text('timezone').default('UTC'),
    language: text('language').default('English'),
    theme: text('theme').default('dark'),
    accentColor: text('accent_color').default('lavender'),
    notificationPrefs: jsonb('notification_prefs').$type<{
      sessionReminders?: boolean;
      newMessages?: boolean;
      sessionUpdates?: boolean;
      marketingEmails?: boolean;
      weeklyReports?: boolean;
    }>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('users_email_unique_idx').on(sql`lower(${table.email})`),
    index('users_role_status_idx').on(table.role, table.status),
  ],
);

export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    category: text('category').notNull().default('secondary'),
    isActive: integer('is_active').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('subjects_code_unique_idx').on(sql`lower(${table.code})`),
    uniqueIndex('subjects_name_unique_idx').on(sql`lower(${table.name})`),
    index('subjects_category_active_idx').on(table.category, table.isActive),
  ],
);

export const studentProfiles = pgTable(
  'student_profiles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
    // Keep requiredSubject for matchmaking engine backward compat; subjects[] is the UI-facing list
    requiredSubject: text('required_subject').notNull(),
    subjects: text('subjects').array().notNull().default(sql`ARRAY[]::text[]`),
    gradeLevel: integer('grade_level').notNull(),
    examType: text('exam_type').notNull(),
    requestedAvailability: jsonb('requested_availability')
      .$type<Array<{ start: string; end: string }>>()
      .notNull(),
    preferenceWeights: jsonb('preference_weights').$type<{
      subjectFit?: number;
      availability?: number;
      experience?: number;
      languageStyleFit?: number;
      feedback?: number;
      loadFactor?: number;
    }>(),
    budget: numeric('budget', { precision: 10, scale: 2 }),
    deliveryPreference: deliveryModeEnum('delivery_preference'),
    formatPreference: formatPreferenceEnum('format_preference'),
    learningStylePreference: learningStyleEnum('learning_style_preference'),
    languages: text('languages').array().notNull().default(sql`ARRAY[]::text[]`),
    subjectSpecialization: text('subject_specialization'),
    region: text('region'),
    // Profile enrichment
    bio: text('bio'),
    learningGoals: text('learning_goals'),
    totalHoursLearned: numeric('total_hours_learned', { precision: 8, scale: 2 }).default('0'),
    streakDays: integer('streak_days').notNull().default(0),
    bookingTimestamp: timestamp('booking_timestamp', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId] }),
    index('student_profiles_matching_lookup_idx').on(
      table.requiredSubject,
      table.gradeLevel,
      table.examType,
    ),
    check('student_profiles_grade_level_positive_chk', sql`${table.gradeLevel} > 0`),
  ],
);

export const tutorProfiles = pgTable(
  'tutor_profiles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    primarySubjectId: uuid('primary_subject_id').references(() => subjects.id, {
      onDelete: 'set null',
    }),
    subjectsTaught: text('subjects_taught').array().notNull(),
    specializations: text('specializations').array().notNull().default(sql`ARRAY[]::text[]`),
    gradeLevelsSupported: integer('grade_levels_supported').array().notNull(),
    examTypesSupported: text('exam_types_supported').array().notNull(),
    availability: jsonb('availability')
      .$type<Array<{ start: string; end: string }>>()
      .notNull(),
    experienceYears: integer('experience_years').notNull().default(0),
    languages: text('languages').array().notNull().default(sql`ARRAY[]::text[]`),
    region: text('region'),
    teachingStyle: teachingStyleEnum('teaching_style'),
    deliveryStyle: deliveryModeEnum('delivery_style'),
    formatStyle: formatPreferenceEnum('format_style'),
    avgRating: numeric('avg_rating', { precision: 3, scale: 2 }),
    hourlyRate: numeric('hourly_rate', { precision: 10, scale: 2 }).notNull(),
    capacity: integer('capacity').notNull().default(0),
    assignedCount: integer('assigned_count').notNull().default(0),
    // Profile enrichment
    bio: text('bio'),
    ratingCount: integer('rating_count').notNull().default(0),
    studentsCount: integer('students_count').notNull().default(0),
    isVerified: integer('is_verified').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId] }),
    index('tutor_profiles_subjects_gin_idx').using(
      'gin',
      table.subjectsTaught,
    ),
    index('tutor_profiles_exams_gin_idx').using('gin', table.examTypesSupported),
    index('tutor_profiles_capacity_idx').on(table.capacity, table.assignedCount),
    check('tutor_profiles_experience_non_negative_chk', sql`${table.experienceYears} >= 0`),
    check('tutor_profiles_capacity_non_negative_chk', sql`${table.capacity} >= 0`),
    check(
      'tutor_profiles_assigned_count_bounds_chk',
      sql`${table.assignedCount} >= 0 AND ${table.assignedCount} <= ${table.capacity}`,
    ),
    check(
      'tutor_profiles_avg_rating_bounds_chk',
      sql`${table.avgRating} IS NULL OR (${table.avgRating} >= 0 AND ${table.avgRating} <= 1)`,
    ),
  ],
);

export const tutorSubjects = pgTable(
  'tutor_subjects',
  {
    tutorId: uuid('tutor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.tutorId, table.subjectId] }),
    index('tutor_subjects_subject_idx').on(table.subjectId),
  ],
);

export const scheduleSlots = pgTable(
  'schedule_slots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    status: scheduleSlotStatusEnum('status').notNull().default('available'),
    region: text('region'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('schedule_slots_user_status_start_idx').on(
      table.userId,
      table.status,
      table.startAt,
    ),
    index('schedule_slots_available_window_idx').on(table.status, table.startAt, table.endAt),
    check('schedule_slots_time_order_chk', sql`${table.endAt} > ${table.startAt}`),
  ],
);

export const assignments = pgTable(
  'assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tutorId: uuid('tutor_id').references(() => users.id, { onDelete: 'set null' }),
    status: assignmentStatusEnum('status').notNull().default('waitlisted'),
    matchScore: numeric('match_score', { precision: 5, scale: 4 }),
    scoreBreakdown: jsonb('score_breakdown').$type<Record<string, unknown>>(),
    reason: text('reason'),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (table) => [
    index('assignments_student_status_idx').on(table.studentId, table.status),
    index('assignments_tutor_status_idx').on(table.tutorId, table.status),
    index('assignments_waitlist_idx').on(table.status, table.assignedAt),
    check(
      'assignments_match_score_bounds_chk',
      sql`${table.matchScore} IS NULL OR (${table.matchScore} >= 0 AND ${table.matchScore} <= 1)`,
    ),
  ],
);

export const tutorFeedback = pgTable(
  'tutor_feedback',
  {
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => assignments.id, { onDelete: 'cascade' }),
    tutorId: uuid('tutor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.assignmentId] }),
    index('tutor_feedback_tutor_created_idx').on(table.tutorId, table.createdAt),
    check('tutor_feedback_rating_bounds_chk', sql`${table.rating} BETWEEN 0 AND 5`),
  ],
);

// ─── Sessions (calendared meetings between a student and tutor) ──────────────
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tutorId: uuid('tutor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    initiatorId: uuid('initiator_id').references(() => users.id, { onDelete: 'set null' }),
    subject: text('subject').notNull(),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    status: sessionStatusEnum('status').notNull().default('pending'),
    meetingUrl: text('meeting_url'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('sessions_student_status_start_idx').on(table.studentId, table.status, table.startAt),
    index('sessions_tutor_status_start_idx').on(table.tutorId, table.status, table.startAt),
    check('sessions_time_order_chk', sql`${table.endAt} > ${table.startAt}`),
  ],
);

// ─── Posts (social feed by tutors / students) ────────────────────────────────
export const posts = pgTable(
  'posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    attachments: jsonb('attachments')
      .$type<Array<{ type: 'link' | 'book'; title: string; meta?: string; url?: string }>>()
      .default(sql`'[]'::jsonb`),
    tags: text('tags').array().notNull().default(sql`ARRAY[]::text[]`),
    likesCount: integer('likes_count').notNull().default(0),
    commentsCount: integer('comments_count').notNull().default(0),
    isPromo: integer('is_promo').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('posts_author_created_idx').on(table.authorId, table.createdAt),
    index('posts_tags_gin_idx').using('gin', table.tags),
  ],
);

// ─── Post Likes (junction for toggling likes) ────────────────────────────────
export const postLikes = pgTable(
  'post_likes',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.userId] }),
    index('post_likes_user_idx').on(table.userId),
  ],
);

// ─── Messages (direct messages between users) ─────────────────────────────────
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    receiverId: uuid('receiver_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('messages_sender_receiver_idx').on(table.senderId, table.receiverId),
    index('messages_receiver_read_idx').on(table.receiverId, table.readAt),
  ],
);

// ─── Inferred types ───────────────────────────────────────────────────────────
export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
export type StudentProfileRecord = typeof studentProfiles.$inferSelect;
export type NewStudentProfileRecord = typeof studentProfiles.$inferInsert;
export type TutorProfileRecord = typeof tutorProfiles.$inferSelect;
export type NewTutorProfileRecord = typeof tutorProfiles.$inferInsert;
export type SubjectRecord = typeof subjects.$inferSelect;
export type NewSubjectRecord = typeof subjects.$inferInsert;
export type ScheduleSlotRecord = typeof scheduleSlots.$inferSelect;
export type NewScheduleSlotRecord = typeof scheduleSlots.$inferInsert;
export type SessionRecord = typeof sessions.$inferSelect;
export type NewSessionRecord = typeof sessions.$inferInsert;
export type PostRecord = typeof posts.$inferSelect;
export type NewPostRecord = typeof posts.$inferInsert;
export type PostLikeRecord = typeof postLikes.$inferSelect;
export type MessageRecord = typeof messages.$inferSelect;
export type NewMessageRecord = typeof messages.$inferInsert;
