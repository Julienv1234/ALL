'use client';
/**
 * Browser storage for ALL. One state object, saved in localStorage and kept in
 * sync across open tabs. Swap this file for Supabase later; the rest of the app
 * only talks to the functions below.
 */
import { useSyncExternalStore } from 'react';
import * as core from './core';
import { parseIcs, toIcs, type IcsResult } from './ics';
import { parseCommand } from './parse';
import { runAgents } from './agents';
import type { Agent, CalEvent, Collection, Draft, Habit, Item, Memory, Note, Project, Rule, Session, Settings, Site, State, Subject, Task } from './types';

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

  addProject(name: string, goal = '', deadline = '') {
    const p = core.makeProject(name, goal, deadline);
    commit(core.createItem(state, 'projects', p, label(`Project gemaakt: ${q(p.name)}`, `Project created: ${q(p.name)}`)));
    return p;
  },
  /** Saves goal, deadline, archived and (if changed) the name. Implicit projects get stored on first edit. */
  saveProject(p: Project, oldName: string): string {
    let s = state;
    let id = p.id;
    if (p.name !== oldName) s = core.renameProject(s, oldName, p.name, label(`Project hernoemd: ${q(oldName)} → ${q(p.name)}`, `Project renamed: ${q(oldName)} → ${q(p.name)}`));
    const stored = s.projects.find((x) => x.id === p.id);
    s = stored
      ? core.updateItem(s, 'projects', p, label(`Project bijgewerkt: ${q(p.name)}`, `Project updated: ${q(p.name)}`))
      : core.createItem(s, 'projects', { ...p, id: (id = core.newId()) }, label(`Project bijgewerkt: ${q(p.name)}`, `Project updated: ${q(p.name)}`));
    commit(s);
    return id;
  },
  deleteProject(p: Project) {
    commit(core.deleteItem(state, 'projects', p.id, label(`Project verwijderd: ${q(p.name)}`, `Project deleted: ${q(p.name)}`)));
  },

  addSubject(name: string, goal = '', exam = '', weeklyMinutes = 0) {
    const x = core.makeSubject(name, goal, exam, weeklyMinutes);
    commit(core.createItem(state, 'subjects', x, label(`Vak toegevoegd: ${q(x.name)}`, `Subject added: ${q(x.name)}`)));
    return x;
  },
  updateSubject(x: Subject) {
    commit(core.updateItem(state, 'subjects', x, label(`Vak bijgewerkt: ${q(x.name)}`, `Subject updated: ${q(x.name)}`)));
  },
  deleteSubject(x: Subject) {
    commit(core.deleteItem(state, 'subjects', x.id, label(`Vak verwijderd: ${q(x.name)}`, `Subject deleted: ${q(x.name)}`)));
  },
  addSession(subjectId: string, minutes: number, date?: string) {
    const sub = state.subjects.find((x) => x.id === subjectId);
    const x = core.makeSession(subjectId, minutes, date);
    commit(core.createItem(state, 'sessions', x, label(`${x.minutes} min gestudeerd: ${q(sub?.name ?? '?')}`, `Studied ${x.minutes} min: ${q(sub?.name ?? '?')}`)));
    return x;
  },
  deleteSession(x: Session) {
    commit(core.deleteItem(state, 'sessions', x.id, label('Studiesessie verwijderd', 'Study session deleted')));
  },

  addHabit(name: string, days: number[] = []) {
    const x = core.makeHabit(name, days);
    commit(core.createItem(state, 'habits', x, label(`Gewoonte toegevoegd: ${q(x.name)}`, `Habit added: ${q(x.name)}`)));
    return x;
  },
  updateHabit(x: Habit) {
    commit(core.updateItem(state, 'habits', x, label(`Gewoonte bijgewerkt: ${q(x.name)}`, `Habit updated: ${q(x.name)}`)));
  },
  toggleHabit(x: Habit, day: string) {
    const next = core.toggleHabitDay(x, day);
    const on = next.done.includes(day);
    commit(core.updateItem(state, 'habits', next, on
      ? label(`Gewoonte gedaan: ${q(x.name)} (${day})`, `Habit done: ${q(x.name)} (${day})`)
      : label(`Gewoonte niet meer afgevinkt: ${q(x.name)} (${day})`, `Habit unchecked: ${q(x.name)} (${day})`)));
  },
  deleteHabit(x: Habit) {
    commit(core.deleteItem(state, 'habits', x.id, label(`Gewoonte verwijderd: ${q(x.name)}`, `Habit deleted: ${q(x.name)}`)));
  },

  addRule(r: Parameters<typeof core.makeRule>[0]) {
    const x = core.makeRule(r);
    commit(core.createItem(state, 'rules', x, label(`Workflow gemaakt: ${q(x.name)}`, `Workflow created: ${q(x.name)}`)));
    return x;
  },
  updateRule(x: Rule) {
    commit(core.updateItem(state, 'rules', x, label(`Workflow bijgewerkt: ${q(x.name)}`, `Workflow updated: ${q(x.name)}`)));
  },
  deleteRule(x: Rule) {
    commit(core.deleteItem(state, 'rules', x.id, label(`Workflow verwijderd: ${q(x.name)}`, `Workflow deleted: ${q(x.name)}`)));
  },
  /** Lets every workflow fire for today. Returns how many drafts or items it made. */
  runRules(): number {
    ensureLoaded();
    const out = core.runRules(state, core.isoDay(), state.settings.lang === 'en');
    if (out.fired) commit(out.state);
    return out.fired;
  },

  /** Lets scheduled agents that need no AI do their daily job. Returns how many ran. */
  runAgents(): number {
    ensureLoaded();
    const out = runAgents(state, new Date(), state.settings.lang);
    if (out.ran) commit(out.state);
    return out.ran;
  },

  addSite(name: string, template: Site['template']) {
    const x = core.makeSite(name, template);
    commit(core.createItem(state, 'sites', x, label(`Website gemaakt: ${q(x.name)}`, `Website created: ${q(x.name)}`)));
    return x;
  },
  updateSite(x: Site) {
    commit(core.updateItem(state, 'sites', { ...x, updatedAt: core.nowIso() }, label(`Website opgeslagen: ${q(x.name)}`, `Website saved: ${q(x.name)}`)));
  },
  deleteSite(x: Site) {
    commit(core.deleteItem(state, 'sites', x.id, label(`Website verwijderd: ${q(x.name)}`, `Website deleted: ${q(x.name)}`)));
  },

  addAgent(a: Parameters<typeof core.makeAgent>[0]) {
    const x = core.makeAgent(a);
    commit(core.createItem(state, 'agents', x, label(`Agent gemaakt: ${q(x.name)}`, `Agent created: ${q(x.name)}`)));
    return x;
  },
  updateAgent(x: Agent) {
    commit(core.updateItem(state, 'agents', x, label(`Agent bijgewerkt: ${q(x.name)}`, `Agent updated: ${q(x.name)}`)));
  },
  deleteAgent(x: Agent) {
    commit(core.deleteItem(state, 'agents', x.id, label(`Agent verwijderd: ${q(x.name)}`, `Agent deleted: ${q(x.name)}`)));
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

  addEvent(title: string, date: string, time = '', place = '', repeat: CalEvent['repeat'] = 'none', until = '') {
    const e = core.makeEvent(title, date, time, place, repeat, until);
    commit(core.createItem(state, 'events', e, label(`Afspraak gepland: ${q(e.title)}`, `Event added: ${q(e.title)}`)));
    return e;
  },
  updateEvent(e: CalEvent) {
    commit(core.updateItem(state, 'events', e, label(`Afspraak gewijzigd: ${q(e.title)}`, `Event edited: ${q(e.title)}`)));
  },
  /** Leaves one date out of a repeating series. */
  skipOccurrence(e: CalEvent, date: string) {
    commit(core.updateItem(state, 'events', { ...e, skip: [...new Set([...e.skip, date])] }, label(`Eén keer overgeslagen: ${q(e.title)} op ${date}`, `Skipped once: ${q(e.title)} on ${date}`)));
  },
  /** Reads a .ics file. Nothing changes until importEvents is called with the result. */
  readIcs(text: string): IcsResult {
    return parseIcs(text, new Set(state.events.map((e) => e.uid).filter(Boolean)));
  },
  importEvents(events: CalEvent[]) {
    commit(core.createMany(state, 'events', events, label(`Agenda geïmporteerd: ${events.length} afspraken`, `Calendar imported: ${events.length} events`)));
  },
  exportIcs(): string {
    return toIcs(state.events);
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

  /** Reads a sentence; when it is a command, adds a draft waiting for approval. */
  propose(text: string): Draft | null {
    const p = parseCommand(text, core.isoDay());
    if (!p) return null;
    const d = core.makeDraft({ ...p, source: text.trim() });
    commit(core.createItem(state, 'drafts', d, label(`Concept klaargezet: ${q(d.title)}`, `Draft prepared: ${q(d.title)}`)));
    return d;
  },
  /** A draft an agent made when you asked it to. Counts as its run for today, so the schedule does not repeat it. */
  agentDraft(a: Agent, d: Draft) {
    const next = core.createItem(state, 'drafts', d, label(`Agent ${q(a.name)} zette klaar: ${q(d.title)}`, `Agent ${q(a.name)} prepared: ${q(d.title)}`));
    commit({ ...next, agents: next.agents.map((x) => (x.id === a.id ? { ...x, lastRun: core.isoDay() } : x)) });
  },
  updateDraft(d: Draft) {
    commit(core.updateItem(state, 'drafts', d, label(`Concept aangepast: ${q(d.title)}`, `Draft edited: ${q(d.title)}`)));
  },
  approveDraft(d: Draft) {
    const nl = { task: 'Taak', event: 'Afspraak', note: 'Notitie', memory: 'Herinnering' }[d.kind];
    const en = { task: 'Task', event: 'Event', note: 'Note', memory: 'Memory' }[d.kind];
    commit(core.approveDraft(state, d.id, (x) => label(`Goedgekeurd: ${nl.toLowerCase()} ${q(x.title)}`, `Approved: ${en.toLowerCase()} ${q(x.title)}`)));
  },
  rejectDraft(d: Draft) {
    commit(core.deleteItem(state, 'drafts', d.id, label(`Concept weggegooid: ${q(d.title)}`, `Draft discarded: ${q(d.title)}`)));
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
