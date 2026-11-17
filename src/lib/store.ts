'use client';
/**
 * Browser storage for ALL. One state object, saved in localStorage and kept in
 * sync across open tabs. Swap this file for Supabase later; the rest of the app
 * only talks to the functions below.
 */
import { useSyncExternalStore } from 'react';
import * as core from './core';
import type { CalEvent, Collection, Item, Memory, Note, Settings, State, Task } from './types';

const KEY = 'all.v1';
const SERVER = core.emptyState();

let state: State = SERVER;
let loaded = false;
let saveError = false;
const listeners = new Set<() => void>();
const changeListeners = new Set<(s: State) => void>();

function load(): State {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return core.emptyState();
    return core.parseState(JSON.parse(raw)) ?? core.emptyState();
  } catch {
    return core.emptyState();
  }
}

function ensureLoaded() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  state = load();
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    state = load();
    listeners.forEach((l) => l());
  });
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
    saveError = false;
  } catch {
    saveError = true;
  }
}

/** A change made in this app: saved locally and announced to the cloud sync. */
function commit(next: State) {
  if (next === state) return;
  state = next;
  persist();
  listeners.forEach((l) => l());
  changeListeners.forEach((l) => l(state));
}

/** Current state, outside React (used by the cloud sync). */
export const getState = () => {
  ensureLoaded();
  return state;
};

/** Replace everything with data that came from the cloud. Not logged, not echoed back. */
export function replaceFromCloud(next: State) {
  ensureLoaded();
  state = next;
  persist();
  listeners.forEach((l) => l());
}

/** Wipes this device's copy, e.g. after signing out on a shared computer. */
export function clearDevice() {
  state = core.emptyState();
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
  listeners.forEach((l) => l());
}

/** Called after every change made in the app. */
export function onLocalChange(l: (s: State) => void) {
  changeListeners.add(l);
  return () => {
    changeListeners.delete(l);
  };
}

function subscribe(l: () => void) {
  ensureLoaded();
  listeners.add(l);
  return () => listeners.delete(l);
}

function snapshot() {
  ensureLoaded();
  return state;
}

/** The whole state. Before the browser has loaded it, this is an empty state. */
export function useAll(): State {
  return useSyncExternalStore(subscribe, snapshot, () => SERVER);
}

/** False during the first render on the server and before hydration. */
export function useReady(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export const hasSaveError = () => saveError;

const label = (nl: string, en: string) => (state.settings.lang === 'en' ? en : nl);
const q = (s: string) => `“${s}”`;

/* ---------- actions ---------- */

export const actions = {
  addTask(title: string, project = '', due = '') {
    const t = core.makeTask(title, project, due);
    commit(core.createItem(state, 'tasks', t, label(`Taak toegevoegd: ${q(t.title)}`, `Task added: ${q(t.title)}`)));
    return t;
  },
  toggleTask(t: Task) {
    const next: Task = { ...t, done: !t.done, doneAt: t.done ? '' : core.nowIso() };
    commit(core.updateItem(state, 'tasks', next,
      next.done ? label(`Taak afgevinkt: ${q(t.title)}`, `Task done: ${q(t.title)}`) : label(`Taak weer open: ${q(t.title)}`, `Task reopened: ${q(t.title)}`)));
  },
  updateTask(t: Task) {
    commit(core.updateItem(state, 'tasks', t, label(`Taak gewijzigd: ${q(t.title)}`, `Task edited: ${q(t.title)}`)));
  },
  deleteTask(t: Task) {
    commit(core.deleteItem(state, 'tasks', t.id, label(`Taak verwijderd: ${q(t.title)}`, `Task deleted: ${q(t.title)}`)));
  },

  addNote(title: string, body: string) {
    const n = core.makeNote(title, body);
    commit(core.createItem(state, 'notes', n, label(`Notitie gemaakt: ${q(n.title)}`, `Note created: ${q(n.title)}`)));
    return n;
  },
  updateNote(n: Note) {
    commit(core.updateItem(state, 'notes', { ...n, updatedAt: core.nowIso() }, label(`Notitie bewerkt: ${q(n.title)}`, `Note edited: ${q(n.title)}`)));
  },
  deleteNote(n: Note) {
    commit(core.deleteItem(state, 'notes', n.id, label(`Notitie verwijderd: ${q(n.title)}`, `Note deleted: ${q(n.title)}`)));
  },

  addEvent(title: string, date: string, time = '', place = '') {
    const e = core.makeEvent(title, date, time, place);
    commit(core.createItem(state, 'events', e, label(`Afspraak gepland: ${q(e.title)}`, `Event added: ${q(e.title)}`)));
    return e;
  },
  updateEvent(e: CalEvent) {
    commit(core.updateItem(state, 'events', e, label(`Afspraak gewijzigd: ${q(e.title)}`, `Event edited: ${q(e.title)}`)));
  },
  deleteEvent(e: CalEvent) {
    commit(core.deleteItem(state, 'events', e.id, label(`Afspraak verwijderd: ${q(e.title)}`, `Event deleted: ${q(e.title)}`)));
  },

  addMemory(text: string) {
    const m = core.makeMemory(text);
    commit(core.createItem(state, 'memories', m, label('Iets onthouden', 'Remembered something')));
    return m;
  },
  updateMemory(m: Memory) {
    commit(core.updateItem(state, 'memories', { ...m, updatedAt: core.nowIso() }, label('Herinnering aangepast', 'Memory edited')));
  },
  deleteMemory(m: Memory) {
    commit(core.deleteItem(state, 'memories', m.id, label('Herinnering gewist', 'Memory deleted')));
  },

  undo(logId: string) {
    commit(core.undoLog(state, logId, label('Actie teruggedraaid', 'Action undone')));
  },

  setSettings(patch: Partial<Settings>) {
    commit({ ...state, settings: { ...state.settings, ...patch } });
  },

  exportJson(): string {
    return JSON.stringify({ ...state, exportedAt: core.nowIso() }, null, 2);
  },
  /** Replaces everything with the imported data. Returns false if the file is not ALL data. */
  importJson(text: string): boolean {
    let parsed: State | null = null;
    try {
      parsed = core.parseState(JSON.parse(text));
    } catch {
      return false;
    }
    if (!parsed) return false;
    commit({ ...parsed, log: [{ id: core.newId(), at: core.nowIso(), text: label('Back-up teruggezet', 'Backup restored'), collection: 'app' }, ...parsed.log] });
    return true;
  },
  wipe() {
    const lang = state.settings.lang;
    const fresh = core.emptyState();
    commit({ ...fresh, settings: { ...fresh.settings, lang } });
  },
};

export type { Collection, Item };

/** Id of the newest log entry, for an "undo" button right after an action. */
export const lastLogId = (): string | undefined => state.log[0]?.id;
