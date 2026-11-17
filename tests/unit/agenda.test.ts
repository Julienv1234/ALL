import { describe, expect, it } from 'vitest';
import * as core from '@/lib/core';
import { parseIcs, toIcs } from '@/lib/ics';

const dates = (e: ReturnType<typeof core.makeEvent>, from: string, to: string) => core.occurrences([e], from, to).map((o) => o.date);

describe('repeating events', () => {
  it('one-off events only show on their day', () => {
    expect(dates(core.makeEvent('x', '2026-11-17'), '2026-11-01', '2026-11-30')).toEqual(['2026-11-17']);
    expect(dates(core.makeEvent('x', '2026-11-17'), '2026-11-18', '2026-11-30')).toEqual([]);
  });
  it('weekly, starting long before the window', () => {
    const e = core.makeEvent('Les', '2026-09-01', '09:00', '', 'weekly');
    expect(dates(e, '2026-11-16', '2026-11-30')).toEqual(['2026-11-17', '2026-11-24']);
  });
  it('daily with an end date and a skipped day', () => {
    const e = { ...core.makeEvent('Lezen', '2026-11-17', '', '', 'daily', '2026-11-21'), skip: ['2026-11-19'] };
    expect(dates(e, '2026-11-01', '2026-12-31')).toEqual(['2026-11-17', '2026-11-18', '2026-11-20', '2026-11-21']);
  });
  it('monthly on the 31st skips short months', () => {
    const e = core.makeEvent('Huur', '2026-01-31', '', '', 'monthly');
    expect(dates(e, '2026-01-01', '2026-06-30')).toEqual(['2026-01-31', '2026-03-31', '2026-05-31']);
  });
  it('sorts by date then time across events', () => {
    const a = core.makeEvent('b', '2026-11-17', '15:00');
    const b = core.makeEvent('a', '2026-11-10', '08:00', '', 'weekly');
    expect(core.occurrences([a, b], '2026-11-17', '2026-11-17').map((o) => o.ev.title)).toEqual(['a', 'b']);
  });
  it('an import can be undone in one go', () => {
    const evs = [core.makeEvent('a', '2026-11-17'), core.makeEvent('b', '2026-11-18')];
    let s = core.createMany(core.emptyState(), 'events', evs, 'import');
    expect(s.events).toHaveLength(2);
    s = core.undoLog(s, s.log[0].id, 'undo');
    expect(s.events).toHaveLength(0);
  });
});

const ICS = [
  'BEGIN:VCALENDAR', 'VERSION:2.0',
  'BEGIN:VEVENT', 'UID:a1', 'DTSTART:20261117T090000', 'SUMMARY:Les geschiedenis', 'LOCATION:Lokaal 2\\, gebouw B',
  'RRULE:FREQ=WEEKLY;UNTIL=20261222T235959Z', 'EXDATE:20261124T090000', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a2', 'DTSTART;VALUE=DATE:20261205', 'SUMMARY:Sinterklaas', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a3', 'DTSTART:20261118T130000Z', 'SUMMARY:Call met een heel lange titel die over de vijfenzeventig tekens gaat zodat hij gevouwen', '  wordt', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a4', 'DTSTART:20261116T160000', 'SUMMARY:Training', 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a5', 'DTSTART:20261116T160000', 'SUMMARY:Om de week', 'RRULE:FREQ=WEEKLY;INTERVAL=2', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a6', 'SUMMARY:Zonder start', 'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

describe('reading calendar files', () => {
  const r = parseIcs(ICS);
  const byTitle = (t: string) => r.events.filter((e) => e.title === t);
  it('reads one-off, all-day, folded lines and escapes', () => {
    expect(byTitle('Sinterklaas')[0]).toMatchObject({ date: '2026-12-05', time: '', repeat: 'none' });
    // UNTIL is given in UTC; in Brussels 23:59 UTC is already the next day.
    const untilLocal = core.isoDay(new Date(Date.UTC(2026, 11, 22, 23, 59, 59)));
    expect(byTitle('Les geschiedenis')[0]).toMatchObject({ date: '2026-11-17', time: '09:00', place: 'Lokaal 2, gebouw B', repeat: 'weekly', until: untilLocal, skip: ['2026-11-24'] });
    expect(r.events.some((e) => e.title.endsWith('gevouwen wordt'))).toBe(true);
  });
  it('turns UTC times into local time', () => {
    const e = r.events.find((x) => x.uid === 'a3')!;
    const d = new Date(Date.UTC(2026, 10, 18, 13, 0));
    expect(e.time).toBe(`${String(d.getHours()).padStart(2, '0')}:00`);
  });
  it('splits "Monday and Wednesday" into two weekly events', () => {
    expect(byTitle('Training').map((e) => e.date).sort()).toEqual(['2026-11-16', '2026-11-18']);
  });
  it('counts what it cannot do exactly, and skips broken events', () => {
    expect(r.simplified).toBe(1);
    expect(r.skipped).toBe(1);
    expect(byTitle('Om de week')[0].repeat).toBe('none');
  });
  it('does not import the same event twice', () => {
    expect(parseIcs(ICS, new Set(['a1', 'a2'])).events.some((e) => e.uid === 'a1' || e.uid === 'a2')).toBe(false);
  });
});

describe('writing calendar files', () => {
  it('round-trips through its own reader', () => {
    const a = { ...core.makeEvent('Les; met komma, en \\ teken', '2026-11-17', '09:00', 'School', 'weekly', '2026-12-22'), skip: ['2026-11-24'] };
    const b = core.makeEvent('Verjaardag', '2026-12-05');
    const back = parseIcs(toIcs([a, b])).events;
    expect(back[0]).toMatchObject({ title: a.title, date: a.date, time: '09:00', place: 'School', repeat: 'weekly', until: '2026-12-22', skip: ['2026-11-24'] });
    expect(back[1]).toMatchObject({ title: 'Verjaardag', date: '2026-12-05', time: '' });
  });
  it('folds long lines and uses CRLF', () => {
    const out = toIcs([core.makeEvent('x'.repeat(200), '2026-11-17')]);
    expect(out.includes('\r\n ')).toBe(true);
    expect(out.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
});
