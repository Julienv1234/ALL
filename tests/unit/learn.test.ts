import { describe, expect, it } from 'vitest';
import * as core from '@/lib/core';

const T = '2026-11-19'; // a Thursday
function state() {
  let s = core.emptyState();
  const wi = core.makeSubject('Wiskunde', 'Examen halen', '2026-11-24', 120);
  const fr = core.makeSubject('Frans');
  s = core.createItem(s, 'subjects', wi, 'a');
  s = core.createItem(s, 'subjects', fr, 'a');
  for (const [sub, d, m] of [[wi, '2026-11-19', 25], [wi, '2026-11-18', 30], [wi, '2026-11-15', 50], [fr, '2026-11-17', 20], [fr, '2026-11-16', 10]] as const) {
    s = core.createItem(s, 'sessions', core.makeSession(sub.id, m, d), 'a');
  }
  return { s, wi, fr };
}

describe('learning', () => {
  it('week starts on Monday', () => {
    expect(core.weekStart('2026-11-19')).toBe('2026-11-16');
    expect(core.weekStart('2026-11-16')).toBe('2026-11-16');
    expect(core.weekStart('2026-11-22')).toBe('2026-11-16');
  });
  it('minutes this week ignore last week; exam countdown; sorted by exam', () => {
    const { s } = state();
    const v = core.subjectViews(s, T);
    expect(v.map((x) => x.name)).toEqual(['Wiskunde', 'Frans']);
    expect(v[0]).toMatchObject({ week: 55, total: 105, daysToExam: 5 });
    expect(v[1]).toMatchObject({ week: 30, daysToExam: null });
  });
  it('minutes per day for a week chart', () => {
    const d = core.minutesPerDay(state().s, T, 7);
    expect(d.map((x) => x.minutes)).toEqual([0, 0, 50, 10, 20, 30, 25]);
    expect(d[6].date).toBe(T);
  });
  it('streak counts days in a row, also when today has nothing yet', () => {
    const { s } = state();
    expect(core.streak(s, T)).toBe(5);
    expect(core.streak(s, '2026-11-20')).toBe(5);
    expect(core.streak(s, '2026-11-21')).toBe(0);
  });
  it('sessions and subjects survive saving; nonsense is dropped', () => {
    const { s } = state();
    const back = core.parseState(JSON.parse(JSON.stringify(s)))!;
    expect(back.subjects).toEqual(s.subjects);
    expect(back.sessions).toEqual(s.sessions);
    expect(core.parseState({ v: 1, sessions: [{ id: 'x', subjectId: 'y', date: '2026-11-19', minutes: -3 }] })!.sessions).toEqual([]);
  });
});
