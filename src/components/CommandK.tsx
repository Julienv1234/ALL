'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { isoDay } from '@/lib/core';
import { useT } from '@/lib/i18n';
import { NAV } from '@/lib/nav';
import { parseCommand } from '@/lib/parse';
import { actions, useAll } from '@/lib/store';
import { toast } from '@/lib/toast';
import Icon from './Icon';

interface Cmd { id: string; group: string; label: string; hint?: string; run: () => void }

const typing = (el: EventTarget | null) => {
  const e = el as HTMLElement | null;
  return !!e && (e.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.tagName));
};

export const openTour = () => window.dispatchEvent(new Event('all:tour'));

/**
 * Command window: Ctrl+K (or Cmd+K, or /) opens it. Type to go anywhere, find anything,
 * or turn a sentence into a draft. Also handles the g + letter shortcuts and ? for help.
 */
export default function CommandK() {
  const s = useAll();
  const { t, lang } = useT();
  const router = useRouter();
  const dlg = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const helpBtn = useRef<HTMLButtonElement>(null);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [help, setHelp] = useState(false);
  const [isOpen, setOpen] = useState(false);

  const open = (showHelp = false) => {
    setHelp(showHelp);
    setQ('');
    setActive(0);
    setOpen(true);
    if (!dlg.current?.open) dlg.current?.showModal();
    setTimeout(() => (showHelp ? helpBtn.current : input.current)?.focus(), 0);
  };
  const close = () => dlg.current?.close();
  const go = (href: string) => { close(); router.push(href); };

  useEffect(() => {
    let g = 0;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (dlg.current?.open) close(); else open(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || dlg.current?.open || document.querySelector('dialog[open]')) return;
      if (e.key === '/') { e.preventDefault(); open(); return; }
      if (e.key === '?') { e.preventDefault(); open(true); return; }
      if (e.key === 'g') { g = Date.now(); return; }
      if (g && Date.now() - g < 1200) {
        const item = NAV.find((n) => n.shortcut === e.key.toLowerCase());
        g = 0;
        if (item) { e.preventDefault(); router.push(item.href); }
      }
    };
    window.addEventListener('keydown', onKey);
    const onOpen = () => open();
    window.addEventListener('all:command', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('all:command', onOpen); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const cmds = useMemo<Cmd[]>(() => {
    const text = q.trim();
    const low = text.toLowerCase();
    const has = (x: string) => x.toLowerCase().includes(low);
    const out: Cmd[] = [];
    if (text) {
      const p = parseCommand(text, isoDay());
      if (p) {
        out.push({ id: 'draft', group: t('cmd.g.ask'), label: `${t('cmd.makeDraft')}: ${p.title}`, hint: t(`draft.${p.kind}` as never), run: () => {
          actions.propose(text); toast(t('draft.made')); go('/');
        } });
      }
    }
    const pages = NAV.filter((n) => !low || has(t(n.key)) || has(n.href)).map<Cmd>((n) => ({
      id: 'nav' + n.href, group: t('cmd.g.go'), label: t(n.key), hint: `g ${n.shortcut}`, run: () => go(n.href),
    }));
    out.push(...pages);
    const acts: Cmd[] = [
      { id: 'a-task', group: t('cmd.g.do'), label: t('cmd.newTask'), run: () => go('/taken/#nieuw') },
      { id: 'a-note', group: t('cmd.g.do'), label: t('cmd.newNote'), run: () => go('/notities/#nieuw') },
      { id: 'a-timer', group: t('cmd.g.do'), label: t('cmd.timer'), run: () => go('/leren/') },
      { id: 'a-backup', group: t('cmd.g.do'), label: t('cmd.backup'), run: () => {
        const blob = new Blob([actions.exportJson()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `all-backup-${isoDay()}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        close();
      } },
      { id: 'a-lang', group: t('cmd.g.do'), label: lang === 'en' ? 'Nederlands' : 'English', hint: t('set.lang'), run: () => { actions.setSettings({ lang: lang === 'en' ? 'nl' : 'en' }); close(); } },
      { id: 'a-tour', group: t('cmd.g.do'), label: t('cmd.tour'), run: () => { close(); openTour(); } },
      { id: 'a-keys', group: t('cmd.g.do'), label: t('cmd.keys'), hint: '?', run: () => { setHelp(true); setTimeout(() => helpBtn.current?.focus(), 0); } },
    ];
    out.push(...acts.filter((a) => !low || has(a.label)));
    if (text.length >= 2) {
      const found: Cmd[] = [];
      const add = (label: string, kind: string, href: string, id: string) => found.push({ id, group: t('cmd.g.found'), label, hint: kind, run: () => go(href) });
      s.tasks.filter((x) => has(x.title)).slice(0, 4).forEach((x) => add(x.title, t('nav.taken'), '/taken/', 't' + x.id));
      s.notes.filter((x) => has(x.title) || has(x.body)).slice(0, 4).forEach((x) => add(x.title || '…', t('nav.notities'), '/notities/', 'n' + x.id));
      s.events.filter((x) => has(x.title)).slice(0, 3).forEach((x) => add(x.title, t('nav.agenda'), '/agenda/', 'e' + x.id));
      s.subjects.filter((x) => has(x.name)).slice(0, 3).forEach((x) => add(x.name, t('nav.leren'), '/leren/', 's' + x.id));
      s.habits.filter((x) => has(x.name)).slice(0, 3).forEach((x) => add(x.name, t('nav.gewoontes'), '/gewoontes/', 'h' + x.id));
      s.memories.filter((x) => has(x.text)).slice(0, 3).forEach((x) => add(x.text, t('nav.geheugen'), '/geheugen/', 'm' + x.id));
      out.push(...found.slice(0, 8));
      out.push({ id: 'search', group: t('cmd.g.found'), label: `${t('cmd.searchAll')}: “${text}”`, run: () => go('/zoeken/?q=' + encodeURIComponent(text)) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, s, t, lang]);

  const sel = Math.min(active, Math.max(0, cmds.length - 1));
  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((sel + 1) % Math.max(1, cmds.length)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((sel - 1 + cmds.length) % Math.max(1, cmds.length)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(cmds.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); cmds[sel]?.run(); }
  };
  useEffect(() => {
    document.getElementById('cmd-' + sel)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  let lastGroup = '';
  return (
    <dialog ref={dlg} className="cmdk" aria-label={help ? t('cmd.keys') : t('cmd.title')}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      onClose={() => { setQ(''); setOpen(false); }}>
      {!isOpen ? null : help ? (
        <div className="cmdk-in">
          <h2 className="h2" style={{ margin: 0 }}>{t('cmd.keys')}</h2>
          <dl className="keys">
            <dt><kbd>Ctrl</kbd> <kbd>K</kbd> {t('cmd.or')} <kbd>/</kbd></dt><dd>{t('cmd.k.open')}</dd>
            <dt><kbd>?</kbd></dt><dd>{t('cmd.k.help')}</dd>
            {NAV.map((n) => <div key={n.href} style={{ display: 'contents' }}><dt><kbd>g</kbd> <kbd>{n.shortcut}</kbd></dt><dd>{t(n.key)}</dd></div>)}
            <dt><kbd>Esc</kbd></dt><dd>{t('common.close')}</dd>
          </dl>
          <div className="wrap">
            <button ref={helpBtn} type="button" className="btn" onClick={() => { setHelp(false); setTimeout(() => input.current?.focus(), 0); }}>{t('cmd.title')}</button>
            <button type="button" className="btn ghost" onClick={close}>{t('common.close')}</button>
          </div>
        </div>
      ) : (
        <div className="cmdk-in">
          <div className="row" style={{ gap: 10 }}>
            <Icon name="search" />
            <input ref={input} className="cmdk-input" value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={onInputKey}
              role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-activedescendant={cmds.length ? 'cmd-' + sel : undefined}
              aria-autocomplete="list" aria-label={t('cmd.title')} placeholder={t('cmd.ph')} autoComplete="off" spellCheck={false} />
            <kbd className="faint">Esc</kbd>
          </div>
          <ul id="cmd-list" role="listbox" aria-label={t('cmd.title')} className="cmdk-list">
            {cmds.length === 0 && <li role="presentation" className="muted" style={{ padding: 12 }}>{t('cmd.none')}</li>}
            {cmds.map((c, i) => {
              const head = c.group !== lastGroup;
              lastGroup = c.group;
              return (
                <li key={c.id} role="presentation">
                  {head && <div className="cmdk-group" aria-hidden="true">{c.group}</div>}
                  <div id={'cmd-' + i} role="option" aria-selected={i === sel} className="cmdk-opt"
                    onMouseMove={() => setActive(i)} onClick={() => c.run()}>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                    {c.hint && <span className="faint" style={{ flex: '0 0 auto' }}>{c.hint}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="faint" style={{ margin: 0 }}>{t('cmd.foot')}</p>
        </div>
      )}
    </dialog>
  );
}
