import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from '@database/schema';
import { SessionsRepository } from './sessions.repository';

const studentId = '00000000-0000-4000-8000-000000000001';
const tutorId = '00000000-0000-4000-8000-000000000002';
const createdAt = '2026-09-17T08:00:00.000Z';

// Real Drizzle SQL generation and result decoding; no database connection.
describe('SessionsRepository participant list contract', () => {
  const query = jest.fn();
  const db = drizzle({ query } as unknown as Pool, { schema });
  const repository = new SessionsRepository(db);

  function fixture(
    index: number,
    participants = true,
    verified: number | null = 1,
    series?: { id: string; index: number },
  ) {
    const id = `00000000-0000-4000-8001-${String(index + 1).padStart(12, '0')}`;
    const startAt = new Date(Date.UTC(2026, 8, 20, 12, -index)).toISOString();
    const endAt = new Date(Date.UTC(2026, 8, 20, 13, -index)).toISOString();
    const session = {
      id,
      studentId,
      tutorId,
      initiatorId: studentId,
      subject: 'Algebra',
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      status: 'pending',
      meetingUrl: null,
      notes: 'Bring notes',
      proposedStartAt: null,
      proposedEndAt: null,
      seriesId: series?.id ?? null,
      seriesIndex: series?.index ?? null,
      createdAt: new Date(createdAt),
      updatedAt: new Date(createdAt),
    };
    return {
      raw: [
        id,
        studentId,
        tutorId,
        studentId,
        'Algebra',
        startAt,
        endAt,
        'pending',
        null,
        'Bring notes',
        null,
        null,
        series?.id ?? null,
        series?.index ?? null,
        createdAt,
        createdAt,
        ...(participants
          ? [tutorId, 'Ada', 'Tutor', 'https://example.com/tutor.png']
          : [null, null, null, null]),
        ...(participants ? [studentId, 'Sam', 'Student', null] : [null, null, null, null]),
        verified,
      ],
      expected: {
        ...session,
        tutorName: participants ? 'Ada Tutor' : undefined,
        tutorAvatarUrl: participants ? 'https://example.com/tutor.png' : null,
        tutorIsVerified: verified === 1,
        studentName: participants ? 'Sam Student' : undefined,
        studentAvatarUrl: null,
      },
    };
  }

  beforeEach(() => query.mockReset());

  it.each([0, 1, 50])(
    'returns all %i sessions with one select and descending start order',
    async (count) => {
      const fixtures = Array.from({ length: count }, (_, index) => fixture(index));
      query.mockResolvedValue({ rows: fixtures.map((item) => item.raw) });

      const result = await repository.findForUser(studentId);

      expect(query).toHaveBeenCalledTimes(1);
      const [config, params] = query.mock.calls[0] as [{ text: string }, unknown[]];
      expect(config.text).toMatch(/^select /i);
      expect(config.text).toContain('left join "users" "session_tutor"');
      expect(config.text).toContain('left join "users" "session_student"');
      expect(config.text).toContain('left join "tutor_profiles"');
      expect(config.text).toContain('"sessions"."student_id" = $1 or "sessions"."tutor_id" = $2');
      expect(config.text).toContain('order by "sessions"."start_at" desc');
      expect(config.text).not.toMatch(/\blimit\b/i);
      expect(params).toEqual([studentId, studentId]);
      expect(result).toEqual(fixtures.map((item) => item.expected));
      expect(result).toHaveLength(count);
    },
  );

  it('retains the same owner scope for a tutor', async () => {
    query.mockResolvedValue({ rows: [fixture(0).raw] });
    await repository.findForUser(tutorId);
    expect(query).toHaveBeenCalledTimes(1);
    const [, params] = query.mock.calls[0] as [{ text: string }, unknown[]];
    expect(params).toEqual([tutorId, tutorId]);
  });

  it('preserves missing participant and profile null semantics', async () => {
    const absent = fixture(0, false, null);
    const noProfile = fixture(1, true, null);
    query.mockResolvedValue({ rows: [absent.raw, noProfile.raw] });
    expect(await repository.findForUser(studentId)).toEqual([absent.expected, noProfile.expected]);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it.each([0, 1, 2, null])(
    'verifies tutors only for integer 1 (stored value %s)',
    async (verified) => {
      const row = fixture(0, true, verified);
      query.mockResolvedValue({ rows: [row.raw] });
      expect(await repository.findForUser(studentId)).toEqual([row.expected]);
      expect(query).toHaveBeenCalledTimes(1);
    },
  );

  it('attaches the recurring request behind each session in one extra read', async () => {
    const seriesId = '00000000-0000-4000-8001-0000000000ff';
    const first = fixture(0, true, 1, { id: seriesId, index: 1 });
    const second = fixture(1, true, 1, { id: seriesId, index: 2 });
    query.mockResolvedValueOnce({ rows: [first.raw, second.raw] });
    query.mockResolvedValueOnce({
      rows: [
        [
          seriesId,
          tutorId,
          studentId,
          studentId,
          'Algebra',
          'daily',
          [],
          '09:00',
          60,
          '2026-09-14',
          '2026-09-27',
          2,
          null,
          null,
          new Date(createdAt),
          new Date(createdAt),
        ],
      ],
    });

    const result = await repository.findForUser(studentId);

    expect(query).toHaveBeenCalledTimes(2);
    const [seriesQuery, seriesParams] = query.mock.calls[1] as [{ text: string }, unknown[]];
    expect(seriesQuery.text).toContain('from "session_series"');
    expect(seriesParams).toEqual([seriesId]);
    expect(result.map((session) => session.seriesRecurrence)).toEqual(['daily', 'daily']);
    expect(result.map((session) => session.seriesIndex)).toEqual([1, 2]);
    expect(result[0].seriesWeekdays).toEqual([]);
    expect(result[0].seriesWeeks).toBe(2);
    expect(result[0].seriesTimeOfDay).toBe('09:00');
  });
});
