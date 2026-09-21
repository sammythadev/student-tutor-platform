import { buildActivityStrip, computeStreaks, coursePercent, isCourseFinished } from './learning';

/** Fixed "today" so the streak rules are pinned to a date, not to when CI runs. */
const today = new Date('2026-09-21T10:00:00.000Z');

function daysBefore(count: number): string[] {
  return Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(2026, 8, 21 - index)).toISOString().slice(0, 10),
  );
}

describe('computeStreaks', () => {
  it('reports zero for no activity at all', () => {
    expect(computeStreaks([], today)).toEqual({ current: 0, longest: 0, activeDays: 0 });
  });

  it('counts a run ending today', () => {
    expect(computeStreaks(daysBefore(3), today)).toEqual({
      current: 3,
      longest: 3,
      activeDays: 3,
    });
  });

  it('keeps the streak alive while today is still empty', () => {
    const yesterday = daysBefore(3).slice(1);

    expect(computeStreaks(yesterday, today).current).toBe(2);
  });

  it('ends the streak after two idle days but remembers the longest run', () => {
    const result = computeStreaks(['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'], today);

    expect(result.current).toBe(0);
    expect(result.longest).toBe(4);
    expect(result.activeDays).toBe(4);
  });

  it('counts a day once however much happened on it, and ignores duplicate/future noise', () => {
    const result = computeStreaks(
      ['2026-09-21', '2026-09-21', '2026-09-20', '2026-09-19', '2026-09-19'],
      today,
    );

    expect(result).toEqual({ current: 3, longest: 3, activeDays: 3 });
  });

  it('finds the longest run even when it is not the most recent one', () => {
    const result = computeStreaks(
      ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-20', '2026-09-21'],
      today,
    );

    expect(result.current).toBe(2);
    expect(result.longest).toBe(4);
  });
});

describe('buildActivityStrip', () => {
  it('returns a dense window ending today, oldest first', () => {
    const strip = buildActivityStrip([{ date: '2026-09-21', hours: 1.5, topics: 2 }], today, 3);

    expect(strip).toEqual([
      { date: '2026-09-19', hours: 0, topics: 0 },
      { date: '2026-09-20', hours: 0, topics: 0 },
      { date: '2026-09-21', hours: 1.5, topics: 2 },
    ]);
  });

  it('drops activity older than the window and defaults the length to fourteen days', () => {
    const strip = buildActivityStrip(
      [
        { date: '2026-01-01', hours: 9, topics: 9 },
        { date: '2026-09-20', hours: 2, topics: 0 },
      ],
      today,
    );

    expect(strip).toHaveLength(14);
    expect(strip[13]).toEqual({ date: '2026-09-21', hours: 0, topics: 0 });
    expect(strip[12]).toEqual({ date: '2026-09-20', hours: 2, topics: 0 });
    expect(strip.some((day) => day.hours === 9)).toBe(false);
  });
});

describe('coursePercent / isCourseFinished', () => {
  it('rounds to a whole percent and never divides by zero', () => {
    expect(coursePercent(0, 0)).toBe(0);
    expect(coursePercent(1, 3)).toBe(33);
    expect(coursePercent(3, 3)).toBe(100);
  });

  it('only calls a topic-less course finished when it has topics', () => {
    expect(isCourseFinished(0, 0)).toBe(false);
    expect(isCourseFinished(2, 2)).toBe(true);
    expect(isCourseFinished(1, 2)).toBe(false);
  });
});
