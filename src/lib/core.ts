/**
 * Pure state logic: every change goes through here, gets a log entry and,
 * where possible, a way to undo it. No React and no browser APIs, so it is
 * easy to test.
 */
import type { Access, Agent, AgentArea, CalEvent, Collection, Draft, Habit, Item, LogEntry, Memory, Note, Project, Reminders, Rule, RuleWhen, Session, Site, SiteTemplate, State, Subject, Task, Undo } from './types';

export const LOG_LIMIT = 500;

export function emptyState(): State {
  return {
    v: 1,
    tasks: [],
    notes: [],
    events: [],
    memories: [],
    drafts: [],
    projects: [],
    subjects: [],
    sessions: [],
    habits: [],
    rules: [],
    sites: [],
    agents: [],
    log: [],
    settings: { lang: 'nl', name: '', remind: { ...DEFAULT_REMIND } },
  };
}

export const DEFAULT_REMIND: Reminders = { on: false, before: 15, tasks: true };

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

/** Adds many items at once (an import). One log entry; undo removes them all. */
export function createMany(s: State, c: Collection, items: Item[], label: string): State {
  if (!items.length) return s;
  const next = setList(s, c, [...items, ...list(s, c)]);
  return addLog(next, label, c, { type: 'removeMany', collection: c, ids: items.map((x) => x.id) });
}

export function updateItem(s: State, c: Collection, item: Item, label: string): State {
  const prev = list(s, c).find((x) => x.id === item.id);
  if (!prev) return s;
  // Screens often pass a "view" with extra computed fields (streak, counts...). Store only the real fields.
  const clean = Object.fromEntries(Object.keys(prev).map((k) => [k, (item as unknown as Record<string, unknown>)[k] ?? (prev as unknown as Record<string, unknown>)[k]])) as unknown as Item;
  const next = setList(s, c, list(s, c).map((x) => (x.id === item.id ? clean : x)));
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
  if (u.type === 'removeMany') {
    const gone = new Set(u.ids);
    next = setList(s, u.collection, list(s, u.collection).filter((x) => !gone.has(x.id)));
  } else if (u.type === 'remove') {
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

export function makeEvent(title: string, date: string, time = '', place = '', repeat: CalEvent['repeat'] = 'none', until = ''): CalEvent {
  return { id: newId(), title: title.trim(), date, time, place: place.trim(), repeat, until, skip: [], uid: '', createdAt: nowIso() };
}

export function makeMemory(text: string): Memory {
  const t = nowIso();
  return { id: newId(), text: text.trim(), createdAt: t, updatedAt: t };
}

/* ---------- learning ---------- */

export function makeSubject(name: string, goal = '', exam = '', weeklyMinutes = 0): Subject {
  return { id: newId(), name: name.trim(), goal: goal.trim(), exam, weeklyMinutes: Math.max(0, Math.round(weeklyMinutes)), archived: false, createdAt: nowIso() };
}

export function makeSession(subjectId: string, minutes: number, date = isoDay(), note = ''): Session {
  return { id: newId(), subjectId, date, minutes: Math.max(1, Math.round(minutes)), note: note.trim(), createdAt: nowIso() };
}

/** Monday of the week that holds this day. */
export function weekStart(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return addDays(day, -((new Date(y, m - 1, d).getDay() + 6) % 7));
}

export interface SubjectView extends Subject {
  week: number; // minutes this week
  total: number;
  daysToExam: number | null;
}

export function subjectViews(s: State, today: string): SubjectView[] {
  const mon = weekStart(today);
  const [ty, tm, td] = today.split('-').map(Number);
  return s.subjects.map((sub) => {
    const mine = s.sessions.filter((x) => x.subjectId === sub.id);
    let daysToExam: number | null = null;
    if (sub.exam && sub.exam >= today) {
      const [y, m, d] = sub.exam.split('-').map(Number);
      daysToExam = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
    }
    return {
      ...sub,
      week: mine.filter((x) => x.date >= mon && x.date <= today).reduce((a, x) => a + x.minutes, 0),
      total: mine.reduce((a, x) => a + x.minutes, 0),
      daysToExam,
    };
  }).sort((a, b) => (a.daysToExam ?? 9999) - (b.daysToExam ?? 9999) || a.name.localeCompare(b.name));
}

/** Minutes studied on each of the last n days, oldest first. */
export function minutesPerDay(s: State, today: string, n = 7): { date: string; minutes: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(today, i - n + 1);
    return { date, minutes: s.sessions.filter((x) => x.date === date).reduce((a, x) => a + x.minutes, 0) };
  });
}

/** Days in a row, ending today or yesterday, with at least one session. */
export function streak(s: State, today: string): number {
  const days = new Set(s.sessions.map((x) => x.date));
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

/* ---------- habits ---------- */

/** Weekday of a YYYY-MM-DD day, 0 = Monday ... 6 = Sunday. */
export function weekday(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

export function makeHabit(name: string, days: number[] = []): Habit {
  const clean = [...new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  return { id: newId(), name: name.trim(), days: clean.length === 7 ? [] : clean, done: [], archived: false, createdAt: nowIso() };
}

export const plannedOn = (h: Habit, day: string) => h.days.length === 0 || h.days.includes(weekday(day));

/** Toggles one day; returns the new habit. */
export function toggleHabitDay(h: Habit, day: string): Habit {
  const done = h.done.includes(day) ? h.done.filter((d) => d !== day) : [day, ...h.done].sort().reverse().slice(0, 800);
  return { ...h, done };
}

export interface HabitView extends Habit {
  today: boolean; // planned today
  doneToday: boolean;
  streak: number; // planned days in a row that were done
  last7: { date: string; planned: boolean; done: boolean }[];
  rate: number; // percent of planned days done in the last 28 days (or since it started)
}

export function habitViews(s: State, today: string): HabitView[] {
  return s.habits.map((h) => {
    const done = new Set(h.done);
    const start = h.createdAt.slice(0, 10) <= today ? isoDay(new Date(h.createdAt)) : today;
    // A planned day that is not done yet today does not break the streak.
    let d = plannedOn(h, today) && !done.has(today) ? addDays(today, -1) : today;
    let streak = 0;
    for (let i = 0; i < 800; i++) {
      if (plannedOn(h, d)) {
        if (done.has(d)) streak++;
        else break;
      } else if (d < start && !done.has(d)) break;
      d = addDays(d, -1);
    }
    let planned = 0;
    let hit = 0;
    for (let i = 0; i < 28; i++) {
      const day = addDays(today, -i);
      if (day < start && !done.has(day)) break;
      if (!plannedOn(h, day)) continue;
      if (day === today && !done.has(day)) continue;
      planned++;
      if (done.has(day)) hit++;
    }
    return {
      ...h,
      today: plannedOn(h, today),
      doneToday: done.has(today),
      streak,
      last7: Array.from({ length: 7 }, (_, i) => {
        const date = addDays(today, i - 6);
        return { date, planned: plannedOn(h, date), done: done.has(date) };
      }),
      rate: planned ? Math.round((hit / planned) * 100) : 0,
    };
  });
}

/* ---------- workflow rules (no AI) ---------- */

export function makeRule(r: Omit<Rule, 'id' | 'runs' | 'createdAt' | 'enabled'> & { enabled?: boolean }): Rule {
  return { ...r, name: r.name.trim(), title: r.title.trim(), project: r.project.trim(), enabled: r.enabled ?? true, id: newId(), runs: [], createdAt: nowIso() };
}

export interface RuleHit { key: string; date: string; vars: Record<string, string> }

/** The moments this rule should fire for today that it has not fired for yet. */
export function ruleHits(r: Rule, s: State, today: string): RuleHit[] {
  if (!r.enabled) return [];
  const created = isoDay(new Date(r.createdAt));
  const fresh = (h: RuleHit) => !r.runs.includes(h.key) && h.date >= created;
  const w = r.when;
  let hits: RuleHit[] = [];
  if (w.type === 'daily') hits = [{ key: today, date: today, vars: {} }];
  else if (w.type === 'weekly') {
    const date = addDays(today, -((weekday(today) - w.weekday + 7) % 7));
    hits = [{ key: date, date, vars: {} }];
  } else if (w.type === 'monthly') {
    const [y, m, d] = today.split('-').map(Number);
    const day = Math.min(28, Math.max(1, w.day));
    const date = d >= day ? `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}` : isoDay(new Date(y, m - 2, day));
    hits = [{ key: date, date, vars: {} }];
  } else if (w.type === 'examSoon') {
    hits = subjectViews(s, today)
      .filter((x) => !x.archived && x.daysToExam !== null && x.daysToExam <= w.days)
      .map((x) => ({ key: `exam:${x.id}:${x.exam}`, date: today, vars: { vak: x.name, examen: x.exam } }));
    return hits.filter((h) => !r.runs.includes(h.key));
  }
  return hits.filter(fresh);
}

export function fillTemplate(t: string, h: RuleHit): string {
  const [, m, d] = (h.vars.examen || h.date).split('-');
  return t
    .replace(/\{vak\}/gi, h.vars.vak ?? '')
    .replace(/\{datum\}/gi, `${Number(d)}/${Number(m)}`)
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Runs every enabled rule once for today. Each firing makes a draft (or, if the rule says so,
 * the task or note itself) with its own log entry, so it can be undone. Never fires twice for the same moment.
 */
export function runRules(s: State, today: string, en = false): { state: State; fired: number } {
  let next = s;
  let fired = 0;
  for (const rule of s.rules) {
    const hits = ruleHits(rule, next, today);
    if (!hits.length) continue;
    for (const h of hits) {
      const title = fillTemplate(rule.title, h) || rule.name;
      const due = rule.kind === 'task' && rule.dueIn >= 0 ? addDays(h.date, rule.dueIn) : '';
      const why = en ? `Workflow "${rule.name}"` : `Workflow „${rule.name}”`;
      if (rule.direct) {
        next = rule.kind === 'task'
          ? createItem(next, 'tasks', makeTask(title, rule.project, due), en ? `${why} added task: "${title}"` : `${why} voegde taak toe: „${title}”`)
          : createItem(next, 'notes', makeNote(title, ''), en ? `${why} added note: "${title}"` : `${why} maakte notitie: „${title}”`);
      } else {
        const d = makeDraft({ kind: rule.kind, title, date: due, time: '', repeat: 'none', project: rule.project, body: '', source: `workflow:${rule.name}` });
        next = createItem(next, 'drafts', d, en ? `${why} proposed: "${title}"` : `${why} stelde voor: „${title}”`);
      }
      fired++;
    }
    const runs = [...hits.map((h) => h.key), ...rule.runs].slice(0, 60);
    next = { ...next, rules: next.rules.map((x) => (x.id === rule.id ? { ...x, runs } : x)) };
  }
  return { state: next, fired };
}

/* ---------- websites ---------- */

export function makeSite(name: string, template: SiteTemplate = 'neon'): Site {
  const t = nowIso();
  return {
    id: newId(), name: name.trim(), template, accent: template === 'neon' ? '#FF4D6D' : template === 'licht' ? '#2F6FEB' : '#D7263D',
    title: name.trim(), tagline: '', about: '', sections: [], links: [], footer: '', createdAt: t, updatedAt: t,
  };
}

/* ---------- agents ---------- */

export const AGENT_AREAS: AgentArea[] = ['tasks', 'agenda', 'notes', 'memory', 'learn', 'habits'];
export const NO_ACCESS: Record<AgentArea, Access> = { tasks: 'none', agenda: 'none', notes: 'none', memory: 'none', learn: 'none', habits: 'none' };

export function makeAgent(a: Partial<Agent> & { name: string }): Agent {
  return {
    id: newId(), name: a.name.trim(), template: a.template ?? 'leeg', instructions: (a.instructions ?? '').trim(),
    can: { ...NO_ACCESS, ...(a.can ?? {}) }, schedule: a.schedule ?? '', enabled: a.enabled ?? true, lastRun: '', createdAt: nowIso(),
  };
}

/* ---------- projects ---------- */

export function makeProject(name: string, goal = '', deadline = ''): Project {
  return { id: newId(), name: name.trim(), goal: goal.trim(), deadline, archived: false, createdAt: nowIso() };
}

export interface ProjectView extends Project {
  open: number;
  done: number;
  next: Task | undefined;
  implicit: boolean; // only exists because a task carries its name
}

const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/** Every project: the ones you made, plus names used on tasks. Sorted: deadline first, then name. */
export function projectViews(s: State): ProjectView[] {
  const metas: Project[] = [...s.projects];
  for (const t of s.tasks) {
    if (t.project && !metas.some((p) => sameName(p.name, t.project))) {
      metas.push({ id: 'name:' + t.project.toLocaleLowerCase(), name: t.project, goal: '', deadline: '', archived: false, createdAt: t.createdAt });
    }
  }
  return metas
    .map((p) => {
      const ts = s.tasks.filter((t) => sameName(t.project, p.name));
      const open = ts.filter((t) => !t.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
      return { ...p, open: open.length, done: ts.length - open.length, next: open[0], implicit: p.id.startsWith('name:') };
    })
    .sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999') || a.name.localeCompare(b.name));
}

/** Renames a project and moves its tasks along. Logged, without an undo button. */
export function renameProject(s: State, oldName: string, newName: string, label: string): State {
  const n = newName.trim();
  if (!n || oldName === n) return s;
  const tasks = s.tasks.map((t) => (sameName(t.project, oldName) ? { ...t, project: n } : t));
  const exists = s.projects.some((p) => sameName(p.name, oldName));
  const projects = exists
    ? s.projects.map((p) => (sameName(p.name, oldName) ? { ...p, name: n } : p))
    : s.projects;
  return addLog({ ...s, tasks, projects }, label, 'projects');
}

/* ---------- drafts ---------- */

export function makeDraft(d: Omit<Draft, 'id' | 'createdAt'>): Draft {
  return { ...d, id: newId(), createdAt: nowIso() };
}

/** Turns an approved draft into the real thing. One log entry; undo removes the created item. */
export function approveDraft(s: State, draftId: string, label: (d: Draft) => string): State {
  const d = s.drafts.find((x) => x.id === draftId);
  if (!d) return s;
  const without: State = { ...s, drafts: s.drafts.filter((x) => x.id !== draftId) };
  if (d.kind === 'task') return createItem(without, 'tasks', makeTask(d.title, d.project, d.date), label(d));
  if (d.kind === 'event') return createItem(without, 'events', makeEvent(d.title, d.date, d.time, '', d.repeat), label(d));
  if (d.kind === 'note') return createItem(without, 'notes', makeNote(d.title, d.body), label(d));
  return createItem(without, 'memories', makeMemory(d.title), label(d));
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
  const repeat = x.repeat === 'daily' || x.repeat === 'weekly' || x.repeat === 'monthly' ? x.repeat : 'none';
  return {
    id: x.id, title: x.title, date: x.date, time: isStr(x.time) ? x.time : '', place: isStr(x.place) ? x.place : '',
    repeat, until: isStr(x.until) ? x.until : '', skip: Array.isArray(x.skip) ? x.skip.filter(isStr) : [],
    uid: isStr(x.uid) ? x.uid : '', createdAt: isStr(x.createdAt) ? x.createdAt : nowIso(),
  };
}
function cleanMemory(x: unknown): Memory | null {
  if (!isObj(x) || !isStr(x.id) || !isStr(x.text)) return null;
  const t = isStr(x.createdAt) ? x.createdAt : nowIso();
  return { id: x.id, text: x.text, createdAt: t, updatedAt: isStr(x.updatedAt) ? x.updatedAt : t };
}

function cleanSubject(x: unknown): Subject | null {
  if (!isObj(x) || !isStr(x.id) || !isStr(x.name) || !x.name.trim()) return null;
  const wm = typeof x.weeklyMinutes === 'number' && isFinite(x.weeklyMinutes) ? Math.max(0, Math.round(x.weeklyMinutes)) : 0;
  return {
    id: x.id, name: x.name, goal: isStr(x.goal) ? x.goal : '', exam: isStr(x.exam) ? x.exam : '', weeklyMinutes: wm,
    archived: x.archived === true, createdAt: isStr(x.createdAt) ? x.createdAt : nowIso(),
  };
}

function cleanSession(x: unknown): Session | null {
  if (!isObj(x) || !isStr(x.id) || !isStr(x.subjectId) || !isStr(x.date) || typeof x.minutes !== 'number' || !(x.minutes > 0)) return null;
  return { id: x.id, subjectId: x.subjectId, date: x.date, minutes: Math.round(x.minutes), note: isStr(x.note) ? x.note : '', createdAt: isStr(x.createdAt) ? x.createdAt : nowIso() };
}

function cleanProject(x: unknown): Project | null {
  if (!isObj(x) || !isStr(x.id) || !isStr(x.name) || !x.name.trim()) return null;
  return {
    id: x.id, name: x.name, goal: isStr(x.goal) ? x.goal : '', deadline: isStr(x.deadline) ? x.deadline : '',
    archived: x.archived === true, createdAt: isStr(x.createdAt) ? x.createdAt : nowIso(),
  };
}

function cleanDraft(x: unknown): Draft | null {
  if (!isObj(x) || !isStr(x.id) || !isStr(x.title)) return null;
  const kind = x.kind === 'task' || x.kind === 'event' || x.kind === 'note' || x.kind === 'memory' ? x.kind : null;
  if (!kind) return null;
  const str = (v: unknown) => (isStr(v) ? v : '');
  return {
    id: x.id, kind, title: x.title, date: str(x.date), time: str(x.time), project: str(x.project), body: str(x.body),
    repeat: x.repeat === 'daily' || x.repeat === 'weekly' || x.repeat === 'monthly' ? x.repeat : 'none',
    source: str(x.source), createdAt: isStr(x.createdAt) ? x.createdAt : nowIso(),
  };
}

const isNum = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function cleanHabit(x: unknown): Habit | null {
  if (!isObj(x) || !isStr(x.id) || !isStr(x.name) || !x.name.trim()) return null;
  const days = Array.isArray(x.days) ? [...new Set(x.days.filter((d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6))].sort() : [];
  return {
    id: x.id, name: x.name, days: days.length === 7 ? [] : days,
    done: Array.isArray(x.done) ? [...new Set(x.done.filter((d): d is string => isStr(d) && DAY.test(d)))].sort().reverse().slice(0, 800) : [],
    archived: x.archived === true, createdAt: isStr(x.createdAt) ? x.createdAt : nowIso(),
  };
}

function cleanWhen(w: unknown): RuleWhen | null {
  if (!isObj(w)) return null;
  if (w.type === 'daily') return { type: 'daily' };
  if (w.type === 'weekly' && Number.isInteger(w.weekday) && (w.weekday as number) >= 0 && (w.weekday as number) <= 6) return { type: 'weekly', weekday: w.weekday as number };
  if (w.type === 'monthly' && Number.isInteger(w.day)) return { type: 'monthly', day: Math.min(28, Math.max(1, w.day as number)) };
  if (w.type === 'examSoon' && Number.isInteger(w.days)) return { type: 'examSoon', days: Math.min(60, Math.max(0, w.days as number)) };
  return null;
}

function cleanRule(x: unknown): Rule | null {
  if (!isObj(x) || !isStr(x.id) || !isStr(x.name) || !isStr(x.title)) return null;
  const when = cleanWhen(x.when);
  if (!when) return null;
  return {
    id: x.id, name: x.name, when, kind: x.kind === 'note' ? 'note' : 'task', title: x.title, project: isStr(x.project) ? x.project : '',
    dueIn: Number.isInteger(x.dueIn) ? Math.min(365, Math.max(-1, x.dueIn as number)) : -1,
    direct: x.direct === true, enabled: x.enabled !== false,
    runs: Array.isArray(x.runs) ? x.runs.filter(isStr).slice(0, 60) : [], createdAt: isStr(x.createdAt) ? x.createdAt : nowIso(),
  };
}

const HEX = /^#[0-9a-fA-F]{6}$/;
function cleanSite(x: unknown): Site | null {
  if (!isObj(x) || !isStr(x.id) || !isStr(x.name)) return null;
  const str = (v: unknown, max = 4000) => (isStr(v) ? v.slice(0, max) : '');
  const t = isStr(x.createdAt) ? x.createdAt : nowIso();
  return {
    id: x.id, name: str(x.name, 80), template: x.template === 'licht' || x.template === 'krant' ? x.template : 'neon',
    accent: isStr(x.accent) && HEX.test(x.accent) ? x.accent : '#FF4D6D',
    title: str(x.title, 120), tagline: str(x.tagline, 200), about: str(x.about),
    sections: Array.isArray(x.sections) ? x.sections.filter(isObj).slice(0, 12).map((q) => ({ heading: str(q.heading, 120), text: str(q.text) })) : [],
    links: Array.isArray(x.links) ? x.links.filter(isObj).slice(0, 12).map((q) => ({ label: str(q.label, 80), url: str(q.url, 500) })) : [],
    footer: str(x.footer, 200), createdAt: t, updatedAt: isStr(x.updatedAt) ? x.updatedAt : t,
  };
}

function cleanAgent(x: unknown): Agent | null {
  if (!isObj(x) || !isStr(x.id) || !isStr(x.name) || !x.name.trim()) return null;
  const can = { ...NO_ACCESS };
  if (isObj(x.can)) for (const k of AGENT_AREAS) { const v = x.can[k]; if (v === 'read' || v === 'draft') can[k] = v; }
  return {
    id: x.id, name: x.name.slice(0, 60), template: isStr(x.template) ? x.template : 'leeg', instructions: isStr(x.instructions) ? x.instructions.slice(0, 4000) : '',
    can, schedule: isStr(x.schedule) && /^\d{2}:\d{2}$/.test(x.schedule) ? x.schedule : '', enabled: x.enabled !== false,
    lastRun: isStr(x.lastRun) && DAY.test(x.lastRun) ? x.lastRun : '', createdAt: isStr(x.createdAt) ? x.createdAt : nowIso(),
  };
}

function cleanRemind(x: unknown): Reminders {
  if (!isObj(x)) return { ...DEFAULT_REMIND };
  return {
    on: x.on === true,
    before: isNum(x.before) && [0, 5, 10, 15, 30, 60].includes(x.before) ? x.before : DEFAULT_REMIND.before,
    tasks: x.tasks !== false,
  };
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
    drafts: cleanList(raw.drafts, cleanDraft),
    projects: cleanList(raw.projects, cleanProject),
    subjects: cleanList(raw.subjects, cleanSubject),
    sessions: cleanList(raw.sessions, cleanSession),
    habits: cleanList(raw.habits, cleanHabit),
    rules: cleanList(raw.rules, cleanRule),
    sites: cleanList(raw.sites, cleanSite),
    agents: cleanList(raw.agents, cleanAgent),
    log,
    settings: {
      lang: st.lang === 'en' ? 'en' : base.settings.lang,
      name: isStr(st.name) ? st.name.slice(0, 60) : '',
      remind: cleanRemind(st.remind),
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

/** One happening of an event: the event itself plus the date it falls on. */
export interface Occurrence {
  ev: CalEvent;
  date: string;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

/** Every happening between from and to (inclusive), sorted by date and time. */
export function occurrences(events: CalEvent[], from: string, to: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (const ev of events) {
    const end = ev.until && ev.until < to ? ev.until : to;
    const skip = new Set(ev.skip);
    const add = (d: string) => { if (d >= from && d <= end && !skip.has(d)) out.push({ ev, date: d }); };
    if (ev.repeat === 'none') { add(ev.date); continue; }
    if (ev.date > end) continue;
    if (ev.repeat === 'daily' || ev.repeat === 'weekly') {
      const step = ev.repeat === 'daily' ? 1 : 7;
      // jump straight to the first date at or after "from"
      const [y, m, d] = ev.date.split('-').map(Number);
      const [fy, fm, fd] = from.split('-').map(Number);
      const gap = Math.round((Date.UTC(fy, fm - 1, fd) - Date.UTC(y, m - 1, d)) / 86400000);
      let k = gap > 0 ? Math.ceil(gap / step) : 0;
      for (let cur = addDays(ev.date, k * step); cur <= end; k++, cur = addDays(ev.date, k * step)) add(cur);
    } else {
      const [y, m, d] = ev.date.split('-').map(Number);
      for (let i = 0; i < 1200; i++) {
        const yy = y + Math.floor((m - 1 + i) / 12);
        const mm = ((m - 1 + i) % 12) + 1;
        if (d > daysInMonth(yy, mm)) continue; // the 31st only in months that have one
        const cur = `${yy}-${String(mm).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (cur > end) break;
        add(cur);
      }
    }
  }
  return out.sort((a, b) => (a.date + (a.ev.time || '00:00')).localeCompare(b.date + (b.ev.time || '00:00')));
}

export function sortEvents(events: CalEvent[]): CalEvent[] {
  return [...events].sort((a, b) => (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')));
}

/* ---------- cloud sync decisions ---------- */

export function itemCount(s: State): number {
  return s.tasks.length + s.notes.length + s.events.length + s.memories.length + s.subjects.length + s.sessions.length + s.projects.length
    + s.habits.length + s.rules.length + s.sites.length + s.agents.length;
}

export type FirstSync = 'upload' | 'download' | 'ask' | 'none';

/**
 * What to do the first time this device meets the cloud copy.
 * Never throws away data silently: when both sides hold items, the person chooses.
 */
export function firstSync(local: State, cloud: State | null): FirstSync {
  const l = itemCount(local);
  if (!cloud) return 'upload';
  const c = itemCount(cloud);
  if (l === 0 && c === 0) return 'none';
  if (l === 0) return 'download';
  if (c === 0) return 'upload';
  if (JSON.stringify({ ...local, log: [] }) === JSON.stringify({ ...cloud, log: [] })) return 'none';
  return 'ask';
}
