/**
 * Pure state logic: every change goes through here, gets a log entry and,
 * where possible, a way to undo it. No React and no browser APIs, so it is
 * easy to test.
 */
import type { CalEvent, Collection, Item, LogEntry, Memory, Note, State, Task, Undo } from './types';

export const LOG_LIMIT = 500;

export function emptyState(): State {
  return {
    v: 1,
    tasks: [],
    notes: [],
    events: [],
    memories: [],
    log: [],
    settings: { lang: 'nl', name: '' },
  };
}

export function newId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export const nowIso = () => new Date().toISOString();

function addLog(s: State, text: string, collection: LogEntry['collection'], undo?: Undo): State {
  const entry: LogEntry = { id: newId(), at: nowIso(), text, collection, undo };
  return { ...s, log: [entry, ...s.log].slice(0, LOG_LIMIT) };
}

function list<T extends Item>(s: State, c: Collection): T[] {
  return s[c] as unknown as T[];
}

function setList(s: State, c: Collection, items: Item[]): State {
  return { ...s, [c]: items } as State;
}

/* ---------- generic operations ---------- */

export function createItem(s: State, c: Collection, item: Item, label: string): State {
  const next = setList(s, c, [item, ...list(s, c)]);
  return addLog(next, label, c, { type: 'remove', collection: c, id: item.id });
}

export function updateItem(s: State, c: Collection, item: Item, label: string): State {
  const prev = list(s, c).find((x) => x.id === item.id);
  if (!prev) return s;
  const next = setList(s, c, list(s, c).map((x) => (x.id === item.id ? item : x)));
  return addLog(next, label, c, { type: 'replace', collection: c, item: prev });
}

export function deleteItem(s: State, c: Collection, id: string, label: string): State {
  const prev = list(s, c).find((x) => x.id === id);
  if (!prev) return s;
  const next = setList(s, c, list(s, c).filter((x) => x.id !== id));
  return addLog(next, label, c, { type: 'restore', collection: c, item: prev });
}

/** Reverse a logged action. The undo itself is logged too, without its own undo. */
export function undoLog(s: State, logId: string, label: string): State {
  const entry = s.log.find((e) => e.id === logId);
  if (!entry || !entry.undo || entry.undone) return s;
  const u = entry.undo;
  let next = s;
  if (u.type === 'remove') {
    next = setList(s, u.collection, list(s, u.collection).filter((x) => x.id !== u.id));
  } else if (u.type === 'restore') {
    if (!list(s, u.collection).some((x) => x.id === u.item.id)) {
      next = setList(s, u.collection, [u.item, ...list(s, u.collection)]);
    }
  } else {
    const exists = list(s, u.collection).some((x) => x.id === u.item.id);
    next = exists
      ? setList(s, u.collection, list(s, u.collection).map((x) => (x.id === u.item.id ? u.item : x)))
      : setList(s, u.collection, [u.item, ...list(s, u.collection)]);
  }
  next = { ...next, log: next.log.map((e) => (e.id === logId ? { ...e, undone: true } : e)) };
  return addLog(next, label, entry.collection);
}

/* ---------- builders ---------- */

export function makeTask(title: string, project = '', due = ''): Task {
  return { id: newId(), title: title.trim(), project: project.trim(), due, done: false, createdAt: nowIso(), doneAt: '' };
}

export function makeNote(title: string, body: string): Note {
  const t = nowIso();
  return { id: newId(), title: title.trim(), body, createdAt: t, updatedAt: t };
}

export function makeEvent(title: string, date: string, time = '', place = ''): CalEvent {
  return { id: newId(), title: title.trim(), date, time, place: place.trim(), createdAt: nowIso() };
}

export function makeMemory(text: string): Memory {
  const t = nowIso();
  return { id: newId(), text: text.trim(), createdAt: t, updatedAt: t };
}

/* ---------- import / export ---------- */

const isStr = (v: unknown): v is string => typeof v === 'string';
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function cleanTask(x: unknown): Task | null {
  if (!isObj(x) || !isStr(x.id) || !isStr(x.title)) return null;
  return {
    id: x.id, title: x.title, project: isStr(x.project) ? x.project : '', due: isStr(x.due) ? x.due : '',
    done: x.done === true, createdAt: isStr(x.createdAt) ? x.createdAt : nowIso(), doneAt: isStr(x.doneAt) ? x.doneAt : '',
  };
}
function cleanNote(x: unknown): Note | null {
  if (!isObj(x) || !isStr(x.id) || !isStr(x.title)) return null;
  const t = isStr(x.createdAt) ? x.createdAt : nowIso();
  return { id: x.id, title: x.title, body: isStr(x.body) ? x.body : '', createdAt: t, updatedAt: isStr(x.updatedAt) ? x.updatedAt : t };
}
function cleanEvent(x: unknown): CalEvent | null {
  if (!isObj(x) || !isStr(x.id) || !isStr(x.title) || !isStr(x.date)) return null;
  return {
    id: x.id, title: x.title, date: x.date, time: isStr(x.time) ? x.time : '', place: isStr(x.place) ? x.place : '',
    createdAt: isStr(x.createdAt) ? x.createdAt : nowIso(),
  };
}
function cleanMemory(x: unknown): Memory | null {
  if (!isObj(x) || !isStr(x.id) || !isStr(x.text)) return null;
  const t = isStr(x.createdAt) ? x.createdAt : nowIso();
  return { id: x.id, text: x.text, createdAt: t, updatedAt: isStr(x.updatedAt) ? x.updatedAt : t };
}

function cleanList<T>(v: unknown, f: (x: unknown) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  return v.map(f).filter((x): x is T => x !== null);
}

/** Parses saved or imported data. Returns null when it is not ALL data at all. */
export function parseState(raw: unknown): State | null {
  if (!isObj(raw) || raw.v !== 1) return null;
  const base = emptyState();
  const st = isObj(raw.settings) ? raw.settings : {};
  const log = Array.isArray(raw.log)
    ? raw.log.filter((e): e is LogEntry => isObj(e) && isStr(e.id) && isStr(e.at) && isStr(e.text)).slice(0, LOG_LIMIT)
    : [];
  return {
    v: 1,
    tasks: cleanList(raw.tasks, cleanTask),
    notes: cleanList(raw.notes, cleanNote),
    events: cleanList(raw.events, cleanEvent),
    memories: cleanList(raw.memories, cleanMemory),
    log,
    settings: {
      lang: st.lang === 'en' ? 'en' : base.settings.lang,
      name: isStr(st.name) ? st.name.slice(0, 60) : '',
    },
  };
}

/* ---------- dates ---------- */

export function isoDay(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return isoDay(new Date(y, m - 1, d + n));
}

export function sortEvents(events: CalEvent[]): CalEvent[] {
  return [...events].sort((a, b) => (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')));
}
