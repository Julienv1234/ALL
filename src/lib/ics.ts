/**
 * Calendar files (.ics, iCalendar RFC 5545): read events from Google Calendar, Apple
 * Calendar or Outlook exports, and write ALL's events back out. No account needed.
 * Supports what ALL can show: one-off and all-day events, and daily/weekly/monthly
 * repeats with an end date and skipped dates. Anything else is counted, not guessed.
 */
import { addDays, isoDay, newId, nowIso } from './core';
import type { CalEvent, Repeat } from './types';

export interface IcsResult {
  events: CalEvent[];
  simplified: number; // repeats ALL cannot express exactly; only the first date was kept
  skipped: number; // VEVENTs without a usable start or title
}

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function unescape(v: string): string {
  return v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

/** "20261117", "20261117T090000", "20261117T080000Z" → local date and time. */
function readDate(value: string): { date: string; time: string } | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  if (!m[4]) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: '' };
  if (m[7]) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
    return { date: isoDay(d), time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` };
  }
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` };
}

const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

export function parseIcs(text: string, existingUids: Set<string> = new Set()): IcsResult {
  const out: CalEvent[] = [];
  let simplified = 0;
  let skipped = 0;
  let cur: Record<string, { value: string; params: string }[]> | null = null;

  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') {
      const ev = cur;
      cur = null;
      if (!ev) continue;
      const get = (k: string) => ev[k]?.[0]?.value ?? '';
      const start = readDate(get('DTSTART'));
      const title = unescape(get('SUMMARY')).trim();
      if (!start || !title) { skipped++; continue; }
      const uid = get('UID') || '';
      if (uid && existingUids.has(uid)) continue;
      if (get('RECURRENCE-ID')) { skipped++; continue; } // a moved single happening of a series

      let repeat: Repeat = 'none';
      let until = '';
      let byDays: number[] = [];
      const rule = get('RRULE');
      if (rule) {
        const r = Object.fromEntries(rule.split(';').map((p) => p.split('=') as [string, string]));
        const freq = r.FREQ;
        const interval = Number(r.INTERVAL || '1');
        if (r.UNTIL) until = readDate(r.UNTIL)?.date ?? '';
        if (r.BYDAY) byDays = r.BYDAY.split(',').map((d) => DAYS.indexOf(d.replace(/^[+-]?\d+/, ''))).filter((d) => d >= 0);
        const plainMonthly = freq === 'MONTHLY' && !r.BYDAY && !r.BYSETPOS;
        if (interval === 1 && !r.COUNT && (freq === 'DAILY' || freq === 'WEEKLY' || plainMonthly)) {
          repeat = freq === 'DAILY' ? 'daily' : freq === 'WEEKLY' ? 'weekly' : 'monthly';
        } else if (interval === 1 && r.COUNT && (freq === 'DAILY' || freq === 'WEEKLY')) {
          // "COUNT=n" becomes an end date, which ALL can store
          const n = Math.max(1, Number(r.COUNT));
          if (freq === 'DAILY') {
            repeat = 'daily';
            until = addDays(start.date, n - 1);
          } else if (byDays.length <= 1) {
            repeat = 'weekly';
            until = addDays(start.date, (n - 1) * 7);
          } else {
            repeat = 'weekly';
            const weeks = Math.ceil(n / byDays.length);
            until = addDays(start.date, (weeks - 1) * 7 + 6);
            if (n % byDays.length !== 0) simplified++; // the last week may hold a few extra
          }
        } else {
          simplified++;
        }
      }
      const skip = (ev.EXDATE ?? [])
        .flatMap((x) => x.value.split(','))
        .map((v) => readDate(v)?.date)
        .filter((d): d is string => !!d);
      const base: CalEvent = {
        id: newId(), title, date: start.date, time: start.time, place: unescape(get('LOCATION')).trim(),
        repeat, until, skip, uid, createdAt: nowIso(),
      };
      if (repeat === 'weekly' && byDays.length > 1) {
        // "every Monday and Wednesday" becomes one weekly event per weekday
        const startDay = new Date(start.date + 'T12:00').getDay();
        for (const wd of byDays) {
          const first = addDays(start.date, (wd - startDay + 7) % 7);
          out.push({ ...base, id: newId(), date: first, uid: uid ? `${uid}#${DAYS[wd]}` : '' });
        }
      } else {
        out.push(base);
      }
      continue;
    }
    if (!cur) continue;
    const m = line.match(/^([A-Z-]+)((?:;[^:]*)?):(.*)$/);
    if (!m) continue;
    (cur[m[1]] ??= []).push({ value: m[3], params: m[2] });
  }
  return { events: out, simplified, skipped };
}

function escape(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

/** Lines longer than 75 bytes are folded, as the standard asks. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > (parts.length ? 74 : 75)) { parts.push(cur); cur = ''; }
    cur += ch;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

const compact = (d: string) => d.replace(/-/g, '');

export function toIcs(events: CalEvent[]): string {
  const stamp = nowIso().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ALL//Agenda//NL', 'CALSCALE:GREGORIAN'];
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid || e.id + '@all'}`, `DTSTAMP:${stamp}`);
    if (e.time) {
      const [h, m] = e.time.split(':');
      const endH = String(Math.min(23, Number(h) + 1)).padStart(2, '0');
      lines.push(`DTSTART:${compact(e.date)}T${h}${m}00`, `DTEND:${compact(e.date)}T${endH}${m}00`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compact(e.date)}`, `DTEND;VALUE=DATE:${compact(addDays(e.date, 1))}`);
    }
    lines.push(`SUMMARY:${escape(e.title)}`);
    if (e.place) lines.push(`LOCATION:${escape(e.place)}`);
    if (e.repeat !== 'none') {
      const freq = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY' }[e.repeat];
      lines.push(`RRULE:FREQ=${freq}${e.until ? `;UNTIL=${compact(e.until)}${e.time ? 'T235959' : ''}` : ''}`);
      for (const d of e.skip) lines.push(e.time ? `EXDATE:${compact(d)}T${e.time.replace(':', '')}00` : `EXDATE;VALUE=DATE:${compact(d)}`);
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
