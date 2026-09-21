import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { SessionRecurrence } from './dtos/session.dto';
import { SessionsRepository } from './sessions.repository';
import { SessionsService } from './sessions.service';
import type { SessionWithParticipants } from './sessions.types';

const studentId = '00000000-0000-4000-8000-000000000001';
const tutorId = '00000000-0000-4000-8000-000000000002';
const seriesId = '00000000-0000-4000-8001-0000000000ff';

/** `HH:MM` on the day `daysAhead` from today, as the client would send it. */
function future(daysAhead: number, hour: number): { startAt: string; endAt: string } {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + daysAhead);
  start.setUTCHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setUTCHours(hour + 1);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

function sessionRow(index: number): SessionWithParticipants {
  const window = future(index + 1, 9);
  return {
    id: `00000000-0000-4000-8002-${String(index + 1).padStart(12, '0')}`,
    studentId,
    tutorId,
    initiatorId: studentId,
    subject: 'Mathematics',
    startAt: new Date(window.startAt),
    endAt: new Date(window.endAt),
    status: 'pending',
    meetingUrl: null,
    notes: null,
    proposedStartAt: null,
    proposedEndAt: null,
    seriesId,
    seriesIndex: index + 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    tutorName: 'Ada Tutor',
    studentName: 'Sam Student',
  } as SessionWithParticipants;
}

const seriesRow = {
  id: seriesId,
  tutorId,
  studentId,
  createdById: studentId,
  subject: 'Mathematics',
  recurrence: 'daily' as const,
  weekdays: [],
  timeOfDay: '09:00',
  durationMinutes: 60,
  startsOn: '2026-09-21',
  endsOn: '2026-10-04',
  weeks: 2,
  notes: null,
  meetingUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findTutorSubjects: jest.fn().mockResolvedValue(['Mathematics', 'Physics']),
    findOverlappingSessions: jest.fn().mockResolvedValue([]),
    createSeries: jest
      .fn()
      .mockImplementation(() => ({ series: seriesRow, sessions: [sessionRow(0), sessionRow(1)] })),
    findSeriesSessions: jest.fn().mockResolvedValue([sessionRow(0), sessionRow(1)]),
    findSeriesById: jest.fn().mockResolvedValue(seriesRow),
    updateSeriesPendingStatus: jest.fn().mockResolvedValue(2),
    cancelSeriesSessions: jest.fn().mockResolvedValue(2),
    findById: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

async function buildService(repository: ReturnType<typeof createRepository>) {
  const notifications = {
    onSessionEvent: jest.fn().mockResolvedValue(undefined),
  };
  const moduleRef = await Test.createTestingModule({
    providers: [
      SessionsService,
      { provide: SessionsRepository, useValue: repository as unknown as SessionsRepository },
      { provide: NotificationsService, useValue: notifications },
    ],
  }).compile();
  return { service: moduleRef.get(SessionsService), notifications };
}

const dto = (overrides: Record<string, unknown> = {}) => ({
  tutorId,
  subject: 'Mathematics',
  recurrence: SessionRecurrence.DAILY,
  timeOfDay: '09:00',
  durationMinutes: 60,
  startsOn: '2026-09-21',
  endsOn: '2026-10-04',
  weeks: 2,
  occurrences: [future(1, 9), future(2, 9), future(3, 9)].map((window) => ({
    startAt: window.startAt,
    endAt: window.endAt,
  })),
  ...overrides,
});

describe('SessionsService.bookSeries', () => {
  it('materialises every occurrence in chronological order and notifies once', async () => {
    const repository = createRepository();
    const { service, notifications } = await buildService(repository);

    const result = await service.bookSeries(studentId, 'student', dto() as never);

    expect(repository.createSeries).toHaveBeenCalledTimes(1);
    const [, series, occurrences] = repository.createSeries.mock.calls[0] as [
      string,
      Record<string, unknown>,
      { startAt: Date; endAt: Date }[],
    ];
    expect(series).toMatchObject({
      tutorId,
      studentId,
      subject: 'Mathematics',
      recurrence: 'daily',
      weekdays: [],
      weeks: 2,
    });
    // Sorted before writing, so `series_index` reads as a schedule rather than a payload order.
    expect(occurrences.map((occurrence) => occurrence.startAt.getTime())).toEqual(
      [...occurrences].map((occurrence) => occurrence.startAt.getTime()).sort((a, b) => a - b),
    );
    expect(notifications.onSessionEvent).toHaveBeenCalledTimes(1);
    expect(notifications.onSessionEvent.mock.calls[0][0]).toBe('created');
    expect(result.sessions).toHaveLength(2);
  });

  it('keeps the weekdays for a weekly pattern and clears them for a daily one', async () => {
    const repository = createRepository();
    const { service } = await buildService(repository);

    await service.bookSeries(
      studentId,
      'student',
      dto({ recurrence: SessionRecurrence.WEEKLY, weekdays: [1, 3, 3] }) as never,
    );

    const [, series] = repository.createSeries.mock.calls[0] as [string, Record<string, unknown>];
    expect(series.weekdays).toEqual([1, 3]);
  });

  it('rejects a weekdays pattern with no day chosen', async () => {
    const { service } = await buildService(createRepository());

    await expect(
      service.bookSeries(
        studentId,
        'student',
        dto({ recurrence: SessionRecurrence.WEEKDAYS, weekdays: [] }) as never,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an occurrence in the past and a window that ends before it starts', async () => {
    const { service } = await buildService(createRepository());
    const past = { startAt: '2020-01-01T09:00:00.000Z', endAt: '2020-01-01T10:00:00.000Z' };

    await expect(
      service.bookSeries(studentId, 'student', dto({ occurrences: [past] }) as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('names the clash when the tutor is already booked inside the window', async () => {
    const clash = future(2, 9);
    const repository = createRepository({
      findOverlappingSessions: jest
        .fn()
        .mockResolvedValue([{ startAt: new Date(clash.startAt), endAt: new Date(clash.endAt) }]),
    });
    const { service } = await buildService(repository);

    await expect(service.bookSeries(studentId, 'student', dto() as never)).rejects.toThrow(
      /already has a session at/,
    );
    expect(repository.createSeries).not.toHaveBeenCalled();
  });

  it('caps a series at seven sessions per week of horizon', async () => {
    const { service } = await buildService(createRepository());
    const occurrences = Array.from({ length: 15 }, (_, index) => future(index + 1, 9)).map(
      (window) => ({ startAt: window.startAt, endAt: window.endAt }),
    );

    await expect(
      service.bookSeries(studentId, 'student', dto({ weeks: 2, occurrences }) as never),
    ).rejects.toThrow(/cannot hold 15 sessions/);
  });

  it('makes a tutor name the student they are requesting for', async () => {
    const { service } = await buildService(createRepository());

    await expect(service.bookSeries(tutorId, 'tutor', dto() as never)).rejects.toThrow(
      /must supply studentId/,
    );
  });

  it('refuses a subject the tutor does not teach', async () => {
    const { service } = await buildService(createRepository());

    await expect(
      service.bookSeries(studentId, 'student', dto({ subject: 'Chemistry' }) as never),
    ).rejects.toThrow(/does not teach/);
  });
});

describe('SessionsService.respondToSeries', () => {
  it('answers every pending occurrence at once', async () => {
    const repository = createRepository();
    const { service, notifications } = await buildService(repository);

    const result = await service.respondToSeries(seriesId, tutorId, true);

    expect(repository.updateSeriesPendingStatus).toHaveBeenCalledWith(seriesId, 'upcoming');
    expect(notifications.onSessionEvent.mock.calls[0][0]).toBe('accepted');
    expect(result.series.id).toBe(seriesId);
  });

  it('declines the block for a no, and stops an empty series', async () => {
    const repository = createRepository({ updateSeriesPendingStatus: jest.fn().mockResolvedValue(0) });
    const { service } = await buildService(repository);

    await expect(service.respondToSeries(seriesId, tutorId, false)).rejects.toThrow(
      /no pending sessions left/,
    );
  });

  it('does not let the requester answer their own series', async () => {
    const { service } = await buildService(createRepository());

    await expect(service.respondToSeries(seriesId, studentId, true)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('hides a series from anyone who is not a participant', async () => {
    const { service } = await buildService(createRepository());

    await expect(
      service.respondToSeries(seriesId, '00000000-0000-4000-8000-000000000009', true),
    ).rejects.toThrow(/not found/);
  });
});
