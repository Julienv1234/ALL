'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT, type Key } from '@/lib/i18n';

const ITEMS: { href: string; key: Key }[] = [
  { href: '/', key: 'nav.stad' },
  { href: '/agenda/', key: 'nav.agenda' },
  { href: '/taken/', key: 'nav.taken' },
  { href: '/notities/', key: 'nav.notities' },
  { href: '/agents/', key: 'nav.agents' },
  { href: '/workflows/', key: 'nav.workflows' },
  { href: '/geheugen/', key: 'nav.geheugen' },
  { href: '/logboek/', key: 'nav.logboek' },
  { href: '/instellingen/', key: 'nav.instellingen' },
];

export default function Rail() {
  const path = usePathname() || '/';
  const { t } = useT();
  const norm = path.endsWith('/') ? path : path + '/';
  return (
    <nav className="rail" aria-label={t('nav.label')}>
      <Link href="/" aria-label="ALL" style={{ display: 'block' }}>
        <img className="px" src="/img/rail-roof.png" alt="" width={92} height={124} style={{ display: 'block' }} />
      </Link>
      <div className="rail-items">
        {ITEMS.map((it, i) => {
          const active = it.href === '/' ? norm === '/' : norm.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href} className="navi" aria-current={active ? 'page' : undefined}>
              <span className="plate px">
                <span className="ico px" aria-hidden="true" style={{ backgroundPosition: `-${i * 48}px -${active ? 48 : 0}px` }} />
              </span>
              <span className="navi-label">{t(it.key)}</span>
            </Link>
          );
        })}
      </div>
      <img className="railfoot px" src="/img/rail-foot.png" alt="" width={92} height={104} />
    </nav>
  );
}
