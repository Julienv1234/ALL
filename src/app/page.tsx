'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import CityMap, { type Block } from '@/components/CityMap';
import AskBox from '@/components/AskBox';
import BriefingCard from '@/components/BriefingCard';
import Drafts from '@/components/Drafts';
import { makeBriefing } from '@/lib/briefing';
import TaskDialog from '@/components/TaskDialog';
import { MODULES, TASK_SLOTS, sprite, type ModuleId } from '@/lib/city';
import { isoDay, occurrences, subjectViews } from '@/lib/core';
import { useT, type Key } from '@/lib/i18n';
import { actions, useAll, useReady } from '@/lib/store';
import { toast } from '@/lib/toast';

function greetingKey(h: number): Key {
  if (h < 6) return 'greet.night';
  if (h < 12) return 'greet.morning';
  if (h < 18) return 'greet.afternoon';
  return 'greet.evening';
}

export default function Home() {
  const s = useAll();
  const ready = useReady();
  const { t, lang, locale } = useT();
  const [view, setView] = useState<'kaart' | 'lijst'>('kaart');
  const [selected, setSelected] = useState('hub');
  const [zoom, setZoom] = useState(1);
  const dialog = useRef<HTMLDialogElement>(null);
  // The map is 900 px wide; on a phone the list is easier to start with.
  useEffect(() => {
    if (window.matchMedia('(max-width: 700px)').matches) setView('lijst');
  }, []);

  const today = isoDay();
  const open = s.tasks.filter((x) => !x.done);
  const todayEvents = occurrences(s.events, today, today).map((o) => o.ev);
  const nOpen = open.length;
  const subs = subjectViews(s, today).filter((x) => !x.archived);
  const studyWeek = subs.reduce((a, x) => a + x.week, 0);
  const nextExam = subs.filter((x) => x.daysToExam !== null).sort((a, b) => (a.daysToExam ?? 0) - (b.daysToExam ?? 0))[0];

  const blocks: Block[] = useMemo(() => {
    const status: Partial<Record<ModuleId, string>> = {
      hub: t('mod.status.rest'),
      assistent: s.drafts.length ? `${s.drafts.length} ${lang === 'en' ? (s.drafts.length === 1 ? 'draft' : 'drafts') : (s.drafts.length === 1 ? 'concept' : 'concepten')}` : (lang === 'en' ? 'basics work' : 'basis werkt'),
      briefing: lang === 'en' ? 'today' : 'vandaag',
      agenda: `${todayEvents.length} ${t('mod.status.todayN')}`,
      taken: `${nOpen} ${t('mod.status.open')}`,
      notities: `${s.notes.length} ${s.notes.length === 1 ? t('mod.status.note') : t('mod.status.notes')}`,
      leren: `${studyWeek} ${t('learn.min')} ${lang === 'en' ? 'this week' : 'deze week'}`,
    };
    const mods: Block[] = MODULES.map((m) => {
      const name = t(`mod.${m.id}` as Key);
      const short = m.id === 'notities' ? t('mod.notities.short') : m.id === 'geld' ? (lang === 'en' ? 'Money' : 'Geld') : m.id === 'gezondheid' ? (lang === 'en' ? 'Health' : 'Gezondheid') : name;
      return {
        id: m.id, asset: m.asset, uv: m.uv, name, label: short, isTask: false, dim: !!m.phase,
        status: m.phase ? `${t('common.phase')} ${m.phase}` : status[m.id] ?? '',
      };
    });
    const tasks: Block[] = open.slice(0, TASK_SLOTS.length).map((x, i) => ({
      id: 'task:' + x.id, asset: 'taak', uv: TASK_SLOTS[i], name: x.title, label: x.title, isTask: true, dim: false,
      status: x.project || t('tasks.open'),
    }));
    return [...mods, ...tasks];
  }, [s.notes.length, s.drafts.length, todayEvents.length, nOpen, open, studyWeek, t, lang]);

  const sel = blocks.find((b) => b.id === selected) ?? blocks[0];
  const selModule = MODULES.find((m) => m.id === sel.id);
  const selTask = sel.isTask ? s.tasks.find((x) => 'task:' + x.id === sel.id) : undefined;

  const hour = new Date().getHours();
  const name = s.settings.name.trim();
  const dateText = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const summary = lang === 'en'
    ? `${todayEvents.length === 1 ? 'One event' : todayEvents.length + ' events'} today and ${nOpen === 1 ? 'one open task' : nOpen + ' open tasks'}.`
    : `${todayEvents.length === 1 ? 'Eén afspraak' : todayEvents.length + ' afspraken'} vandaag en ${nOpen === 1 ? 'één open taak' : nOpen + ' open taken'}.`;

  const select = (id: string) => setSelected(id);
  const pickText = (id: ModuleId) => t((id === 'hub' ? 'mod.hub.text' : `mod.${id}.text`) as Key);
  const inspectorText = sel.isTask
    ? [selTask?.project, selTask?.due ? (lang === 'en' ? 'Due ' : 'Deadline ') + new Date(selTask.due + 'T12:00').toLocaleDateString(locale, { day: 'numeric', month: 'long' }) : ''].filter(Boolean).join(' · ') || t('tasks.sub')
    : sel.id === 'agenda' ? (todayEvents.length ? [...todayEvents].sort((a, b) => a.time.localeCompare(b.time)).map((e) => `${e.time || t('agenda.allDay')} ${e.title}`).join(' · ') : t('agenda.none'))
    : sel.id === 'taken' ? (open.length ? open.slice(0, 3).map((x) => x.title).join(' · ') : t('tasks.none'))
    : sel.id === 'briefing' ? makeBriefing(s, today, lang).lines.join(' ')
    : sel.id === 'notities' ? `${s.notes.length} ${s.notes.length === 1 ? t('mod.status.note') : t('mod.status.notes')}, ${s.memories.length} ${lang === 'en' ? (s.memories.length === 1 ? 'memory' : 'memories') : (s.memories.length === 1 ? 'herinnering' : 'herinneringen')}.`
    : sel.id === 'leren' ? (subs.length
      ? [nextExam ? `${nextExam.daysToExam === 0 ? t('learn.examToday') : `${t('brief.exam')} ${nextExam.name} ${t('brief.in')} ${nextExam.daysToExam} ${nextExam.daysToExam === 1 ? t('learn.day') : t('learn.days')}`}.` : '', `${t('brief.study')}: ${studyWeek} ${t('learn.min')}.`].filter(Boolean).join(' ')
      : pickText('leren'))
    : pickText(sel.id as ModuleId);

  const kind = sel.isTask ? (lang === 'en' ? 'Task' : 'Taak')
    : sel.id === 'hub' ? t('mod.hub.kind')
    : selModule?.phase ? t('mod.later')
    : ['assistent', 'briefing', 'onderzoeker'].includes(sel.id) ? t('mod.agent') : t('mod.kind');

  return (
    <main id="inhoud" tabIndex={-1} className="main" aria-busy={!ready}>
      <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px 32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="muted" style={{ fontSize: 13 }}>{dateText.charAt(0).toUpperCase() + dateText.slice(1)}</div>
          <h1 className="h1">{t(greetingKey(hour))}{name ? `, ${name}` : ''}.</h1>
          <p className="muted" style={{ margin: 0 }}>{summary}</p>
        </div>
        <div className="wrap" style={{ alignItems: 'center', gap: 12 }}>
          <div className="glass seg" role="group" aria-label={t('home.view')}>
            <button type="button" className="btn" aria-pressed={view === 'kaart'} onClick={() => setView('kaart')}>{t('home.map')}</button>
            <button type="button" className="btn" aria-pressed={view === 'lijst'} onClick={() => setView('lijst')}>{t('home.list')}</button>
          </div>
          <AskBox />
          <button type="button" className="btn cta" style={{ minHeight: 46 }} onClick={() => dialog.current?.showModal()}>{t('home.addTask')}</button>
        </div>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: '24px 28px' }}>
        <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Drafts />
          <BriefingCard />

          <section className="glass panel" aria-live="polite" style={{ flex: 1 }}>
            <div className="row" style={{ gap: 14 }}>
              <img className="px" src={`/img/stad-${sel.asset}.png`} alt="" width={96} height={92}
                style={{ flex: '0 0 auto', objectFit: 'contain', opacity: sel.dim ? 0.55 : 1 }} />
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div className="faint">{kind}</div>
                <h2 className="h2" style={{ fontSize: 21, overflowWrap: 'anywhere' }}>{sel.name}</h2>
                <div className="ok" style={{ fontSize: 13 }}>{sel.status}</div>
              </div>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>{inspectorText}</p>
            {selModule?.phase && <p className="faint" style={{ margin: 0 }}>{t('later.phase')} {selModule.phase}.</p>}
            <div className="wrap" style={{ marginTop: 'auto' }}>
              {selTask && (
                <button type="button" className="btn cta" onClick={() => {
                  actions.toggleTask(selTask);
                  toast(selTask.done ? t('home.reopen') : (lang === 'en' ? 'Done. The lantern goes out.' : 'Afgevinkt. De lantaarn gaat uit.'));
                  setSelected('taken');
                }}>{selTask.done ? t('home.reopen') : t('home.tick')}</button>
              )}
              {selTask && <Link className="btn" href="/taken/">{t('nav.taken')}</Link>}
              {selModule?.href && <Link className="btn" href={selModule.href}>{t('home.open')} {selModule.id === 'hub' ? t('nav.logboek').toLowerCase() : sel.label.toLowerCase()}</Link>}
            </div>
          </section>
        </div>

        {view === 'kaart' ? (
          <section className="mapbox" aria-label={t('home.city')}>
            <CityMap blocks={blocks} selected={sel.id} onSelect={select} zoom={zoom} setZoom={setZoom} extraTasks={Math.max(0, open.length - TASK_SLOTS.length)} />
          </section>
        ) : (
          <section className="mapbox" aria-label={t('home.list.title')} style={{ padding: 20 }}>
            <h2 className="h2" style={{ marginBottom: 16 }}>{t('home.list.title')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 8 }}>
              {[...blocks, ...open.slice(TASK_SLOTS.length).map((x): Block => ({ id: 'task:' + x.id, asset: 'taak', uv: [0, 0], name: x.title, label: x.title, isTask: true, dim: false, status: x.project || t('tasks.open') }))].map((b) => {
                const m = sprite(b.asset);
                return (
                  <button key={b.id} type="button" className="glass" aria-pressed={b.id === sel.id} onClick={() => select(b.id)}
                    style={{ minHeight: 72, padding: '8px 12px 8px 8px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer', borderColor: b.id === sel.id ? 'var(--accent)' : undefined }}>
                    <img className="px" src={`/img/stad-${b.asset}.png`} alt="" width={64} height={Math.round((64 * m.h) / m.w)} style={{ flex: '0 0 auto', width: 64, height: 56, objectFit: 'contain', opacity: b.dim ? 0.55 : 1 }} />
                    <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{b.name}</span>
                      <span className="faint" style={{ color: 'var(--ink-2)' }}>{b.status}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <TaskDialog ref={dialog} onDone={(id) => setSelected('task:' + id)} />
    </main>
  );
}
