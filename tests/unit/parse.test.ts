import { describe, expect, it } from 'vitest';
import { parseCommand, takeDate } from '@/lib/parse';

// 2026-11-17 is a Tuesday.
const T = '2026-11-17';
const p = (s: string) => parseCommand(s, T);

describe('commands become drafts', () => {
  it('event with weekday and time', () => {
    expect(p('afspraak tandarts donderdag om 14:30')).toEqual({ kind: 'event', repeat: 'none', title: 'Tandarts', date: '2026-11-19', time: '14:30', project: '', body: '' });
  });
  it('event without command word, because it has a time', () => {
    expect(p('voetbaltraining morgen 18u')).toMatchObject({ kind: 'event', title: 'Voetbaltraining', date: '2026-11-18', time: '18:00' });
  });
  it('task with due date and project', () => {
    expect(p('taak naam kiezen voor ALL morgen #ALL')).toMatchObject({ kind: 'task', title: 'Naam kiezen voor ALL', date: '2026-11-18', project: 'ALL' });
  });
  it('remind me', () => {
    expect(p('herinner me om huiswerk te plannen')).toMatchObject({ kind: 'task', title: 'Huiswerk te plannen', date: '' });
  });
  it('memory', () => {
    expect(p('onthoud dat ik donderdag na 16:00 vrij ben')).toMatchObject({ kind: 'memory', title: 'Ik donderdag na 16:00 vrij ben' });
  });
  it('note with title and body', () => {
    expect(p('noteer ideeën: lantaarn als logo')).toMatchObject({ kind: 'note', title: 'Ideeën', body: 'lantaarn als logo' });
  });
  it('english', () => {
    expect(p('meeting with Sam next friday at 3pm')).toMatchObject({ kind: 'event', title: 'Meeting with Sam', date: '2026-11-20', time: '15:00' });
    expect(p('remind me to call grandma tomorrow')).toMatchObject({ kind: 'task', title: 'Call grandma', date: '2026-11-18' });
  });
  it('explicit dates, rolling into next year when past', () => {
    expect(p('les geschiedenis op 20 november om 9:00')).toMatchObject({ kind: 'event', date: '2026-11-20', time: '09:00', title: 'Les geschiedenis' });
    expect(p('taak rapport 3/1')).toMatchObject({ date: '2027-01-03' });
    expect(p('taak rapport 3/1/2026')).toMatchObject({ date: '2026-01-03' });
  });
  it('same weekday means next week', () => {
    expect(takeDate('dinsdag', T).date).toBe('2026-11-24');
  });
});

describe('repeats', () => {
  it('every weekday, starting on the next one', () => {
    expect(p('les wiskunde elke dinsdag om 9:00')).toMatchObject({ kind: 'event', repeat: 'weekly', title: 'Les wiskunde', date: '2026-11-17', time: '09:00' });
    expect(p('voetbal every thursday 18:00')).toMatchObject({ kind: 'event', repeat: 'weekly', title: 'Voetbal', date: '2026-11-19', time: '18:00' });
  });
  it('daily and monthly, even without a time', () => {
    expect(p('lezen elke dag')).toMatchObject({ kind: 'event', repeat: 'daily', title: 'Lezen', date: T, time: '' });
    expect(p('zakgeld maandelijks op 1/12')).toMatchObject({ kind: 'event', repeat: 'monthly', title: 'Zakgeld', date: '2026-12-01' });
  });
  it('tasks never repeat', () => {
    expect(p('taak kamer opruimen elke week')).toMatchObject({ kind: 'task', repeat: 'none', title: 'Kamer opruimen elke week' });
  });
});

describe('searches stay searches', () => {
  it.each(['ALL', 'lantaarn', 'naam', 'ideeën voor de naam', 'ok'])('%s', (s) => {
    expect(p(s)).toBeNull();
  });
  it('a command word with nothing after it', () => {
    expect(p('taak morgen')).toBeNull();
  });
});
