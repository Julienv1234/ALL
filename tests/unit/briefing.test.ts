import { describe, expect, it } from 'vitest';
import * as core from '@/lib/core';
import { makeBriefing } from '@/lib/briefing';

const T = '2026-11-17';
function state() {
  let s = core.emptyState();
  s = core.createItem(s, 'events', core.makeEvent('Les', T, '09:00'), 'a');
  s = core.createItem(s, 'events', core.makeEvent('Sport', T, '19:00'), 'a');
  s = core.createItem(s, 'events', core.makeEvent('Tandarts', '2026-11-18', '08:30'), 'a');
  s = core.createItem(s, 'tasks', core.makeTask('Naam kiezen', '', '2026-11-15'), 'a');
  s = core.createItem(s, 'tasks', core.makeTask('Budget', '', T), 'a');
  return s;
}

describe('briefing', () => {
  it('summarises today, late, due and tomorrow, in order', () => {
    expect(makeBriefing(state(), T, 'nl').lines).toEqual([
      'Vandaag: 09:00 Les en 19:00 Sport.',
      'Eén taak is te laat: “Naam kiezen”.',
      'Deadline vandaag: “Budget”.',
      'Morgen begint met 08:30 Tandarts.',
    ]);
    expect(makeBriefing(state(), T, 'nl').sources).toEqual(['je agenda', 'je taken']);
  });
  it('english', () => {
    expect(makeBriefing(state(), T, 'en').lines[0]).toBe('Today: 09:00 Les and 19:00 Sport.');
  });
  it('an empty day', () => {
    expect(makeBriefing(core.emptyState(), T, 'nl')).toEqual({ lines: ['Niets in je agenda vandaag.'], sources: [] });
  });
  it('done tasks are ignored', () => {
    const s = state();
    s.tasks = s.tasks.map((t) => ({ ...t, done: true }));
    expect(makeBriefing(s, T, 'nl').lines.some((l) => l.includes('te laat'))).toBe(false);
  });
});
