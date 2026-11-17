import { describe, expect, it } from 'vitest';
import * as core from '@/lib/core';

describe('state changes are logged and undoable', () => {
  it('create then undo removes the item', () => {
    const t = core.makeTask('Naam kiezen');
    let s = core.createItem(core.emptyState(), 'tasks', t, 'add');
    expect(s.tasks).toHaveLength(1);
    expect(s.log[0].undo).toEqual({ type: 'remove', collection: 'tasks', id: t.id });
    s = core.undoLog(s, s.log[0].id, 'undo');
    expect(s.tasks).toHaveLength(0);
    expect(s.log[1].undone).toBe(true);
    expect(s.log[0].undo).toBeUndefined();
  });

  it('delete then undo restores the exact item', () => {
    const n = core.makeNote('Ideeën', 'tekst');
    let s = core.createItem(core.emptyState(), 'notes', n, 'add');
    s = core.deleteItem(s, 'notes', n.id, 'del');
    expect(s.notes).toHaveLength(0);
    s = core.undoLog(s, s.log[0].id, 'undo');
    expect(s.notes).toEqual([n]);
  });

  it('update then undo brings back the previous version', () => {
    const t = core.makeTask('Oud');
    let s = core.createItem(core.emptyState(), 'tasks', t, 'add');
    s = core.updateItem(s, 'tasks', { ...t, title: 'Nieuw', done: true }, 'edit');
    expect(s.tasks[0].title).toBe('Nieuw');
    s = core.undoLog(s, s.log[0].id, 'undo');
    expect(s.tasks[0]).toEqual(t);
  });

  it('an undo cannot run twice', () => {
    const t = core.makeTask('x');
    let s = core.createItem(core.emptyState(), 'tasks', t, 'add');
    const id = s.log[0].id;
    s = core.undoLog(s, id, 'undo');
    const again = core.undoLog(s, id, 'undo');
    expect(again).toBe(s);
  });

  it('missing items are a no-op', () => {
    const s = core.emptyState();
    expect(core.updateItem(s, 'tasks', core.makeTask('x'), 'e')).toBe(s);
    expect(core.deleteItem(s, 'tasks', 'nope', 'd')).toBe(s);
  });

  it('the log is capped', () => {
    let s = core.emptyState();
    for (let i = 0; i < core.LOG_LIMIT + 20; i++) s = core.createItem(s, 'memories', core.makeMemory('m' + i), 'add');
    expect(s.log).toHaveLength(core.LOG_LIMIT);
  });
});

describe('import and saved data', () => {
  it('round-trips', () => {
    let s = core.emptyState();
    s = core.createItem(s, 'events', core.makeEvent('Les', '2026-11-17', '09:00', 'School'), 'add');
    s = { ...s, settings: { lang: 'en', name: 'Julien' } };
    expect(core.parseState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('rejects things that are not ALL data', () => {
    expect(core.parseState(null)).toBeNull();
    expect(core.parseState([])).toBeNull();
    expect(core.parseState({ v: 2 })).toBeNull();
    expect(core.parseState({ tasks: [] })).toBeNull();
  });

  it('drops broken items and fills missing fields', () => {
    const s = core.parseState({ v: 1, tasks: [{ id: 'a', title: 'ok' }, { title: 'no id' }, 7], notes: 'x', settings: { lang: 'fr', name: 5 } });
    expect(s?.tasks).toEqual([expect.objectContaining({ id: 'a', title: 'ok', done: false, project: '', due: '' })]);
    expect(s?.notes).toEqual([]);
    expect(s?.settings).toEqual({ lang: 'nl', name: '' });
  });
});

describe('dates', () => {
  it('adds days across months', () => {
    expect(core.addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(core.addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('sorts events by date and time, all-day first', () => {
    const a = core.makeEvent('b', '2026-11-17', '15:00');
    const b = core.makeEvent('a', '2026-11-17', '');
    const c = core.makeEvent('c', '2026-11-16', '20:00');
    expect(core.sortEvents([a, b, c]).map((e) => e.title)).toEqual(['c', 'a', 'b']);
  });
});

describe('first cloud sync', () => {
  const withTask = () => core.createItem(core.emptyState(), 'tasks', core.makeTask('x'), 'add');
  it('uploads when the cloud has nothing yet', () => {
    expect(core.firstSync(withTask(), null)).toBe('upload');
    expect(core.firstSync(withTask(), core.emptyState())).toBe('upload');
  });
  it('downloads onto an empty device', () => {
    expect(core.firstSync(core.emptyState(), withTask())).toBe('download');
  });
  it('does nothing when both are empty or equal', () => {
    expect(core.firstSync(core.emptyState(), core.emptyState())).toBe('none');
    const s = withTask();
    expect(core.firstSync(s, JSON.parse(JSON.stringify(s)))).toBe('none');
  });
  it('asks when both sides hold different data', () => {
    expect(core.firstSync(withTask(), withTask())).toBe('ask');
  });
});
