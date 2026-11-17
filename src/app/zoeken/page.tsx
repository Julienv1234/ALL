'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import PageHeader from '@/components/Page';
import { useT } from '@/lib/i18n';
import { useAll } from '@/lib/store';

function Results() {
  const s = useAll();
  const { t } = useT();
  const q = (useSearchParams().get('q') || '').trim();
  const f = q.toLowerCase();
  const hit = (...xs: string[]) => xs.some((x) => x.toLowerCase().includes(f));
  const groups = f ? [
    { title: t('nav.taken'), href: '/taken/', items: s.tasks.filter((x) => hit(x.title, x.project)).map((x) => ({ id: x.id, text: x.title, sub: x.project })) },
    { title: t('nav.notities'), href: '/notities/', items: s.notes.filter((x) => hit(x.title, x.body)).map((x) => ({ id: x.id, text: x.title, sub: x.body.slice(0, 80) })) },
    { title: t('nav.agenda'), href: '/agenda/', items: s.events.filter((x) => hit(x.title, x.place)).map((x) => ({ id: x.id, text: x.title, sub: `${x.date} ${x.time}` })) },
    { title: t('nav.geheugen'), href: '/geheugen/', items: s.memories.filter((x) => hit(x.text)).map((x) => ({ id: x.id, text: x.text, sub: '' })) },
  ].filter((g) => g.items.length) : [];

  return (
    <main id="inhoud" tabIndex={-1} className="main">
      <PageHeader title={t('search.title')} sub={q ? `“${q}”` : t('search.empty')} />
      {q && groups.length === 0 && <section className="glass panel"><p className="muted" style={{ margin: 0 }}>{t('search.none')} “{q}”.</p></section>}
      {groups.map((g) => (
        <section key={g.title} className="glass panel" aria-label={g.title}>
          <h2 className="h2">{g.title} · {g.items.length}</h2>
          <div className="divide">
            {g.items.map((it) => (
              <Link key={it.id} href={g.href} className="list-item" style={{ textDecoration: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <span style={{ overflowWrap: 'anywhere' }}>{it.text}</span>
                {it.sub && <span className="faint">{it.sub}</span>}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<main id="inhoud" tabIndex={-1} className="main" />}><Results /></Suspense>;
}
