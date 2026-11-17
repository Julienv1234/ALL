'use client';
import { useState } from 'react';
import Icon from '@/components/Icon';
import PageHeader from '@/components/Page';
import { useT } from '@/lib/i18n';
import { actions, lastLogId, useAll } from '@/lib/store';
import { toast } from '@/lib/toast';
import type { Memory } from '@/lib/types';

function MemoryRow({ m }: { m: Memory }) {
  const { t, locale } = useT();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(m.text);
  if (editing) {
    return (
      <form className="list-item" style={{ flexWrap: 'wrap' }} onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        actions.updateMemory({ ...m, text: text.trim() });
        setEditing(false);
      }}>
        <label className="sr-only" htmlFor={'m-' + m.id}>{t('mem.new')}</label>
        <input id={'m-' + m.id} className="input" style={{ flex: '1 1 260px' }} value={text} onChange={(e) => setText(e.target.value)} autoFocus maxLength={500} />
        <button type="submit" className="btn cta">{t('common.save')}</button>
        <button type="button" className="btn" onClick={() => setEditing(false)}>{t('common.cancel')}</button>
      </form>
    );
  }
  return (
    <div className="list-item">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ overflowWrap: 'anywhere' }}>{m.text}</div>
        <div className="faint">{new Date(m.updatedAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
      <button type="button" className="btn ghost icon" aria-label={`${t('common.edit')}: ${m.text}`} onClick={() => { setText(m.text); setEditing(true); }}><Icon name="edit" /></button>
      <button type="button" className="btn ghost icon" aria-label={`${t('common.delete')}: ${m.text}`} onClick={() => { actions.deleteMemory(m); toast(t('toast.deleted'), lastLogId()); }}><Icon name="trash" /></button>
    </div>
  );
}

export default function MemoryPage() {
  const s = useAll();
  const { t } = useT();
  const [text, setText] = useState('');
  const list = [...s.memories].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <main className="main">
      <PageHeader title={t('mem.title')} sub={t('mem.sub')} />
      <form className="glass panel" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; actions.addMemory(text); setText(''); }}>
        <label className="field" htmlFor="mem-new"><span className="h2" style={{ color: 'var(--ink)' }}>{t('mem.new')}</span></label>
        <div className="wrap" style={{ gap: 12 }}>
          <input id="mem-new" className="input" style={{ flex: '1 1 300px' }} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('mem.placeholder')} maxLength={500} />
          <button type="submit" className="btn cta" disabled={!text.trim()}><Icon name="plus" />{t('common.add')}</button>
        </div>
      </form>
      <section className="glass panel" aria-label={t('mem.title')}>
        <div className="divide">
          {list.length ? list.map((m) => <MemoryRow key={m.id} m={m} />) : <p className="muted" style={{ margin: 0 }}>{t('mem.none')}</p>}
        </div>
      </section>
    </main>
  );
}
