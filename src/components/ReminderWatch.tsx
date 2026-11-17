'use client';
import { useEffect } from 'react';
import { addDays, isoDay, occurrences } from '@/lib/core';
import { firstTime, notify, perm } from '@/lib/notify';
import { getState, useReady } from '@/lib/store';

/** Checks every 30 seconds whether a reminder is due. Only does anything when reminders are on and allowed. */
export default function ReminderWatch() {
  const ready = useReady();
  useEffect(() => {
    if (!ready) return;
    const check = () => {
      const s = getState();
      const r = s.settings.remind;
      if (!r.on || perm() !== 'granted') return;
      const en = s.settings.lang === 'en';
      const now = Date.now();
      const today = isoDay();
      for (const { ev, date } of occurrences(s.events, today, addDays(today, 1))) {
        if (!ev.time) continue;
        const start = new Date(`${date}T${ev.time}`).getTime();
        const left = start - now;
        if (left > r.before * 60_000 || left < -5 * 60_000) continue;
        const key = `ev:${ev.id}:${date}`;
        if (!firstTime(key)) continue;
        const mins = Math.max(0, Math.round(left / 60_000));
        const when = mins === 0 ? (en ? 'now' : 'nu') : en ? `in ${mins} min` : `over ${mins} min`;
        notify(ev.title, `${ev.time}${ev.place ? ` · ${ev.place}` : ''} (${when})`, key);
      }
      const hour = new Date().getHours();
      if (r.tasks && hour >= 8 && hour < 21) {
        const due = s.tasks.filter((x) => !x.done && x.due && x.due <= today);
        if (due.length && firstTime(`tasks:${today}`)) {
          const names = due.slice(0, 3).map((x) => x.title).join(', ') + (due.length > 3 ? '…' : '');
          notify(en ? `${due.length} task${due.length === 1 ? '' : 's'} due today` : `${due.length} ${due.length === 1 ? 'taak moet' : 'taken moeten'} vandaag af`, names, `tasks:${today}`);
        }
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [ready]);
  return null;
}
