import { describe, expect, it } from 'vitest';
import {
  emptyState, habitViews, makeHabit, makeRule, makeSubject, parseState, ruleHits, runRules, toggleHabitDay, undoLog, weekday,
} from '../../src/lib/core';
import type { Habit, State } from '../../src/lib/types';

// 2026-11-16 is a Monday.
const MON = '2026-11-16';
const created = (day: string) => new Date(day + 'T08:00:00').toISOString();
const habit = (h: Partial<Habit>): Habit => ({ ...makeHabit('Lezen'), createdAt: created('2026-11-01'), ...h });
const withHabit = (h: Habit): State => ({ ...emptyState(), habits: [h] });

describe('habits', () => {
  it('knows weekdays with Monday as 0', () => {
    expect(weekday(MON)).toBe(0);
    expect(weekday('2026-11-22')).toBe(6);
  });

  it('counts a streak and does not break it before today is over', () => {
    const h = habit({ done: ['2026-11-15', '2026-11-14', '2026-11-13', '2026-11-11'] });
    const v = habitViews(withHabit(h), MON)[0];
    expect(v.doneToday).toBe(false);
    expect(v.streak).toBe(3);
    const v2 = habitViews(withHabit(toggleHabitDay(h, MON)), MON)[0];
    expect(v2.streak).toBe(4);
    expect(v2.doneToday).toBe(true);
  });

  it('skips days that are not planned', () => {
    // planned on Monday, Wednesday and Friday only
    const h = habit({ days: [0, 2, 4], done: ['2026-11-13', '2026-11-11', '2026-11-09'] });
    const v = habitViews(withHabit(h), MON)[0];
    expect(v.today).toBe(true);
    expect(v.streak).toBe(3);
    expect(v.last7.filter((d) => d.planned).length).toBe(3);
  });

  it('toggling twice gives the original back', () => {
    const h = habit({});
    expect(toggleHabitDay(toggleHabitDay(h, MON), MON).done).toEqual([]);
  });

  it('every day selected is stored as "every day"', () => {
    expect(makeHabit('x', [0, 1, 2, 3, 4, 5, 6]).days).toEqual([]);
  });
});

describe('workflow rules', () => {
  const base = { name: 'Weekplanning', kind: 'task' as const, title: 'Week plannen', project: 'School', dueIn: 0, direct: false };

  it('a weekly rule fires once for its day and not before it existed', () => {
    const r = { ...makeRule({ ...base, when: { type: 'weekly', weekday: 0 } }), createdAt: created('2026-11-02') };
    expect(ruleHits(r, emptyState(), '2026-11-18').map((h) => h.key)).toEqual([MON]);
    const fresh = { ...r, createdAt: created('2026-11-17') };
    expect(ruleHits(fresh, emptyState(), '2026-11-18')).toEqual([]);
  });

  it('makes a draft, remembers it fired, and the draft can be undone', () => {
    const r = { ...makeRule({ ...base, when: { type: 'daily' } }), createdAt: created('2026-11-01') };
    const s: State = { ...emptyState(), rules: [r] };
    const a = runRules(s, MON);
    expect(a.fired).toBe(1);
    expect(a.state.drafts[0].title).toBe('Week plannen');
    expect(a.state.drafts[0].date).toBe(MON);
    expect(a.state.drafts[0].source).toBe('workflow:Weekplanning');
    const b = runRules(a.state, MON);
    expect(b.fired).toBe(0);
    const undone = undoLog(a.state, a.state.log[0].id, 'undo');
    expect(undone.drafts).toHaveLength(0);
  });

  it('direct rules add the task itself', () => {
    const r = { ...makeRule({ ...base, direct: true, dueIn: 2, when: { type: 'daily' } }), createdAt: created('2026-11-01') };
    const out = runRules({ ...emptyState(), rules: [r] }, MON).state;
    expect(out.tasks[0]).toMatchObject({ title: 'Week plannen', project: 'School', due: '2026-11-18' });
    expect(out.drafts).toHaveLength(0);
  });

  it('exam rules fire once per exam and fill in the subject', () => {
    const sub = { ...makeSubject('Wiskunde', '', '2026-11-19'), id: 's1' };
    const r = { ...makeRule({ ...base, title: 'Herhalen {vak} voor {datum}', when: { type: 'examSoon', days: 3 } }), createdAt: created('2026-11-01') };
    const s: State = { ...emptyState(), subjects: [sub], rules: [r] };
    expect(runRules(s, '2026-11-15').fired).toBe(0);
    const a = runRules(s, MON);
    expect(a.state.drafts[0].title).toBe('Herhalen Wiskunde voor 19/11');
    expect(runRules(a.state, '2026-11-17').fired).toBe(0);
  });

  it('monthly rules use the last matching day', () => {
    const r = { ...makeRule({ ...base, when: { type: 'monthly', day: 20 } }), createdAt: created('2026-09-01') };
    expect(ruleHits(r, emptyState(), MON)[0].key).toBe('2026-10-20');
    expect(ruleHits(r, emptyState(), '2026-11-20')[0].key).toBe('2026-11-20');
  });

  it('disabled rules never fire', () => {
    const r = { ...makeRule({ ...base, when: { type: 'daily' } }), enabled: false };
    expect(runRules({ ...emptyState(), rules: [r] }, MON).fired).toBe(0);
  });
});

describe('saved data', () => {
  it('cleans habits, rules, sites, agents and reminder settings from a file', () => {
    const s = parseState({
      v: 1,
      habits: [{ id: 'h', name: 'Lezen', days: [0, 9, 'x', 2], done: ['2026-11-16', 'nope'] }, { id: 'bad' }],
      rules: [{ id: 'r', name: 'x', title: 'y', when: { type: 'weekly', weekday: 9 } }, { id: 'r2', name: 'x', title: 'y', when: { type: 'monthly', day: 40 } }],
      sites: [{ id: 's', name: 'Site', accent: 'red', links: [{ label: 'a', url: 'https://x.be' }] }],
      agents: [{ id: 'a', name: 'Coach', can: { tasks: 'draft', mail: 'draft', notes: 'admin' }, schedule: '7:00' }],
      settings: { lang: 'en', remind: { on: true, before: 7 } },
    })!;
    expect(s.habits).toEqual([expect.objectContaining({ id: 'h', days: [0, 2], done: ['2026-11-16'] })]);
    expect(s.rules.map((r) => r.id)).toEqual(['r2']);
    expect(s.rules[0].when).toEqual({ type: 'monthly', day: 28 });
    expect(s.sites[0].accent).toBe('#FF4D6D');
    expect(s.agents[0].can).toEqual({ tasks: 'draft', agenda: 'none', notes: 'none', memory: 'none', learn: 'none', habits: 'none' });
    expect(s.agents[0].schedule).toBe('');
    expect(s.settings.remind).toEqual({ on: true, before: 15, tasks: true });
  });
});

describe('updating from a screen', () => {
  it('stores only the real fields, not computed ones', async () => {
    const { createItem, updateItem } = await import('../../src/lib/core');
    let s = createItem(emptyState(), 'habits', habit({ id: 'h1' }), 'add');
    const view = habitViews(s, MON)[0];
    s = updateItem(s, 'habits', { ...view, name: 'Lezen 20 min' }, 'edit');
    expect(Object.keys(s.habits[0]).sort()).toEqual(['archived', 'createdAt', 'days', 'done', 'id', 'name']);
    expect(s.habits[0].name).toBe('Lezen 20 min');
  });
});
