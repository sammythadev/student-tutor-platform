import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import type { Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthenticatedUser } from '@common/auth';
import type { AppTransaction, CourseRecord, CourseTopicRecord } from '@database';
import { CoursesRepository } from './courses.repository';
import { CoursesService } from './courses.service';
import {
  CourseCompletionDto,
  CourseEnrollmentDto,
  CourseOrderDto,
  CourseParamDto,
  CourseQueryDto,
  CourseStudentParamDto,
  CourseStudentTopicParamDto,
  CourseTopicParamDto,
  CreateCourseDto,
  CreateCourseTopicDto,
  UpdateCourseDto,
  UpdateCourseTopicDto,
} from './dtos/course.dto';
import {
  courseProgress,
  rollupProgress,
  type CourseDetail,
  type CourseEnrollment,
  type CourseStudentOverview,
} from './courses.types';

const ids = Array.from(
  { length: 8 },
  (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
);
const tutor: AuthenticatedUser = { id: ids[0], role: 'tutor', email: 'tutor@example.invalid' };
const otherTutor: AuthenticatedUser = { id: ids[1], role: 'tutor', email: 'other@example.invalid' };
const student: AuthenticatedUser = {
  id: ids[2],
  role: 'student',
  email: 'student@example.invalid',
};
const peer: AuthenticatedUser = { id: ids[3], role: 'student', email: 'peer@example.invalid' };
const admin: AuthenticatedUser = { id: ids[6], role: 'admin', email: 'admin@example.invalid' };
const courseId = ids[4];
const topicId = ids[5];
const now = new Date('2026-01-01T00:00:00.000Z');
const course: CourseRecord = {
  id: courseId,
  tutorId: tutor.id,
  provider: 'tutor',
  title: 'Algebra',
  description: null,
  published: false,
  createdAt: now,
  updatedAt: now,
};
const topic: CourseTopicRecord = {
  id: topicId,
  courseId,
  title: 'Linear equations',
  content: null,
  position: 0,
  createdAt: now,
  updatedAt: now,
};
const wireTopic = { ...topic, createdAt: now.toISOString(), updatedAt: now.toISOString() };
const courseDetail: CourseDetail = {
  ...course,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  tutorName: 'Tutor',
  totalTopics: 1,
  studentCount: 0,
  progress: null,
  subjects: [],
  subjectCodes: [],
  assignedById: null,
  assignedByName: null,
  topics: [{ ...wireTopic, completed: false, completedAt: null }],
};
const enrollment: CourseEnrollment = {
  courseId,
  studentId: student.id,
  firstName: 'Student',
  lastName: 'Fixture',
  avatarUrl: null,
  assignedAt: now.toISOString(),
  progress: { completedTopics: 0, totalTopics: 1, percentage: 0, status: 'not_started' },
};
const overview: CourseStudentOverview = {
  student: { studentId: student.id, firstName: 'Student', lastName: 'Fixture', avatarUrl: null },
  courses: [
    {
      courseId,
      title: 'Algebra',
      provider: 'tutor',
      assignedAt: now.toISOString(),
      totalTopics: 1,
      completedTopics: 0,
      progress: enrollment.progress,
      lastCompletedAt: null,
    },
  ],
  courseCount: 1,
  relationship: 'assigned',
  progress: enrollment.progress,
  lastCompletedAt: null,
};
const query = new CourseQueryDto();

function repositoryMock<K extends keyof CoursesRepository>() {
  return jest.fn<ReturnType<CoursesRepository[K]>, Parameters<CoursesRepository[K]>>();
}

function makeRepository() {
  // Opaque identity only: service must pass this handle to repository operations, never execute SQL.
  const tx = Object.freeze({}) as AppTransaction;
  const repository = {
    transaction: async <T>(work: (transaction: AppTransaction) => Promise<T>): Promise<T> =>
      work(tx),
    lockCourse: repositoryMock<'lockCourse'>().mockResolvedValue(course),
    hasEnrollment: repositoryMock<'hasEnrollment'>().mockResolvedValue(true),
    list: repositoryMock<'list'>().mockResolvedValue({ page: 1, limit: 12, total: 0, data: [] }),
    library: repositoryMock<'library'>().mockResolvedValue({
      page: 1,
      limit: 12,
      total: 0,
      data: [],
    }),
    eligibleStudents: repositoryMock<'eligibleStudents'>().mockResolvedValue({
      page: 1,
      limit: 12,
      total: 0,
      data: [],
    }),
    subjects: repositoryMock<'subjects'>().mockResolvedValue([]),
    subjectIds: repositoryMock<'subjectIds'>().mockResolvedValue({ ids: [], unknown: [] }),
    setSubjects: repositoryMock<'setSubjects'>().mockResolvedValue(undefined),
    findByTutorTitle: repositoryMock<'findByTutorTitle'>().mockResolvedValue(undefined),
    hasEnrollmentBy: repositoryMock<'hasEnrollmentBy'>().mockResolvedValue(true),
    create: repositoryMock<'create'>().mockResolvedValue(course),
    detail: repositoryMock<'detail'>().mockResolvedValue(courseDetail),
    update: repositoryMock<'update'>().mockResolvedValue(course),
    topics: repositoryMock<'topics'>().mockResolvedValue([topic]),
    addTopic: repositoryMock<'addTopic'>().mockResolvedValue(wireTopic),
    reorderTopics: repositoryMock<'reorderTopics'>().mockResolvedValue([wireTopic]),
    updateTopic: repositoryMock<'updateTopic'>().mockResolvedValue(wireTopic),
    deleteTopic: repositoryMock<'deleteTopic'>().mockResolvedValue(undefined),
    students: repositoryMock<'students'>().mockResolvedValue({
      page: 1,
      limit: 12,
      total: 1,
      data: [enrollment],
    }),
    studentsOverview: repositoryMock<'studentsOverview'>().mockResolvedValue({
      page: 1,
      limit: 12,
      total: 1,
      data: [overview],
    }),
    enrollment: repositoryMock<'enrollment'>().mockResolvedValue(undefined),
    eligibleStudent: repositoryMock<'eligibleStudent'>().mockResolvedValue(true),
    enroll: repositoryMock<'enroll'>().mockResolvedValue(enrollment),
    studentProgress: repositoryMock<'studentProgress'>().mockResolvedValue({
      courseId,
      student: enrollment,
      progress: enrollment.progress,
      topics: courseDetail.topics,
    }),
    complete: repositoryMock<'complete'>().mockResolvedValue({
      courseId,
      topicId,
      studentId: student.id,
      completed: true,
      completedAt: now.toISOString(),
      progress: { completedTopics: 1, totalTopics: 1, percentage: 100, status: 'completed' },
    }),
  } satisfies Pick<CoursesRepository, keyof CoursesRepository>;
  return { repository, tx };
}

describe('CoursesService authorization and locked mutations', () => {
  let service: CoursesService;
  let fixture: ReturnType<typeof makeRepository>;
  let repository: ReturnType<typeof makeRepository>['repository'];

  beforeEach(async () => {
    fixture = makeRepository();
    repository = fixture.repository;
    const module = await Test.createTestingModule({
      providers: [CoursesService, { provide: CoursesRepository, useValue: repository }],
    }).compile();
    service = module.get(CoursesService);
  });

  it('rejects unassigned accounts before exposing course data or writes', async () => {
    const user: AuthenticatedUser = { ...student, role: 'unassigned' };
    await expect(Promise.resolve().then(() => service.list(user, query))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      Promise.resolve().then(() => service.create(user, { title: 'No' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.detail(user, courseId)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(Promise.resolve().then(() => service.library(user, query))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.list).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.detail).not.toHaveBeenCalled();
    expect(repository.library).not.toHaveBeenCalled();
  });

  it('labels admin-authored courses as Tutorly-provided and serves the library to any course role', async () => {
    const dto = { title: 'Tutorly Physics', topics: [{ title: 'Waves' }] };
    await service.create(admin, dto);
    expect(repository.create).toHaveBeenCalledWith(fixture.tx, admin.id, dto, 'admin', []);

    await expect(service.library(student, query)).resolves.toEqual({
      page: 1,
      limit: 12,
      total: 0,
      data: [],
    });
    expect(repository.library).toHaveBeenCalledWith(query);
  });

  it('scopes list queries by the authenticated identity and returns a real empty result', async () => {
    expect(await service.list(student, query)).toEqual({ page: 1, limit: 12, total: 0, data: [] });
    expect(repository.list).toHaveBeenCalledWith(student, query);
    await expect(
      Promise.resolve().then(() => service.eligibleStudents(student, query)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await service.eligibleStudents(tutor, query);
    expect(repository.eligibleStudents).toHaveBeenCalledWith(tutor, query);
  });

  it('creates metadata and its initial outline through one transaction using the authenticated owner', async () => {
    const dto = { title: 'Algebra', topics: [{ title: 'First' }, { title: 'Second' }] };
    expect(await service.create(tutor, dto)).toEqual(courseDetail);
    expect(repository.create).toHaveBeenCalledWith(fixture.tx, tutor.id, dto, 'tutor', []);
    expect(repository.detail).toHaveBeenCalledWith(fixture.tx, course, tutor);
    await expect(Promise.resolve().then(() => service.create(student, dto))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('denies inaccessible courses without disclosing nested topics or enrollment existence', async () => {
    await expect(
      service.updateTopic(otherTutor, courseId, ids[7], { title: 'No' }),
    ).rejects.toThrow(new NotFoundException('Course not found'));
    repository.hasEnrollment.mockResolvedValue(false);
    await expect(service.detail(student, courseId)).rejects.toThrow(
      new NotFoundException('Course not found'),
    );
    await expect(service.complete(student, courseId, ids[7], true)).rejects.toThrow(
      new NotFoundException('Course not found'),
    );
    expect(repository.topics).not.toHaveBeenCalled();
    expect(repository.updateTopic).not.toHaveBeenCalled();
    expect(repository.complete).not.toHaveBeenCalled();
    repository.lockCourse.mockResolvedValue(undefined);
    await expect(service.detail(tutor, courseId)).rejects.toThrow(
      new NotFoundException('Course not found'),
    );
  });

  it('exposes the per-student rollup to authors only, scoped to the caller', async () => {
    await expect(
      Promise.resolve().then(() => service.studentsOverview(student, query)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.studentsOverview).not.toHaveBeenCalled();
    await expect(service.studentsOverview(tutor, query)).resolves.toEqual({
      page: 1,
      limit: 12,
      total: 1,
      data: [overview],
    });
    expect(repository.studentsOverview).toHaveBeenCalledWith(tutor, query);
  });

  it('opens a Tutorly-provided outline for any course role without an enrollment, but keeps every owner-only path shut', async () => {
    // /courses/library lists platform outlines to every course role, so opening one
    // must not depend on an enrollment no student can create for themselves.
    const platform: CourseRecord = { ...course, tutorId: admin.id, provider: 'admin' };
    repository.lockCourse.mockResolvedValue(platform);
    repository.detail.mockResolvedValue({ ...courseDetail, tutorId: admin.id, provider: 'admin' });
    repository.hasEnrollment.mockResolvedValue(false);

    await expect(service.detail(student, courseId)).resolves.toMatchObject({ provider: 'admin' });
    await expect(service.detail(tutor, courseId)).resolves.toMatchObject({ provider: 'admin' });

    for (const operation of [
      () => service.update(tutor, courseId, { title: 'Hijack' }),
      () => service.addTopic(tutor, courseId, { title: 'Hijack' }),
      () => service.students(tutor, courseId, query),
    ]) {
      await expect(operation()).rejects.toBeInstanceOf(NotFoundException);
    }

    // Assigning is the one deliberate widening: a tutor may set a discoverable
    // course for their own student, but never restructure or roster it.
    await expect(service.enroll(tutor, courseId, peer.id)).resolves.toBe(enrollment);
    expect(repository.enroll).toHaveBeenCalledWith(fixture.tx, courseId, peer.id, tutor.id);

    // An enrolled student on a platform course is still refused owner-only writes.
    repository.hasEnrollment.mockResolvedValue(true);
    await expect(service.update(student, courseId, { title: 'Hijack' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    // A tutor-authored course that is not mine stays hidden whether or not I am enrolled,
    // and stays unassignable while it is private.
    repository.lockCourse.mockResolvedValue(course);
    repository.hasEnrollment.mockResolvedValue(false);
    await expect(service.detail(student, courseId)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.detail(otherTutor, courseId)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.enroll(otherTutor, courseId, peer.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    // Once published by its author it becomes assignable, without becoming editable.
    repository.lockCourse.mockResolvedValue({ ...course, published: true });
    await expect(service.enroll(otherTutor, courseId, peer.id)).resolves.toBe(enrollment);
    await expect(service.update(otherTutor, courseId, { title: 'Hijack' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('allows enrolled readers without renewed eligibility and uses only their own identity', async () => {
    await service.detail(student, courseId);
    expect(repository.detail).toHaveBeenCalledWith(fixture.tx, course, student);
    expect(repository.eligibleStudent).not.toHaveBeenCalled();
  });

  it('rejects all owner-only operations by an enrolled student', async () => {
    const operations = [
      () => service.update(student, courseId, { title: 'No' }),
      () => service.addTopic(student, courseId, { title: 'No' }),
      () => service.reorderTopics(student, courseId, { topicIds: [topicId] }),
      () => service.updateTopic(student, courseId, topicId, { title: 'No' }),
      () => service.deleteTopic(student, courseId, topicId),
      () => service.students(student, courseId, query),
      () => service.enroll(student, courseId, peer.id),
      () => service.studentProgress(student, courseId, peer.id),
      () => service.complete(student, courseId, topicId, true, peer.id),
    ];
    for (const operation of operations) {
      await expect(operation()).rejects.toThrow(
        new ForbiddenException('Only the course tutor can perform this action'),
      );
    }
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.addTopic).not.toHaveBeenCalled();
    expect(repository.reorderTopics).not.toHaveBeenCalled();
    expect(repository.updateTopic).not.toHaveBeenCalled();
    expect(repository.deleteTopic).not.toHaveBeenCalled();
    expect(repository.students).not.toHaveBeenCalled();
    expect(repository.enroll).not.toHaveBeenCalled();
    expect(repository.studentProgress).not.toHaveBeenCalled();
    expect(repository.complete).not.toHaveBeenCalled();
  });

  it('returns an existing enrollment unchanged without rechecking ended eligibility', async () => {
    repository.enrollment.mockResolvedValue(enrollment);
    repository.eligibleStudent.mockResolvedValue(false);
    expect(await service.enroll(tutor, courseId, student.id)).toBe(enrollment);
    expect(repository.eligibleStudent).not.toHaveBeenCalled();
    expect(repository.enroll).not.toHaveBeenCalled();
  });

  it('requires current eligibility for a new enrollment and uses the same locked transaction', async () => {
    repository.eligibleStudent.mockResolvedValue(false);
    await expect(service.enroll(tutor, courseId, student.id)).rejects.toThrow(
      new ForbiddenException('This student is not one of your active students'),
    );
    expect(repository.enroll).not.toHaveBeenCalled();
    repository.eligibleStudent.mockResolvedValue(true);
    expect(await service.enroll(tutor, courseId, student.id)).toBe(enrollment);
    expect(repository.eligibleStudent).toHaveBeenLastCalledWith(fixture.tx, tutor.id, student.id);
    // The enrollment records who set the course, which is not always the author.
    expect(repository.enroll).toHaveBeenCalledWith(fixture.tx, courseId, student.id, tutor.id);
    expect(repository.lockCourse.mock.invocationCallOrder[0]).toBeLessThan(
      repository.enrollment.mock.invocationCallOrder[0],
    );
  });

  it.each([true, false])(
    'routes student and tutor completion (%s) to the exact target without eligibility renewal',
    async (completed) => {
      await service.complete(student, courseId, topicId, completed);
      expect(repository.complete).toHaveBeenLastCalledWith(
        fixture.tx,
        courseId,
        topicId,
        student.id,
        completed,
      );
      await service.complete(tutor, courseId, topicId, completed, peer.id);
      expect(repository.complete).toHaveBeenLastCalledWith(
        fixture.tx,
        courseId,
        topicId,
        peer.id,
        completed,
      );
      expect(repository.lockCourse.mock.invocationCallOrder[0]).toBeLessThan(
        repository.topics.mock.invocationCallOrder[0],
      );
      expect(repository.eligibleStudent).not.toHaveBeenCalled();
    },
  );

  it('returns authoritative idempotent completion output without rewriting timestamps or progress', async () => {
    const first = await service.complete(student, courseId, topicId, true);
    expect(await service.complete(student, courseId, topicId, true)).toEqual(first);
    expect(first).toMatchObject({
      completedAt: now.toISOString(),
      progress: { percentage: 100, status: 'completed' },
    });
    await expect(service.complete(tutor, courseId, topicId, true)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects missing target enrollments and wrong-course topics before completion writes', async () => {
    repository.hasEnrollment.mockResolvedValue(false);
    await expect(service.studentProgress(tutor, courseId, peer.id)).rejects.toThrow(
      new NotFoundException('Enrollment not found'),
    );
    await expect(service.complete(tutor, courseId, topicId, true, peer.id)).rejects.toThrow(
      new NotFoundException('Enrollment not found'),
    );
    repository.hasEnrollment.mockResolvedValue(true);
    for (const operation of [
      () => service.complete(tutor, courseId, ids[7], true, student.id),
      () => service.updateTopic(tutor, courseId, ids[7], { title: 'No' }),
      () => service.deleteTopic(tutor, courseId, ids[7]),
    ])
      await expect(operation()).rejects.toThrow(new NotFoundException('Topic not found'));
    expect(repository.complete).not.toHaveBeenCalled();
    expect(repository.updateTopic).not.toHaveBeenCalled();
    expect(repository.deleteTopic).not.toHaveBeenCalled();
  });

  it('caps both initial and appended topics at 100 and appends under the course lock', async () => {
    const dto = { title: 'Next' };
    await service.addTopic(tutor, courseId, dto);
    expect(repository.addTopic).toHaveBeenCalledWith(fixture.tx, courseId, dto, 1);
    expect(repository.lockCourse.mock.invocationCallOrder[0]).toBeLessThan(
      repository.topics.mock.invocationCallOrder[0],
    );
    repository.addTopic.mockClear();
    repository.topics.mockResolvedValue(
      Array.from({ length: 100 }, (_, position) => ({ ...topic, position })),
    );
    await expect(service.addTopic(tutor, courseId, dto)).rejects.toThrow(
      new BadRequestException('A course can contain at most 100 topics'),
    );
    expect(repository.addTopic).not.toHaveBeenCalled();
    await expect(
      Promise.resolve().then(() =>
        service.create(tutor, {
          title: 'Too many',
          topics: Array.from({ length: 101 }, () => dto),
        }),
      ),
    ).rejects.toThrow(new BadRequestException('A course can contain at most 100 topics'));
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('accepts only an exact topic permutation, including an empty outline', async () => {
    repository.topics.mockResolvedValue([topic, { ...topic, id: ids[6], position: 1 }]);
    for (const topicIds of [[topicId], [topicId, topicId], [topicId, ids[7]], []]) {
      await expect(service.reorderTopics(tutor, courseId, { topicIds })).rejects.toThrow(
        new BadRequestException('Topic order must include every topic exactly once'),
      );
    }
    expect(repository.reorderTopics).not.toHaveBeenCalled();
    await service.reorderTopics(tutor, courseId, { topicIds: [ids[6], topicId] });
    expect(repository.reorderTopics).toHaveBeenCalledWith(fixture.tx, courseId, [ids[6], topicId]);
    repository.topics.mockResolvedValue([]);
    repository.reorderTopics.mockResolvedValue([]);
    expect(await service.reorderTopics(tutor, courseId, { topicIds: [] })).toEqual([]);
  });

  it('rejects empty patches while preserving omission and explicit null in accepted changes', async () => {
    await expect(service.update(tutor, courseId, {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateTopic(tutor, courseId, topicId, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.updateTopic).not.toHaveBeenCalled();
    await service.update(tutor, courseId, { description: null });
    expect(repository.update).toHaveBeenCalledWith(
      fixture.tx,
      courseId,
      { description: null },
      undefined,
    );
    await service.updateTopic(tutor, courseId, topicId, { content: null });
    expect(repository.updateTopic).toHaveBeenCalledWith(fixture.tx, courseId, topicId, {
      content: null,
    });
  });
});

describe('Course authoring: per-tutor titles, subjects and visibility', () => {
  let service: CoursesService;
  let fixture: ReturnType<typeof makeRepository>;
  let repository: ReturnType<typeof makeRepository>['repository'];

  beforeEach(async () => {
    fixture = makeRepository();
    repository = fixture.repository;
    const module = await Test.createTestingModule({
      providers: [CoursesService, { provide: CoursesRepository, useValue: repository }],
    }).compile();
    service = module.get(CoursesService);
  });

  it('rejects a duplicate of the same tutor title but allows another tutor the same name', async () => {
    repository.findByTutorTitle.mockResolvedValue(course);
    await expect(service.create(tutor, { title: 'Algebra' })).rejects.toThrow(
      new ConflictException('You already have a course named "Algebra"'),
    );
    expect(repository.create).not.toHaveBeenCalled();

    // Titles are unique per tutor, so a second tutor may own their own "Algebra".
    repository.findByTutorTitle.mockResolvedValue(undefined);
    await service.create(otherTutor, { title: 'Algebra' });
    expect(repository.findByTutorTitle).toHaveBeenCalledWith(
      fixture.tx,
      otherTutor.id,
      'Algebra',
      undefined,
    );
    expect(repository.create).toHaveBeenCalledWith(
      fixture.tx,
      otherTutor.id,
      { title: 'Algebra' },
      'tutor',
      [],
    );
  });

  it('excludes the edited course from its own title check and still refuses a rename onto another', async () => {
    await service.update(tutor, courseId, { title: 'Trigonometry' });
    expect(repository.findByTutorTitle).toHaveBeenCalledWith(
      fixture.tx,
      tutor.id,
      'Trigonometry',
      courseId,
    );
    repository.findByTutorTitle.mockResolvedValue({ ...course, id: ids[7] });
    await expect(service.update(tutor, courseId, { title: 'Trigonometry' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.update).toHaveBeenCalledTimes(1);
  });

  it('turns a racing unique-violation into the same 409 as the pre-check', async () => {
    repository.findByTutorTitle.mockResolvedValue(undefined);
    repository.create.mockRejectedValue(
      Object.assign(new Error('duplicate key'), { code: '23505' }),
    );
    await expect(service.create(tutor, { title: 'Algebra' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    repository.create.mockRejectedValue(
      Object.assign(new Error('connection lost'), { code: '08006' }),
    );
    await expect(service.create(tutor, { title: 'Algebra' })).rejects.not.toBeInstanceOf(
      ConflictException,
    );
  });

  it('links platform subjects on create and on patch, and rejects an unknown code', async () => {
    repository.subjectIds.mockResolvedValue({ ids: [ids[7]], unknown: [] });
    await service.create(tutor, { title: 'Chemistry', subjectCodes: ['chemistry'] });
    expect(repository.subjectIds).toHaveBeenCalledWith(fixture.tx, ['chemistry']);
    expect(repository.create).toHaveBeenCalledWith(
      fixture.tx,
      tutor.id,
      { title: 'Chemistry', subjectCodes: ['chemistry'] },
      'tutor',
      [ids[7]],
    );

    repository.subjectIds.mockResolvedValue({ ids: [], unknown: [] });
    await service.update(tutor, courseId, { subjectCodes: [] });
    expect(repository.update).toHaveBeenCalledWith(fixture.tx, courseId, { subjectCodes: [] }, []);
    // Omission leaves the links untouched rather than clearing them.
    await service.update(tutor, courseId, { published: true });
    expect(repository.update).toHaveBeenCalledWith(
      fixture.tx,
      courseId,
      { published: true },
      undefined,
    );

    repository.subjectIds.mockResolvedValue({ ids: [], unknown: ['astrology'] });
    await expect(
      service.create(tutor, { title: 'Astrology', subjectCodes: ['astrology'] }),
    ).rejects.toThrow(new BadRequestException('Unknown subject code(s): astrology'));
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('serves the subject picker to course roles and hides it from unassigned accounts', async () => {
    const options = [{ code: 'chemistry', name: 'Chemistry', category: 'secondary' }];
    repository.subjects.mockResolvedValue(options);
    await expect(service.subjects(tutor, query)).resolves.toEqual(options);
    expect(repository.subjects).toHaveBeenCalledWith(query);
    const unassigned: AuthenticatedUser = { ...student, role: 'unassigned' };
    await expect(
      Promise.resolve().then(() => service.subjects(unassigned, query)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.subjects).toHaveBeenCalledTimes(1);
  });
});

describe('Course progress arithmetic', () => {
  it.each([
    [0, 0, 0, 'not_started'],
    [0, 3, 0, 'not_started'],
    [1, 3, 33, 'in_progress'],
    [2, 3, 66, 'in_progress'],
    [3, 3, 100, 'completed'],
    [3, 4, 75, 'in_progress'],
  ] as const)(
    'derives %i of %i as %i percent (%s)',
    (completedTopics, totalTopics, percentage, status) => {
      expect(courseProgress(completedTopics, totalTopics)).toEqual({
        completedTopics,
        totalTopics,
        percentage,
        status,
      });
    },
  );
});

describe('Course progress rollup', () => {
  const part = (completedTopics: number, totalTopics: number) =>
    courseProgress(completedTopics, totalTopics);

  it('weights topics, not courses, when rolling several outlines into one figure', () => {
    expect(rollupProgress([part(1, 1), part(0, 20)])).toEqual({
      completedTopics: 1,
      totalTopics: 21,
      percentage: 4,
      status: 'in_progress',
    });
    expect(rollupProgress([part(0, 3), part(0, 0)])).toEqual({
      completedTopics: 0,
      totalTopics: 3,
      percentage: 0,
      status: 'not_started',
    });
  });

  it('is inert for a student with no rollup rows and complete when every course is done', () => {
    expect(rollupProgress([])).toEqual({
      completedTopics: 0,
      totalTopics: 0,
      percentage: 0,
      status: 'not_started',
    });
    expect(rollupProgress([part(2, 2), part(5, 5)])).toEqual({
      completedTopics: 7,
      totalTopics: 7,
      percentage: 100,
      status: 'completed',
    });
  });
});

describe('Course DTOs through the production ValidationPipe', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });
  async function parse<T extends object>(metatype: Type<T>, value: unknown): Promise<T> {
    return pipe.transform(value, {
      type: metatype === CourseQueryDto ? 'query' : 'body',
      metatype,
    }) as Promise<T>;
  }

  it('normalizes titles and optional text, transforms nested topics and strips caller ownership', async () => {
    const dto = await parse(CreateCourseDto, {
      title: '  Algebra  ',
      description: '  ',
      tutorId: otherTutor.id,
      subjectCodes: ['  CHEMISTRY  '],
      topics: [
        { title: '  Linear  ', content: '  Text  ', id: topicId },
        { title: 'Blank', content: '\n' },
      ],
    });
    expect(dto).toMatchObject({
      title: 'Algebra',
      description: null,
      subjectCodes: ['chemistry'],
      topics: [
        { title: 'Linear', content: 'Text' },
        { title: 'Blank', content: null },
      ],
    });
    expect(dto).not.toHaveProperty('tutorId');
    expect(dto.topics?.[0]).toBeInstanceOf(CreateCourseTopicDto);
    expect(dto.topics?.[0]).not.toHaveProperty('id');
    expect(await parse(UpdateCourseDto, { description: null })).toEqual({ description: null });
    expect(await parse(UpdateCourseTopicDto, { content: ' ' })).toEqual({ content: null });
  });

  it('accepts the documented field and outline limits exactly', async () => {
    await expect(
      parse(CreateCourseDto, {
        title: 'x'.repeat(120),
        description: 'x'.repeat(2000),
        topics: Array.from({ length: 100 }, () => ({
          title: 'x'.repeat(160),
          content: 'x'.repeat(20000),
        })),
      }),
    ).resolves.toBeInstanceOf(CreateCourseDto);
    await expect(parse(CreateCourseDto, { title: 'Empty', topics: [] })).resolves.toBeInstanceOf(
      CreateCourseDto,
    );
    await expect(parse(CreateCourseDto, { title: 'Omitted' })).resolves.toBeInstanceOf(
      CreateCourseDto,
    );
  });

  it.each([
    {},
    { title: null },
    { title: '  ' },
    { title: 42 },
    { title: 'x'.repeat(121) },
    { title: 'Valid', description: 'x'.repeat(2001) },
    { title: 'Valid', topics: null },
    { title: 'Valid', topics: [{ title: '  ' }] },
    { title: 'Valid', topics: [{ title: 'x'.repeat(161) }] },
    { title: 'Valid', topics: [{ title: 'Valid', content: 'x'.repeat(20001) }] },
    { title: 'Valid', topics: [[]] },
    { title: 'Valid', topics: [[{ title: 'Nested' }]] },
    { title: 'Valid', topics: Array.from({ length: 101 }, () => ({ title: 'Valid' })) },
    { title: 'Valid', subjectCodes: ['chemistry', 'chemistry'] },
    { title: 'Valid', subjectCodes: Array.from({ length: 9 }, (_, index) => `subject-${index}`) },
    { title: 'Valid', subjectCodes: [''] },
    { title: 'Valid', subjectCodes: [42] },
    { title: 'Valid', published: 'yes' },
  ])('rejects invalid create input %#', async (value) => {
    await expect(parse(CreateCourseDto, value)).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([UpdateCourseDto, UpdateCourseTopicDto])(
    'rejects null or blank PATCH titles for %p',
    async (metatype) => {
      for (const title of [null, '', '  ', 3]) {
        await expect(parse(metatype, { title })).rejects.toBeInstanceOf(BadRequestException);
      }
    },
  );

  it.each(['false', 'true', 0, 1, null, undefined, {}, []].map((completed) => [completed]))(
    'rejects nonboolean completed (%p)',
    async (completed) => {
      await expect(parse(CourseCompletionDto, { completed })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );

  it.each([true, false])('retains boolean completed %s', async (completed) => {
    expect(await parse(CourseCompletionDto, { completed })).toEqual({ completed });
  });

  it('requires unique UUID order IDs and accepts the empty order', async () => {
    expect(await parse(CourseOrderDto, { topicIds: [] })).toEqual({ topicIds: [] });
    expect(await parse(CourseOrderDto, { topicIds: [topicId, ids[6]] })).toEqual({
      topicIds: [topicId, ids[6]],
    });
    for (const topicIds of [
      [topicId, topicId],
      ['bad'],
      null,
      'bad',
      Array.from({ length: 101 }, () => topicId),
    ]) {
      await expect(parse(CourseOrderDto, { topicIds })).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('validates every route and enrollment UUID rather than trusting raw strings', async () => {
    const cases: Array<[Type<object>, Record<string, string>]> = [
      [CourseParamDto, { id: courseId }],
      [CourseTopicParamDto, { id: courseId, topicId }],
      [CourseStudentParamDto, { id: courseId, studentId: student.id }],
      [CourseStudentTopicParamDto, { id: courseId, topicId, studentId: student.id }],
      [CourseEnrollmentDto, { studentId: student.id }],
    ];
    for (const [metatype, value] of cases) {
      await expect(parse(metatype, value)).resolves.toEqual(value);
      for (const key of Object.keys(value)) {
        await expect(parse(metatype, { ...value, [key]: 'not-a-uuid' })).rejects.toBeInstanceOf(
          BadRequestException,
        );
      }
    }
  });

  it('normalizes UUID case for routes, enrollment bodies and reorder arrays', async () => {
    const lower = 'abcdefab-cdef-4abc-8def-abcdefabcdef';
    const upper = lower.toUpperCase();
    expect(
      await parse(CourseStudentTopicParamDto, { id: upper, topicId: upper, studentId: upper }),
    ).toEqual({ id: lower, topicId: lower, studentId: lower });
    expect(await parse(CourseEnrollmentDto, { studentId: upper })).toEqual({ studentId: lower });
    expect(await parse(CourseOrderDto, { topicIds: [upper] })).toEqual({ topicIds: [lower] });
    await expect(parse(CourseOrderDto, { topicIds: [upper, lower] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('uses course-specific page defaults, numeric transforms, trimmed bounded query and upper limit', async () => {
    expect(await parse(CourseQueryDto, {})).toMatchObject({ page: 1, limit: 12 });
    expect(await parse(CourseQueryDto, { page: '2', limit: '50', q: '  Algebra  ' })).toEqual({
      page: 2,
      limit: 50,
      q: 'Algebra',
    });
    await expect(parse(CourseQueryDto, { q: 'x'.repeat(100) })).resolves.toBeInstanceOf(
      CourseQueryDto,
    );
    for (const value of [
      { page: 0 },
      { page: -1 },
      { page: 'abc' },
      { page: 1.2 },
      { limit: 0 },
      { limit: 51 },
      { limit: 2.5 },
      { q: 'x'.repeat(101) },
    ]) {
      await expect(parse(CourseQueryDto, value)).rejects.toBeInstanceOf(BadRequestException);
    }
  });
});
