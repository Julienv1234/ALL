'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useT } from '@/lib/i18n';

import { NAV as ITEMS } from '@/lib/nav';

const isActive = (href: string, norm: string) =>
  href === '/' ? norm === '/' : norm.startsWith(href) || (href === '/taken/' && norm.startsWith('/projecten/'));

/** Phone: the four most used places stay in reach of your thumb, the rest sit under "More". */
const TABS = ['/', '/agenda/', '/taken/', '/leren/'];
// rail-icons.png holds the ITEMS icons in the same order, then 'more'. Keep art/rail.py ORDER in step.
const MORE_INDEX = ITEMS.length;
const N_ICONS = ITEMS.length + 1;

function Ico({ i, active, size }: { i: number; active: boolean; size: number }) {
  return (
    <span className="ico px" aria-hidden="true"
      style={{ width: size, height: size, backgroundSize: `${N_ICONS * size}px ${2 * size}px`, backgroundPosition: `-${i * size}px -${active ? size : 0}px` }} />
  );
}

function PhoneTabs({ norm }: { norm: string }) {
  const { t } = useT();
  const sheet = useRef<HTMLDialogElement>(null);
  const rest = ITEMS.map((it, i) => ({ ...it, i })).filter((it) => !TABS.includes(it.href));
  const moreActive = rest.some((it) => isActive(it.href, norm));
  useEffect(() => { sheet.current?.close(); }, [norm]);
  return (
    <>
      <nav className="tabbar" aria-label={t('nav.label')}>
        {ITEMS.map((it, i) => ({ ...it, i })).filter((it) => TABS.includes(it.href)).map((it) => {
          const active = isActive(it.href, norm);
          return (
            <Link key={it.href} href={it.href} className="tab" aria-current={active ? 'page' : undefined}>
              <Ico i={it.i} active={active} size={36} />
              <span className="tab-label">{t(it.key)}</span>
            </Link>
          );
        })}
        <button type="button" className="tab" aria-haspopup="dialog" data-on={moreActive || undefined}
          onClick={() => sheet.current?.showModal()}>
          <Ico i={MORE_INDEX} active={moreActive} size={36} />
          <span className="tab-label">{t('nav.more')}</span>
        </button>
      </nav>
      <dialog ref={sheet} className="sheet" aria-label={t('nav.more')}
        onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
        <div className="sheet-in">
          <div className="sheet-grip" aria-hidden="true" />
          <div className="sheet-grid">
            {rest.map((it) => {
              const active = isActive(it.href, norm);
              return (
                <Link key={it.href} href={it.href} className="navi" aria-current={active ? 'page' : undefined} onClick={() => sheet.current?.close()}>
                  <span className="plate px"><Ico i={it.i} active={active} size={48} /></span>
                  <span className="navi-label">{t(it.key)}</span>
                </Link>
              );
            })}
          </div>
          <button type="button" className="btn" style={{ alignSelf: 'stretch' }}
            onClick={() => { sheet.current?.close(); window.dispatchEvent(new Event('all:command')); }}>{t('cmd.title')}</button>
          <button type="button" className="btn ghost" style={{ alignSelf: 'stretch' }} onClick={() => sheet.current?.close()}>{t('common.close')}</button>
        </div>
      </dialog>
    </>
  );
}

export default function Rail() {
  const path = usePathname() || '/';
  const norm = path.endsWith('/') ? path : path + '/';
  return (
    <>
      <DeskRail norm={norm} />
      <PhoneTabs norm={norm} />
    </>
  );
}

function DeskRail({ norm }: { norm: string }) {
  const { t } = useT();
  return (
    <nav className="rail" aria-label={t('nav.label')}>
      <a href="#inhoud" className="skip">{t('skip')}</a>
      <Link href="/" aria-label="ALL" style={{ display: 'block' }}>
        <img className="px" src="/img/rail-roof.png" alt="" width={92} height={124} style={{ display: 'block' }} />
      </Link>
      <div className="rail-items">
        {ITEMS.map((it, i) => {
          const active = isActive(it.href, norm);
          return (
            <Link key={it.href} href={it.href} className="navi" aria-current={active ? 'page' : undefined}>
              <span className="plate px">
                <Ico i={i} active={active} size={48} />
              </span>
              <span className="navi-label">{t(it.key)}</span>
            </Link>
          );
        })}
      </div>
      <button type="button" className="rail-cmd" onClick={() => window.dispatchEvent(new Event('all:command'))}
        aria-label={`Ctrl K: ${t('cmd.title')}`}><kbd>Ctrl</kbd> <kbd>K</kbd></button>
      <img className="railfoot px" src="/img/rail-foot.png" alt="" width={92} height={104} />
    </nav>
  );
}
