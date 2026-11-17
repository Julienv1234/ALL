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

describe('drafts wait for approval', () => {
  const draft = (kind: 'task' | 'event' | 'note' | 'memory') =>
    core.makeDraft({ kind, repeat: 'none', title: 'Tandarts', date: '2026-11-19', time: '14:30', project: 'ALL', body: 'b', source: 'zin' });

  it('approving creates the real item and removes the draft', () => {
    for (const kind of ['task', 'event', 'note', 'memory'] as const) {
      const d = draft(kind);
      let s = core.createItem(core.emptyState(), 'drafts', d, 'propose');
      s = core.approveDraft(s, d.id, () => 'ok');
      expect(s.drafts).toHaveLength(0);
      const list = { task: s.tasks, event: s.events, note: s.notes, memory: s.memories }[kind];
      expect(list).toHaveLength(1);
    }
  });
  it('an approved event keeps date and time; undo removes it again', () => {
    const d = draft('event');
    let s = core.approveDraft(core.createItem(core.emptyState(), 'drafts', d, 'p'), d.id, () => 'ok');
    expect(s.events[0]).toMatchObject({ title: 'Tandarts', date: '2026-11-19', time: '14:30' });
    s = core.undoLog(s, s.log[0].id, 'undo');
    expect(s.events).toHaveLength(0);
  });
  it('rejecting can be undone', () => {
    const d = draft('task');
    let s = core.createItem(core.emptyState(), 'drafts', d, 'p');
    s = core.deleteItem(s, 'drafts', d.id, 'reject');
    s = core.undoLog(s, s.log[0].id, 'undo');
    expect(s.drafts).toEqual([d]);
  });
  it('drafts survive saving and loading; broken ones are dropped', () => {
    const d = draft('note');
    const s = core.createItem(core.emptyState(), 'drafts', d, 'p');
    expect(core.parseState(JSON.parse(JSON.stringify(s)))?.drafts).toEqual([d]);
    expect(core.parseState({ v: 1, drafts: [{ id: 'x', title: 't', kind: 'rocket' }] })?.drafts).toEqual([]);
  });
});

describe('projects', () => {
  function withTasks() {
    let s = core.emptyState();
    s = core.createItem(s, 'tasks', core.makeTask('Logo', 'ALL', '2026-11-20'), 'a');
    s = core.createItem(s, 'tasks', core.makeTask('Naam', 'all', '2026-11-18'), 'a');
    s = core.createItem(s, 'tasks', { ...core.makeTask('Klaar', 'ALL'), done: true }, 'a');
    s = core.createItem(s, 'tasks', core.makeTask('Hoofdstuk 4', 'School'), 'a');
    return s;
  }
  it('task labels become projects, case-insensitive, with counts and the next task', () => {
    const v = core.projectViews(withTasks());
    expect(v.map((p) => p.name)).toEqual(['ALL', 'School']);
    expect(v[0]).toMatchObject({ open: 2, done: 1, implicit: true });
    expect(v[0].next?.title).toBe('Naam');
  });
  it('a made project carries goal and deadline and sorts by deadline', () => {
    let s = withTasks();
    s = core.createItem(s, 'projects', core.makeProject('School', 'Examens halen', '2026-12-01'), 'p');
    s = core.createItem(s, 'projects', core.makeProject('Leeg', '', '2026-11-30'), 'p');
    const v = core.projectViews(s);
    expect(v.map((p) => p.name)).toEqual(['Leeg', 'School', 'ALL']);
    expect(v[1]).toMatchObject({ goal: 'Examens halen', implicit: false, open: 1 });
  });
  it('rename moves the tasks along', () => {
    const s = core.renameProject(withTasks(), 'ALL', 'ALL app', 'rename');
    expect(s.tasks.filter((t) => t.project === 'ALL app')).toHaveLength(3);
    expect(core.projectViews(s).map((p) => p.name)).toContain('ALL app');
  });
  it('projects survive saving and loading', () => {
    const s = core.createItem(core.emptyState(), 'projects', core.makeProject('School', 'doel'), 'p');
    expect(core.parseState(JSON.parse(JSON.stringify(s)))?.projects).toEqual(s.projects);
  });
});
