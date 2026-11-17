'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { actions, useAll, useReady } from '@/lib/store';
import { fmt, remainingMs, timer, useTimer } from '@/lib/timer';
import { toast } from '@/lib/toast';
import { firstTime, notify } from '@/lib/notify';

/**
 * Lives on every page: saves the session when the focus timer runs out, wherever you are,
 * shows the time in the tab title, and a small pill outside the Learning page.
 */
export default function TimerWatch() {
  const { t: tt, now } = useTimer();
  const s = useAll();
  const ready = useReady();
  const { t } = useT();
  const path = usePathname() || '';
  const left = tt ? remainingMs(tt, now || Date.now()) : 0;
  const subject = tt ? s.subjects.find((x) => x.id === tt.subjectId) : undefined;

  useEffect(() => {
    // Wait until saved data is loaded, or a finished session could miss its subject.
    if (!ready || !tt || left > 0) return;
    const done = timer.stop();
    if (done && s.subjects.some((x) => x.id === done.subjectId)) {
      actions.addSession(done.subjectId, done.minutes, done.date);
      toast(t('learn.done'));
      const name = s.subjects.find((x) => x.id === done.subjectId)?.name ?? '';
      const key = `timer:${done.subjectId}:${Date.now() - (Date.now() % 60_000)}`;
      if (s.settings.remind.on && firstTime(key)) notify(t('learn.doneTitle'), `${done.minutes} ${t('learn.min')} ${name}`, key);
    }
  }, [ready, tt, left, s.subjects, s.settings.remind.on, t]);

  useEffect(() => {
    if (!tt) { document.title = 'ALL'; return; }
    document.title = `${fmt(left)} ${subject?.name ?? ''} · ALL`;
  }, [tt, left, subject]);

  if (!tt || path.startsWith('/leren')) return null;
  return (
    <aside aria-label={t('learn.timer')} className="timer-pill">
    <Link href="/leren/" className="glass"
      style={{ padding: '8px 14px', borderRadius: 999, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, borderColor: 'color-mix(in srgb, var(--accent) 60%, white)' }}>
      <span className="sr-only">{t('learn.timer')}: </span>
      <span className="pixel" style={{ fontSize: 18, color: tt.pausedAt ? 'var(--ink-2)' : 'var(--accent)' }}>{fmt(left)}</span>
      <span className="muted" style={{ fontSize: 13 }}>{subject?.name}{tt.pausedAt ? ` · ${t('learn.pause')}` : ''}</span>
    </Link>
    </aside>
  );
}
