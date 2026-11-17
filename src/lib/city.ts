/** Geometry and contents of the city map. Pure data, shared by map and list view. */
import meta from '../../public/img/islands-meta.json';

export type Asset = keyof typeof meta;
export type ModuleId = 'hub' | 'assistent' | 'mail' | 'briefing' | 'agenda' | 'taken' | 'notities' | 'onderzoeker' | 'web' | 'geld' | 'gezondheid';

export interface ModuleDef {
  id: ModuleId;
  asset: Asset;
  uv: [number, number];
  href?: string; // live modules link to their screen
  phase?: number; // future modules: the phase they arrive in
}

export const MODULES: ModuleDef[] = [
  { id: 'hub', asset: 'hub', uv: [0, 0], href: '/logboek/' },
  { id: 'assistent', asset: 'assistent', uv: [-11.5, 0] },
  { id: 'mail', asset: 'mail', uv: [-21, 0], phase: 3 },
  { id: 'briefing', asset: 'briefing', uv: [0, -11.5] },
  { id: 'agenda', asset: 'agenda', uv: [0, -21], href: '/agenda/' },
  { id: 'taken', asset: 'taken', uv: [0, 11], href: '/taken/' },
  { id: 'notities', asset: 'notities', uv: [11, 0], href: '/notities/' },
  { id: 'onderzoeker', asset: 'onderzoeker', uv: [11, -11], phase: 4 },
  { id: 'web', asset: 'perceel', uv: [11, 11], phase: 5 },
  { id: 'geld', asset: 'perceel', uv: [21, 11], phase: 6 },
  { id: 'gezondheid', asset: 'perceel', uv: [11, 21], phase: 6 },
];

/** Where task islets go, nearest to the Taken block first. */
export const TASK_SLOTS: [number, number][] = [[-6, 11], [0, 17], [-12, 11], [-6, 17], [-12, 17], [5.5, 17]];
/** Which slot each slot connects back to (index, or -1 for the Taken block). */
export const SLOT_PARENT = [-1, -1, 0, 0, 2, 1];

export type RouteKind = 'live' | 'link' | 'later';
export const ROUTES: [ModuleId, ModuleId, RouteKind][] = [
  ['hub', 'taken', 'live'],
  ['hub', 'notities', 'live'],
  ['agenda', 'briefing', 'link'],
  ['briefing', 'hub', 'live'],
  ['mail', 'assistent', 'later'],
  ['assistent', 'hub', 'live'],
  ['onderzoeker', 'notities', 'later'],
  ['taken', 'web', 'later'],
  ['notities', 'web', 'later'],
  ['web', 'geld', 'later'],
  ['web', 'gezondheid', 'later'],
];

export const MAP_W = 900;
export const MAP_H = 760;
const OX = 450;
const OY = 318;

export function scr(u: number, v: number): [number, number] {
  return [OX + (u - v) * 16, OY + (u + v) * 8];
}

export function sprite(asset: Asset) {
  return meta[asset];
}

export const half = (asset: Asset) => meta[asset].n / 2;

/** A straight road between two blocks, trimmed so it stops at their edges. */
export function roadBetween(a: { uv: [number, number]; asset: Asset }, b: { uv: [number, number]; asset: Asset }) {
  const [ua, va] = a.uv;
  const [ub, vb] = b.uv;
  const gap = 0.5;
  let p1: [number, number];
  let p2: [number, number];
  if (va === vb) {
    const d = ub > ua ? 1 : -1;
    p1 = [ua + d * (half(a.asset) + gap), va];
    p2 = [ub - d * (half(b.asset) + gap), vb];
  } else {
    const d = vb > va ? 1 : -1;
    p1 = [ua, va + d * (half(a.asset) + gap)];
    p2 = [ub, vb - d * (half(b.asset) + gap)];
  }
  return [scr(...p1), scr(...p2)] as const;
}
