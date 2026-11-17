/** The daily briefing, worked out from your own data. No AI, no network. */
import { addDays, sortEvents } from './core';
import type { Lang, State } from './types';

export interface Briefing {
  lines: string[];
  sources: string[];
}

const list = (xs: string[], lang: Lang) =>
  xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + (lang === 'en' ? ' and ' : ' en ') + xs[xs.length - 1];

export function makeBriefing(s: State, today: string, lang: Lang): Briefing {
  const en = lang === 'en';
  const lines: string[] = [];
  const sources = new Set<string>();
  const evToday = sortEvents(s.events.filter((e) => e.date === today));
  const tomorrow = addDays(today, 1);
  const evTomorrow = sortEvents(s.events.filter((e) => e.date === tomorrow));
  const open = s.tasks.filter((t) => !t.done);
  const late = open.filter((t) => t.due && t.due < today);
  const dueToday = open.filter((t) => t.due === today);
  const at = (e: { time: string; title: string }) => (e.time ? `${e.time} ${e.title}` : e.title);

  if (evToday.length) {
    sources.add(en ? 'your calendar' : 'je agenda');
    lines.push(en
      ? `Today: ${list(evToday.slice(0, 3).map(at), lang)}${evToday.length > 3 ? ` and ${evToday.length - 3} more` : ''}.`
      : `Vandaag: ${list(evToday.slice(0, 3).map(at), lang)}${evToday.length > 3 ? ` en nog ${evToday.length - 3}` : ''}.`);
  } else {
    lines.push(en ? 'Nothing in your calendar today.' : 'Niets in je agenda vandaag.');
  }
  if (late.length) {
    sources.add(en ? 'your tasks' : 'je taken');
    const names = list(late.slice(0, 2).map((t) => `“${t.title}”`), lang);
    lines.push(en
      ? `${late.length === 1 ? 'One task is' : `${late.length} tasks are`} overdue: ${names}${late.length > 2 ? ' …' : ''}.`
      : `${late.length === 1 ? 'Eén taak is' : `${late.length} taken zijn`} te laat: ${names}${late.length > 2 ? ' …' : ''}.`);
  }
  if (dueToday.length) {
    sources.add(en ? 'your tasks' : 'je taken');
    lines.push(en
      ? `Due today: ${list(dueToday.slice(0, 3).map((t) => `“${t.title}”`), lang)}.`
      : `Deadline vandaag: ${list(dueToday.slice(0, 3).map((t) => `“${t.title}”`), lang)}.`);
  }
  if (!late.length && !dueToday.length && open.length) {
    sources.add(en ? 'your tasks' : 'je taken');
    lines.push(en
      ? `${open.length === 1 ? 'One open task' : `${open.length} open tasks`}, none due today.`
      : `${open.length === 1 ? 'Eén open taak' : `${open.length} open taken`}, geen enkele met deadline vandaag.`);
  }
  if (s.drafts.length) {
    lines.push(en
      ? `${s.drafts.length === 1 ? 'One draft waits' : `${s.drafts.length} drafts wait`} for your approval.`
      : `${s.drafts.length === 1 ? 'Eén concept wacht' : `${s.drafts.length} concepten wachten`} op jouw akkoord.`);
  }
  if (evTomorrow.length) {
    sources.add(en ? 'your calendar' : 'je agenda');
    lines.push(en ? `Tomorrow starts with ${at(evTomorrow[0])}.` : `Morgen begint met ${at(evTomorrow[0])}.`);
  }
  return { lines, sources: [...sources] };
}
