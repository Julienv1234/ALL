/**
 * Agents: what each one may see, and the one job that already works without AI (the morning briefing).
 * The rest wait for the Claude API in phase 2; this file is where their context will be built.
 */
import { makeBriefing } from './briefing';
import { createItem, isoDay, makeDraft, NO_ACCESS } from './core';
import type { Access, Agent, AgentArea, Lang, State } from './types';

export interface AgentTemplate { id: string; img: string; can: Record<AgentArea, Access>; schedule: string; ai: boolean }

export const TEMPLATES: AgentTemplate[] = [
  { id: 'briefing', img: 'briefing', ai: false, schedule: '07:30', can: { ...NO_ACCESS, tasks: 'read', agenda: 'read', learn: 'read', habits: 'read' } },
  { id: 'coach', img: 'leren', ai: true, schedule: '', can: { ...NO_ACCESS, learn: 'read', agenda: 'read', tasks: 'draft' } },
  { id: 'onderzoeker', img: 'onderzoeker', ai: true, schedule: '', can: { ...NO_ACCESS, notes: 'draft', memory: 'read' } },
  { id: 'leeg', img: 'assistent', ai: true, schedule: '', can: { ...NO_ACCESS } },
];

export const templateOf = (a: Agent) => TEMPLATES.find((x) => x.id === a.template) ?? TEMPLATES[TEMPLATES.length - 1];

/** The state as this agent is allowed to see it: everything it may not read is left out. */
export function visibleTo(s: State, a: Agent): State {
  const ok = (k: AgentArea) => a.can[k] !== 'none';
  return {
    ...s,
    tasks: ok('tasks') ? s.tasks : [],
    projects: ok('tasks') ? s.projects : [],
    events: ok('agenda') ? s.events : [],
    notes: ok('notes') ? s.notes : [],
    memories: ok('memory') ? s.memories : [],
    subjects: ok('learn') ? s.subjects : [],
    sessions: ok('learn') ? s.sessions : [],
    habits: ok('habits') ? s.habits : [],
    drafts: [],
    rules: [],
    sites: [],
    agents: [],
    log: [],
  };
}

export interface ContextArea { area: AgentArea; access: Access; count: number; sample: string[] }

/** What the agent would receive when it runs, per area, plus a rough size in tokens (about 4 characters each). */
export function agentContext(s: State, a: Agent): { areas: ContextArea[]; tokens: number } {
  const v = visibleTo(s, a);
  const rows: Record<AgentArea, string[]> = {
    tasks: v.tasks.filter((x) => !x.done).map((x) => x.title + (x.due ? ` (${x.due})` : '')),
    agenda: v.events.map((x) => `${x.date}${x.time ? ' ' + x.time : ''} ${x.title}`),
    notes: v.notes.map((x) => x.title),
    memory: v.memories.map((x) => x.text),
    learn: v.subjects.filter((x) => !x.archived).map((x) => x.name + (x.exam ? ` (${x.exam})` : '')),
    habits: v.habits.filter((x) => !x.archived).map((x) => x.name),
  };
  const areas = (Object.keys(rows) as AgentArea[])
    .filter((k) => a.can[k] !== 'none')
    .map((k) => ({ area: k, access: a.can[k], count: rows[k].length, sample: rows[k].slice(0, 3) }));
  const chars = a.instructions.length + Object.values(rows).flat().join('\n').length
    + v.notes.reduce((n, x) => n + x.body.length, 0);
  return { areas, tokens: Math.ceil(chars / 4) };
}

/** The briefing this agent would write today, from only what it may read. */
export function agentBriefing(s: State, a: Agent, today: string, lang: Lang): { title: string; body: string } {
  const b = makeBriefing(visibleTo(s, a), today, lang);
  const [y, m, d] = today.split('-');
  const title = `${lang === 'en' ? 'Briefing' : 'Briefing'} ${Number(d)}/${Number(m)}/${y}`;
  const body = [...b.lines.map((l) => `• ${l}`), '', `${lang === 'en' ? 'Sources' : 'Bronnen'}: ${b.sources.join(', ') || '-'}`].join('\n');
  return { title, body };
}

/**
 * Lets scheduled agents that work without AI do their job: once a day, after their time,
 * they put a draft note in Waiting for your approval. Returns the new state and how many ran.
 */
export function runAgents(s: State, now: Date, lang: Lang): { state: State; ran: number } {
  const today = isoDay(now);
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  let next = s;
  let ran = 0;
  for (const a of s.agents) {
    if (!a.enabled || !a.schedule || a.lastRun === today || hhmm < a.schedule || templateOf(a).ai) continue;
    const { title, body } = agentBriefing(next, a, today, lang);
    const d = makeDraft({ kind: 'note', title, date: '', time: '', repeat: 'none', project: '', body, source: `agent:${a.name}` });
    next = createItem(next, 'drafts', d, lang === 'en' ? `Agent "${a.name}" prepared: "${title}"` : `Agent „${a.name}” zette klaar: „${title}”`);
    next = { ...next, agents: next.agents.map((x) => (x.id === a.id ? { ...x, lastRun: today } : x)) };
    ran++;
  }
  return { state: next, ran };
}
