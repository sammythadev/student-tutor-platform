import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '@common/auth';
import type { AppTransaction, CourseRecord } from '@database';
import { CoursesRepository } from './courses.repository';
import type {
  CourseQueryDto,
  CreateCourseDto,
  CreateCourseTopicDto,
  UpdateCourseDto,
  UpdateCourseTopicDto,
  CourseOrderDto,
} from './dtos/course.dto';

import type { CourseProvider } from './courses.types';

/**
 * What a caller wants to do with a course, which decides who may do it:
 *
 * - `read` — the author, an enrolled student, or anyone reading a course that is
 *   discoverable (platform material, or a course its author published).
 * - `manage` — the author alone: metadata, outline and the course roster.
 * - `assign` — the author, or any tutor (or admin) for a discoverable course. A
 *   tutor may set a Tutorly outline or another tutor's published course for their
 *   own student, so authoring and assigning are deliberately different rights.
 */
type CourseAccess = 'read' | 'manage' | 'assign';

/** pg's `unique_violation`, raised by `courses_tutor_title_unique_idx` on a race. */
const isUniqueViolation = (cause: unknown): boolean =>
  typeof cause === 'object' && cause !== null && (cause as { code?: string }).code === '23505';

@Injectable()
export class CoursesService {
  constructor(private readonly repository: CoursesRepository) {}

  /** Admins author Tutorly-provided courses; tutors author their own. */
  private isAuthor(user: AuthenticatedUser): boolean {
    return user.role === 'tutor' || user.role === 'admin';
  }

  private requireRole(user: AuthenticatedUser, authorOnly = false): void {
    if (!this.isAuthor(user) && (authorOnly || user.role !== 'student')) {
      throw new ForbiddenException('Courses are available to students, tutors and admins');
    }
  }

  /** Discoverable beyond the students a course was set for: platform material, or published. */
  private isDiscoverable(course: CourseRecord): boolean {
    return course.provider === 'admin' || course.published;
  }

  /**
   * Resolves the course a call is allowed to act on, or throws the same `404` for
   * "does not exist" and "not yours" so the API never discloses someone else's
   * course.
   *
   * Readable by: the owning account, an enrolled student, and **any course role for
   * a discoverable course** — `GET /courses/library` offers those to everyone, so
   * refusing to open one turned every listed outline into a dead end. Every
   * owner-only call still falls through to the ownership checks, so no tutor can
   * edit or restructure material they do not author. The one deliberate widening is
   * `assign`: a tutor may set a discoverable course for their own student, which is
   * what lets them use a Tutorly outline without owning it.
   */
  private async scopedCourse(
    tx: AppTransaction,
    user: AuthenticatedUser,
    id: string,
    access: CourseAccess = 'read',
  ): Promise<CourseRecord> {
    this.requireRole(user);
    const course = await this.repository.lockCourse(tx, id);
    if (!course) throw new NotFoundException('Course not found');
    if (this.isAuthor(user) && course.tutorId === user.id) return course;
    if (access === 'assign' && this.isAuthor(user) && this.isDiscoverable(course)) return course;
    if (access === 'read' && course.provider === 'admin') return course;
    if (user.role !== 'student' || !(await this.repository.hasEnrollment(tx, id, user.id)))
      throw new NotFoundException('Course not found');
    if (access !== 'read')
      throw new ForbiddenException('Only the course tutor can perform this action');
    return course;
  }

  /**
   * Resolves a course for an action about one specific student. The author may
   * always act; any other tutor may act only on a discoverable course they set for
   * that exact student, so assigning a Tutorly outline is not a dead end. Everyone
   * else with read access gets the same `403` an enrolled student gets on any other
   * author-only path.
   */
  private async scopedStudentCourse(
    tx: AppTransaction,
    user: AuthenticatedUser,
    id: string,
    studentId: string,
  ): Promise<CourseRecord> {
    this.requireRole(user);
    const course = await this.repository.lockCourse(tx, id);
    if (!course) throw new NotFoundException('Course not found');
    if (this.isAuthor(user) && course.tutorId === user.id) return course;
    if (
      this.isAuthor(user) &&
      this.isDiscoverable(course) &&
      (await this.repository.hasEnrollmentBy(tx, id, studentId, user.id))
    )
      return course;
    if (user.role === 'student' && (await this.repository.hasEnrollment(tx, id, user.id)))
      throw new ForbiddenException('Only the course tutor can perform this action');
    throw new NotFoundException('Course not found');
  }

  /**
   * A tutor may name a course whatever they like — including a title another tutor
   * already uses — but not duplicate one of their own. Checked inside the writing
   * transaction so the answer names the conflict instead of leaking a constraint
   * error, and the index remains the backstop for a race.
   */
  private async requireUniqueTitle(
    tx: AppTransaction,
    tutorId: string,
    title: string,
    exceptId?: string,
  ): Promise<void> {
    if (await this.repository.findByTutorTitle(tx, tutorId, title, exceptId))
      throw new ConflictException(`You already have a course named "${title}"`);
  }

  /** A per-tutor title race still surfaces as the same `409` as the pre-check. */
  private async uniqueTitle<T>(title: string, work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (cause) {
      if (isUniqueViolation(cause))
        throw new ConflictException(`You already have a course named "${title}"`);
      throw cause;
    }
  }

  /**
   * Turns subject codes into ids, failing the whole request when a code does not
   * exist rather than silently storing a course with fewer subjects than asked.
   * `undefined` means "leave the links alone"; an empty array clears them.
   */
  private async resolveSubjects(
    tx: AppTransaction,
    codes?: string[],
  ): Promise<string[] | undefined> {
    if (codes === undefined) return undefined;
    const { ids, unknown } = await this.repository.subjectIds(tx, codes);
    if (unknown.length)
      throw new BadRequestException(`Unknown subject code(s): ${unknown.join(', ')}`);
    return ids;
  }

  private async requireTopic(tx: AppTransaction, id: string, topicId: string): Promise<void> {
    if (!(await this.repository.topics(tx, id)).some((topic) => topic.id === topicId))
      throw new NotFoundException('Topic not found');
  }

  private async requireEnrollment(
    tx: AppTransaction,
    id: string,
    studentId: string,
  ): Promise<void> {
    if (!(await this.repository.hasEnrollment(tx, id, studentId)))
      throw new NotFoundException('Enrollment not found');
  }

  list(user: AuthenticatedUser, query: CourseQueryDto) {
    this.requireRole(user);
    return this.repository.list(user, query);
  }

  library(user: AuthenticatedUser, query: CourseQueryDto) {
    this.requireRole(user);
    return this.repository.library(query);
  }

  eligibleStudents(user: AuthenticatedUser, query: CourseQueryDto) {
    this.requireRole(user, true);
    return this.repository.eligibleStudents(user, query);
  }

  /** The subject picker's options, readable by any course role that can author. */
  subjects(user: AuthenticatedUser, query: CourseQueryDto) {
    this.requireRole(user);
    return this.repository.subjects(query);
  }

  create(user: AuthenticatedUser, dto: CreateCourseDto) {
    this.requireRole(user, true);
    if ((dto.topics?.length ?? 0) > 100)
      throw new BadRequestException('A course can contain at most 100 topics');
    return this.repository.transaction(async (tx) => {
      // Derived from the actor, never from the request body: a tutor must not be
      // able to label their own material as Tutorly-provided.
      const provider: CourseProvider = user.role === 'admin' ? 'admin' : 'tutor';
      await this.requireUniqueTitle(tx, user.id, dto.title);
      const subjectIds = (await this.resolveSubjects(tx, dto.subjectCodes)) ?? [];
      const course = await this.uniqueTitle(dto.title, () =>
        this.repository.create(tx, user.id, dto, provider, subjectIds),
      );
      return this.repository.detail(tx, course, user);
    });
  }

  detail(user: AuthenticatedUser, id: string) {
    return this.repository.transaction(async (tx) =>
      this.repository.detail(tx, await this.scopedCourse(tx, user, id), user),
    );
  }

  update(user: AuthenticatedUser, id: string, dto: UpdateCourseDto) {
    return this.repository.transaction(async (tx) => {
      const course = await this.scopedCourse(tx, user, id, 'manage');
      if (
        dto.title === undefined &&
        dto.description === undefined &&
        dto.subjectCodes === undefined &&
        dto.published === undefined
      )
        throw new BadRequestException(
          'Provide a course title, description, subjects or visibility to update',
        );
      if (dto.title !== undefined) await this.requireUniqueTitle(tx, user.id, dto.title, id);
      const subjectIds = await this.resolveSubjects(tx, dto.subjectCodes);
      const updated = await this.uniqueTitle(dto.title ?? course.title, () =>
        this.repository.update(tx, id, dto, subjectIds),
      );
      return this.repository.detail(tx, updated, user);
    });
  }

  addTopic(user: AuthenticatedUser, id: string, dto: CreateCourseTopicDto) {
    return this.repository.transaction(async (tx) => {
      await this.scopedCourse(tx, user, id, 'manage');
      const topics = await this.repository.topics(tx, id);
      if (topics.length >= 100)
        throw new BadRequestException('A course can contain at most 100 topics');
      return this.repository.addTopic(tx, id, dto, topics.length);
    });
  }

  reorderTopics(user: AuthenticatedUser, id: string, dto: CourseOrderDto) {
    return this.repository.transaction(async (tx) => {
      await this.scopedCourse(tx, user, id, 'manage');
      const topics = await this.repository.topics(tx, id);
      const requested = new Set(dto.topicIds);
      if (
        dto.topicIds.length !== topics.length ||
        requested.size !== topics.length ||
        topics.some((topic) => !requested.has(topic.id))
      ) {
        throw new BadRequestException('Topic order must include every topic exactly once');
      }
      return this.repository.reorderTopics(tx, id, dto.topicIds);
    });
  }

  updateTopic(user: AuthenticatedUser, id: string, topicId: string, dto: UpdateCourseTopicDto) {
    return this.repository.transaction(async (tx) => {
      await this.scopedCourse(tx, user, id, 'manage');
      await this.requireTopic(tx, id, topicId);
      if (dto.title === undefined && dto.content === undefined)
        throw new BadRequestException('Provide a topic title or content');
      return this.repository.updateTopic(tx, id, topicId, dto);
    });
  }

  deleteTopic(user: AuthenticatedUser, id: string, topicId: string) {
    return this.repository.transaction(async (tx) => {
      await this.scopedCourse(tx, user, id, 'manage');
      await this.requireTopic(tx, id, topicId);
      await this.repository.deleteTopic(tx, id, topicId);
    });
  }

  students(user: AuthenticatedUser, id: string, query: CourseQueryDto) {
    return this.repository.transaction(async (tx) => {
      await this.scopedCourse(tx, user, id, 'manage');
      return this.repository.students(tx, id, query);
    });
  }

  /** Author-scoped roster: students grouped by the courses this actor set for them. */
  studentsOverview(user: AuthenticatedUser, query: CourseQueryDto) {
    this.requireRole(user, true);
    return this.repository.studentsOverview(user, query);
  }

  /**
   * Sets a course for a student. The student must be one of the caller's own (an
   * active match, an accepted session, or already on another course the caller set)
   * and the course must be theirs to assign: their own, or a discoverable one. The
   * enrollment records *who* set it, because a tutor may assign material they did
   * not author.
   */
  enroll(user: AuthenticatedUser, id: string, studentId: string) {
    return this.repository.transaction(async (tx) => {
      await this.scopedCourse(tx, user, id, 'assign');
      const existing = await this.repository.enrollment(tx, id, studentId);
      if (existing) return existing;
      if (!(await this.repository.eligibleStudent(tx, user.id, studentId)))
        throw new ForbiddenException('This student is not one of your active students');
      return this.repository.enroll(tx, id, studentId, user.id);
    });
  }

  studentProgress(user: AuthenticatedUser, id: string, studentId: string) {
    return this.repository.transaction(async (tx) => {
      const course = await this.scopedStudentCourse(tx, user, id, studentId);
      await this.requireEnrollment(tx, id, studentId);
      return this.repository.studentProgress(tx, course, studentId);
    });
  }

  complete(
    user: AuthenticatedUser,
    id: string,
    topicId: string,
    completed: boolean,
    studentId?: string,
  ) {
    return this.repository.transaction(async (tx) => {
      if (studentId === undefined) await this.scopedCourse(tx, user, id);
      else await this.scopedStudentCourse(tx, user, id, studentId);
      if (studentId === undefined && user.role !== 'student')
        throw new ForbiddenException('Only an enrolled student can update their own completion');
      const targetId = studentId ?? user.id;
      await this.requireTopic(tx, id, topicId);
      await this.requireEnrollment(tx, id, targetId);
      return this.repository.complete(tx, id, topicId, targetId, completed);
    });
  }
}
