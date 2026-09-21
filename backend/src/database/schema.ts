import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  foreignKey,
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
export const formatPreferenceEnum = pgEnum('format_preference', ['one-on-one', 'group']);
export const learningStyleEnum = pgEnum('learning_style', [
  'visual',
  'auditory',
  'kinesthetic',
  'mixed',
]);
export const teachingStyleEnum = pgEnum('teaching_style', ['interactive', 'lecture']);
export const learningPaceEnum = pgEnum('learning_pace', ['fast', 'moderate', 'steady']);
export const scheduleSlotStatusEnum = pgEnum('schedule_slot_status', [
  'available',
  'booked',
  'cancelled',
]);
/**
 * How a series repeats. `weekdays` reads the explicit day list, `daily` is every
 * day, and `weekly` repeats on the day(s) in `weekdays` too — the difference the
 * UI shows is the preset, and both are validated against the same list.
 */
export const sessionRecurrenceEnum = pgEnum('session_recurrence', ['daily', 'weekdays', 'weekly']);
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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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
    subjects: text('subjects')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
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
    budget: numeric('budget', { precision: 10, scale: 2, mode: 'number' }),
    deliveryPreference: deliveryModeEnum('delivery_preference'),
    formatPreference: formatPreferenceEnum('format_preference'),
    learningStylePreference: learningStyleEnum('learning_style_preference'),
    learningPace: learningPaceEnum('learning_pace'),
    languages: text('languages')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    subjectSpecialization: text('subject_specialization'),
    region: text('region'),
    // Profile enrichment
    bio: text('bio'),
    learningGoals: text('learning_goals'),
    totalHoursLearned: numeric('total_hours_learned', { precision: 8, scale: 2 }).default('0'),
    streakDays: integer('streak_days').notNull().default(0),
    bookingTimestamp: timestamp('booking_timestamp', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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
    specializations: text('specializations')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    gradeLevelsSupported: integer('grade_levels_supported').array().notNull(),
    examTypesSupported: text('exam_types_supported').array().notNull(),
    availability: jsonb('availability').$type<Array<{ start: string; end: string }>>().notNull(),
    experienceYears: integer('experience_years').notNull().default(0),
    languages: text('languages')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    region: text('region'),
    teachingStyle: teachingStyleEnum('teaching_style'),
    teachingPace: learningPaceEnum('teaching_pace'),
    deliveryStyle: deliveryModeEnum('delivery_style'),
    formatStyle: formatPreferenceEnum('format_style'),
    avgRating: numeric('avg_rating', { precision: 3, scale: 2, mode: 'number' }),
    hourlyRate: numeric('hourly_rate', { precision: 10, scale: 2, mode: 'number' }).notNull(),
    capacity: integer('capacity').notNull().default(0),
    assignedCount: integer('assigned_count').notNull().default(0),
    // Profile enrichment
    bio: text('bio'),
    ratingCount: integer('rating_count').notNull().default(0),
    studentsCount: integer('students_count').notNull().default(0),
    isVerified: integer('is_verified').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId] }),
    index('tutor_profiles_subjects_gin_idx').using('gin', table.subjectsTaught),
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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.tutorId, table.subjectId] }),
    index('tutor_subjects_subject_idx').on(table.subjectId),
  ],
);

export const courseSubjects = pgTable(
  'course_subjects',
  {
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'course_subjects_pk', columns: [table.courseId, table.subjectId] }),
    index('course_subjects_subject_course_idx').on(table.subjectId, table.courseId),
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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('schedule_slots_user_status_start_idx').on(table.userId, table.status, table.startAt),
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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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
    proposedStartAt: timestamp('proposed_start_at', { withTimezone: true }),
    proposedEndAt: timestamp('proposed_end_at', { withTimezone: true }),
    // A recurring request is materialised as one ordinary session per occurrence, all
    // sharing a series row. Every existing flow — accept, propose, decline, complete,
    // cancel — then keeps working on a single day, and the series is only a grouping
    // key plus the schedule the occurrences were generated from.
    seriesId: uuid('series_id').references(() => sessionSeries.id, { onDelete: 'set null' }),
    // 1-based position within the series, so "session 3 of 12" needs no window count.
    seriesIndex: integer('series_index'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('sessions_student_status_start_idx').on(table.studentId, table.status, table.startAt),
    index('sessions_tutor_status_start_idx').on(table.tutorId, table.status, table.startAt),
    index('sessions_series_start_idx').on(table.seriesId, table.startAt),
    check('sessions_time_order_chk', sql`${table.endAt} > ${table.startAt}`),
  ],
);

/**
 * The recurring request behind a block of sessions: who asked for what, on which
 * pattern, over which horizon. Deleting it leaves the sessions intact (`set null`),
 * because cancelling a series is a status change on those sessions, not a delete.
 */
export const sessionSeries = pgTable(
  'session_series',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tutorId: uuid('tutor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    subject: text('subject').notNull(),
    recurrence: sessionRecurrenceEnum('recurrence').notNull(),
    /** 0 = Sunday … 6 = Saturday, sorted; empty for an every-day series. */
    weekdays: integer('weekdays')
      .array()
      .notNull()
      .default(sql`'{}'::integer[]`),
    /** Local wall-clock time of day, `HH:MM`, that every occurrence starts at. */
    timeOfDay: text('time_of_day').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on').notNull(),
    weeks: integer('weeks').notNull(),
    notes: text('notes'),
    meetingUrl: text('meeting_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('session_series_tutor_created_idx').on(table.tutorId, table.createdAt, table.id),
    index('session_series_student_created_idx').on(table.studentId, table.createdAt, table.id),
    check('session_series_weeks_chk', sql`${table.weeks} BETWEEN 1 AND 12`),
    check('session_series_duration_chk', sql`${table.durationMinutes} BETWEEN 15 AND 180`),
    check('session_series_order_chk', sql`${table.endsOn} >= ${table.startsOn}`),
    check('session_series_time_chk', sql`${table.timeOfDay} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`),
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
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    likesCount: integer('likes_count').notNull().default(0),
    commentsCount: integer('comments_count').notNull().default(0),
    isPromo: integer('is_promo').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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
    replyToId: uuid('reply_to_id').references((): AnyPgColumn => messages.id, {
      onDelete: 'set null',
    }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('messages_sender_receiver_idx').on(table.senderId, table.receiverId),
    index('messages_receiver_read_idx').on(table.receiverId, table.readAt),
    index('messages_reply_to_idx').on(table.replyToId),
  ],
);

// ─── Notifications (time-based alerts for users) ─────────────────────────────
export const notificationTypeEnum = pgEnum('notification_type', [
  'session_request',
  'session_upcoming',
  'session_passed',
  'session_cancelled',
  'session_accepted',
  'session_proposed',
  'general',
]);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull().default('general'),
    title: text('title').notNull(),
    message: text('message').notNull(),
    isRead: integer('is_read').notNull().default(0),
    relatedId: text('related_id'), // session/assignment id for deep linking
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('notifications_user_read_idx').on(table.userId, table.isRead),
    index('notifications_user_created_idx').on(table.userId, table.createdAt),
  ],
);

export const courseProviderEnum = pgEnum('course_provider', ['tutor', 'admin']);

export const courses = pgTable(
  'courses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tutorId: uuid('tutor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Who provided the course: an admin authors Tutorly-provided material, a
    // tutor authors their own. Stored rather than derived from the owner's role
    // so the label stays stable and the library read can use an index.
    provider: courseProviderEnum('provider').notNull().default('tutor'),
    title: text('title').notNull(),
    description: text('description'),
    // A tutor's course is private to them and the students they set it for. Only a
    // published course is discoverable by accounts the author has no relationship
    // with; platform material (`provider = 'admin'`) is always discoverable.
    published: boolean('published').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('courses_title_chk', sql`char_length(btrim(${table.title})) BETWEEN 1 AND 120`),
    check(
      'courses_description_chk',
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 2000`,
    ),
    index('courses_tutor_updated_idx').on(table.tutorId, table.updatedAt, table.id),
    index('courses_provider_updated_idx').on(table.provider, table.updatedAt, table.id),
    index('courses_published_updated_idx').on(table.published, table.updatedAt, table.id),
    // Titles are unique **per tutor**, case- and whitespace-insensitive: every tutor
    // may own their own "Chemistry", while one tutor cannot create the same course
    // twice by accident. Published copies stay distinguishable by author.
    uniqueIndex('courses_tutor_title_unique_idx').on(
      table.tutorId,
      sql`lower(btrim(${table.title}))`,
    ),
  ],
);

export const courseTopics = pgTable(
  'course_topics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content'),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('course_topics_title_chk', sql`char_length(btrim(${table.title})) BETWEEN 1 AND 160`),
    check(
      'course_topics_content_chk',
      sql`${table.content} IS NULL OR char_length(${table.content}) <= 20000`,
    ),
    check('course_topics_position_chk', sql`${table.position} >= 0`),
    uniqueIndex('course_topics_course_position_unique_idx').on(table.courseId, table.position),
    uniqueIndex('course_topics_course_id_unique_idx').on(table.courseId, table.id),
  ],
);

export const courseEnrollments = pgTable(
  'course_enrollments',
  {
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Which tutor set this course for the student. Usually the course author, but a
    // tutor may also set a Tutorly outline (or another tutor's published course) for
    // their own student. Stored rather than inferred from `courses.tutor_id`, because
    // keying the roster on the author silently hid every course a tutor assigned that
    // they did not author.
    addedBy: uuid('added_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'course_enrollments_pk', columns: [table.courseId, table.studentId] }),
    index('course_enrollments_student_assigned_idx').on(
      table.studentId,
      table.assignedAt,
      table.courseId,
    ),
    // "The courses I set for this student" — the roster's read path.
    index('course_enrollments_added_by_idx').on(table.addedBy, table.assignedAt, table.courseId),
  ],
);

export const courseTopicCompletions = pgTable(
  'course_topic_completions',
  {
    courseId: uuid('course_id').notNull(),
    topicId: uuid('topic_id').notNull(),
    studentId: uuid('student_id').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'course_topic_completions_pk',
      columns: [table.courseId, table.topicId, table.studentId],
    }),
    foreignKey({
      name: 'course_completions_topic_fk',
      columns: [table.courseId, table.topicId],
      foreignColumns: [courseTopics.courseId, courseTopics.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'course_completions_enrollment_fk',
      columns: [table.courseId, table.studentId],
      foreignColumns: [courseEnrollments.courseId, courseEnrollments.studentId],
    }).onDelete('cascade'),
    index('course_completions_course_student_idx').on(table.courseId, table.studentId),
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
export type NotificationRecord = typeof notifications.$inferSelect;
export type NewNotificationRecord = typeof notifications.$inferInsert;
export type CourseRecord = typeof courses.$inferSelect;
export type NewCourseRecord = typeof courses.$inferInsert;
export type CourseTopicRecord = typeof courseTopics.$inferSelect;
export type NewCourseTopicRecord = typeof courseTopics.$inferInsert;
export type CourseEnrollmentRecord = typeof courseEnrollments.$inferSelect;
export type NewCourseEnrollmentRecord = typeof courseEnrollments.$inferInsert;
export type CourseTopicCompletionRecord = typeof courseTopicCompletions.$inferSelect;
export type NewCourseTopicCompletionRecord = typeof courseTopicCompletions.$inferInsert;
