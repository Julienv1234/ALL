/**
 * Turns a short sentence into a draft, without AI. Dutch and English.
 * "afspraak tandarts donderdag om 14:30", "taak naam kiezen morgen #ALL",
 * "onthoud dat ik maandag vrij ben", "noteer ideeën: lantaarn als logo".
 * Returns null when the text reads like a search instead of a command.
 */
import { addDays } from './core';

export type DraftKind = 'task' | 'event' | 'note' | 'memory';

export interface ParsedDraft {
  kind: DraftKind;
  repeat: 'none' | 'daily' | 'weekly' | 'monthly';
  title: string;
  date: string; // task: due date, event: date
  time: string;
  project: string;
  body: string;
}

const WEEKDAYS: Record<string, number> = {
  zondag: 0, maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4, vrijdag: 5, zaterdag: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};
const MONTHS: Record<string, number> = {
  januari: 1, jan: 1, january: 1, februari: 2, feb: 2, february: 2, maart: 3, mrt: 3, march: 3, mar: 3,
  april: 4, apr: 4, mei: 5, may: 5, juni: 6, jun: 6, june: 6, juli: 7, jul: 7, july: 7,
  augustus: 8, aug: 8, august: 8, september: 9, sep: 9, sept: 9, oktober: 10, okt: 10, october: 10, oct: 10,
  november: 11, nov: 11, december: 12, dec: 12,
};

const VERBS: [RegExp, DraftKind][] = [
  [/^(onthoud(?:\s+dat)?|remember(?:\s+that)?)\s*:?\s+/i, 'memory'],
  [/^(notitie|noteer|note(?:\s+down)?)\s*:?\s+/i, 'note'],
  [/^(afspraak|plan|event|agenda)\s*:?\s+/i, 'event'],
  [/^(taak|todo|to-do|task|herinner\s+me(?:\s+eraan)?(?:\s+(?:om|aan))?|remind\s+me(?:\s+to)?)\s*:?\s+/i, 'task'],
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function isoFrom(y: number, m: number, d: number): string | null {
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Finds a date in the text. Returns the date and the text with it removed. */
export function takeDate(text: string, today: string): { date: string; rest: string } {
  const [ty] = today.split('-').map(Number);
  const tries: [RegExp, (m: RegExpMatchArray) => string | null][] = [
    [/\b(?:op\s+|on\s+)?(?:de\s+)?(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/i, (m) => {
      const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : ty;
      const d = isoFrom(y, Number(m[2]), Number(m[1]));
      return d && !m[3] && d < today ? isoFrom(y + 1, Number(m[2]), Number(m[1])) : d;
    }],
    [new RegExp(`\\b(?:op\\s+|on\\s+)?(\\d{1,2})\\s+(${Object.keys(MONTHS).join('|')})\\.?(?:\\s+(\\d{4}))?\\b`, 'i'), (m) => {
      const mo = MONTHS[m[2].toLowerCase()];
      const y = m[3] ? Number(m[3]) : ty;
      const d = isoFrom(y, mo, Number(m[1]));
      return d && !m[3] && d < today ? isoFrom(y + 1, mo, Number(m[1])) : d;
    }],
    [/\b(overmorgen|day after tomorrow)\b/i, () => addDays(today, 2)],
    [/\b(morgen|tomorrow)\b/i, () => addDays(today, 1)],
    [/\b(vandaag|today|vanavond|tonight)\b/i, () => today],
    [/\b(volgende week|next week)\b/i, () => addDays(today, 7)],
    [new RegExp(`\\b(?:op\\s+|on\\s+|volgende\\s+|next\\s+)?(${Object.keys(WEEKDAYS).join('|')})\\b`, 'i'), (m) => {
      const want = WEEKDAYS[m[1].toLowerCase()];
      const [y, mo, d] = today.split('-').map(Number);
      const now = new Date(y, mo - 1, d).getDay();
      const diff = (want - now + 7) % 7 || 7;
      return addDays(today, diff);
    }],
  ];
  for (const [re, f] of tries) {
    const m = text.match(re);
    if (m) {
      const date = f(m);
      if (date) return { date, rest: (text.slice(0, m.index) + ' ' + text.slice(m.index! + m[0].length)).trim() };
    }
  }
  return { date: '', rest: text };
}

/** Finds a clock time in the text ("om 14:30", "15u", "at 3pm"). */
export function takeTime(text: string): { time: string; rest: string } {
  const tries: [RegExp, (m: RegExpMatchArray) => string | null][] = [
    [/\b(?:om\s+|at\s+|van\s+)?(\d{1,2})[:.](\d{2})(?:\s*(?:u|uur|h))?\b/i, (m) => (Number(m[1]) < 24 && Number(m[2]) < 60 ? `${pad(Number(m[1]))}:${m[2]}` : null)],
    [/\b(?:om\s+|at\s+)?(\d{1,2})\s*(am|pm)\b/i, (m) => {
      let h = Number(m[1]) % 12;
      if (m[2].toLowerCase() === 'pm') h += 12;
      return Number(m[1]) <= 12 ? `${pad(h)}:00` : null;
    }],
    [/\b(?:om\s+)?(\d{1,2})\s*(?:u|uur)\b/i, (m) => (Number(m[1]) < 24 ? `${pad(Number(m[1]))}:00` : null)],
    [/\b(?:om|at)\s+(\d{1,2})\b/i, (m) => (Number(m[1]) < 24 ? `${pad(Number(m[1]))}:00` : null)],
  ];
  for (const [re, f] of tries) {
    const m = text.match(re);
    if (m) {
      const time = f(m);
      if (time) return { time, rest: (text.slice(0, m.index) + ' ' + text.slice(m.index! + m[0].length)).trim() };
    }
  }
  return { time: '', rest: text };
}

/** "elke dinsdag", "every week", "dagelijks" … Returns the repeat and the text without it. */
export function takeRepeat(text: string, today: string): { repeat: ParsedDraft['repeat']; date: string; rest: string } {
  const cut = (m: RegExpMatchArray) => (text.slice(0, m.index) + ' ' + text.slice(m.index! + m[0].length)).trim();
  const wd = text.match(new RegExp(`\\b(?:elke|iedere|every)\\s+(${Object.keys(WEEKDAYS).join('|')})\\b`, 'i'));
  if (wd) {
    const want = WEEKDAYS[wd[1].toLowerCase()];
    const [y, mo, d] = today.split('-').map(Number);
    const diff = (want - new Date(y, mo - 1, d).getDay() + 7) % 7;
    return { repeat: 'weekly', date: addDays(today, diff), rest: cut(wd) };
  }
  const tries: [RegExp, ParsedDraft['repeat']][] = [
    [/\b(elke dag|iedere dag|dagelijks|every day|daily)\b/i, 'daily'],
    [/\b(elke week|iedere week|wekelijks|every week|weekly)\b/i, 'weekly'],
    [/\b(elke maand|iedere maand|maandelijks|every month|monthly)\b/i, 'monthly'],
  ];
  for (const [re, repeat] of tries) {
    const m = text.match(re);
    if (m) return { repeat, date: '', rest: cut(m) };
  }
  return { repeat: 'none', date: '', rest: text };
}

function tidy(s: string): string {
  const t = s
    .replace(/\s+/g, ' ')
    .replace(/^[\s,:;-]+|[\s,:;-]+$/g, '')
    .replace(/\s+(om|op|on|at|de|het|een|voor|for)$/i, '')
    .trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

export function parseCommand(input: string, today: string): ParsedDraft | null {
  let text = input.trim();
  if (text.length < 3) return null;

  let kind: DraftKind | null = null;
  for (const [re, k] of VERBS) {
    const m = text.match(re);
    if (m) { kind = k; text = text.slice(m[0].length); break; }
  }

  if (kind === 'memory') {
    const body = tidy(text);
    return body ? { kind, repeat: 'none', title: body, date: '', time: '', project: '', body: '' } : null;
  }
  if (kind === 'note') {
    const i = text.indexOf(':');
    const title = tidy(i > 0 ? text.slice(0, i) : text.slice(0, 60));
    const body = i > 0 ? text.slice(i + 1).trim() : text.length > 60 ? text : '';
    return title ? { kind, repeat: 'none', title, date: '', time: '', project: '', body } : null;
  }

  let project = '';
  const tag = text.match(/(?:^|\s)#([\p{L}\p{N}_-]+)/u);
  if (tag) { project = tag[1]; text = text.replace(tag[0], ' '); }

  // Tasks cannot repeat (yet): then the words stay in the title instead of vanishing.
  const r = kind === 'task' ? { repeat: 'none' as const, date: '', rest: text } : takeRepeat(text, today);
  const t = takeTime(r.rest);
  const d = r.date ? { date: r.date, rest: t.rest } : takeDate(t.rest, today);
  const title = tidy(d.rest);
  if (!title) return null;

  if (!kind) {
    // No command word: only treat it as a command when it names a moment.
    if (!t.time && !d.date && r.repeat === 'none') return null;
    kind = t.time || r.repeat !== 'none' ? 'event' : 'task';
  }
  if (kind === 'event') {
    return { kind, repeat: r.repeat, title, date: d.date || today, time: t.time, project: '', body: '' };
  }
  return { kind: 'task', repeat: 'none', title, date: d.date, time: '', project, body: '' };
}
