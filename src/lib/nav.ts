/** The main menu, shared by the rail, the phone tab bar and the command window. */
import type { Key } from './i18n';

export interface NavItem { href: string; key: Key; shortcut: string }

// The icons in public/img/rail-icons.png are in this same order (art/rail.py ORDER), with 'more' last.
export const NAV: NavItem[] = [
  { href: '/', key: 'nav.stad', shortcut: 's' },
  { href: '/agenda/', key: 'nav.agenda', shortcut: 'a' },
  { href: '/taken/', key: 'nav.taken', shortcut: 't' },
  { href: '/notities/', key: 'nav.notities', shortcut: 'n' },
  { href: '/leren/', key: 'nav.leren', shortcut: 'l' },
  { href: '/gewoontes/', key: 'nav.gewoontes', shortcut: 'h' },
  { href: '/agents/', key: 'nav.agents', shortcut: 'r' },
  { href: '/workflows/', key: 'nav.workflows', shortcut: 'w' },
  { href: '/websites/', key: 'nav.websites', shortcut: 'b' },
  { href: '/geheugen/', key: 'nav.geheugen', shortcut: 'm' },
  { href: '/logboek/', key: 'nav.logboek', shortcut: 'o' },
  { href: '/instellingen/', key: 'nav.instellingen', shortcut: 'i' },
];
