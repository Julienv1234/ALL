'use client';
import { useEffect, useRef } from 'react';
import { MAP_H, MAP_W, MODULES, ROUTES, SLOT_PARENT, TASK_SLOTS, half, roadBetween, scr, sprite, type Asset, type RouteKind } from '@/lib/city';
import { useT } from '@/lib/i18n';
import Icon from './Icon';

export interface Block {
  id: string; // module id or 'task:<id>'
  asset: Asset;
  uv: [number, number];
  label: string;
  status: string;
  dim: boolean;
  isTask: boolean;
  name: string;
}

const STROKE: Record<RouteKind | 'task', string> = {
  live: '',
  link: 'stroke: #8A84A8; stroke-width: 2',
  task: 'stroke: #8A84A8; stroke-width: 1.5',
  later: 'stroke: #5A5470; stroke-width: 1.5; stroke-dasharray: 2 6',
};

function Road({ a, b, kind, label }: { a: Block; b: Block; kind: RouteKind | 'task'; label: string }) {
  const [[x1, y1], [x2, y2]] = roadBetween(a, b);
  const left = Math.floor(Math.min(x1, x2) - 4);
  const top = Math.floor(Math.min(y1, y2) - 4);
  const w = Math.ceil(Math.max(x1, x2) + 4) - left;
  const h = Math.ceil(Math.max(y1, y2) + 4) - top;
  const d = `M${x1 - left} ${y1 - top} L${x2 - left} ${y2 - top}`;
  const style = (s: string) => Object.fromEntries(s.split(';').filter(Boolean).map((p) => {
    const [k, v] = p.split(':').map((x) => x.trim());
    return [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v];
  }));
  return (
    <svg role="img" aria-label={label} width={w} height={h} viewBox={`0 0 ${w} ${h}`}
      style={{ position: 'absolute', left, top, overflow: 'visible', fill: 'none', strokeLinecap: 'round' }}>
      {kind === 'live' ? (
        <>
          <path d={d} style={{ stroke: 'var(--accent)', strokeOpacity: 0.3, strokeWidth: 2 }} />
          <path className="flow" d={d} style={{ stroke: 'var(--accent)', strokeWidth: 3, filter: 'drop-shadow(0 0 4px var(--accent))' }} />
        </>
      ) : (
        <path d={d} style={style(STROKE[kind])} />
      )}
    </svg>
  );
}

export default function CityMap({ blocks, selected, onSelect, zoom, setZoom, extraTasks }: {
  blocks: Block[];
  selected: string;
  onSelect: (id: string) => void;
  zoom: number;
  setZoom: (z: number) => void;
  extraTasks: number;
}) {
  const { t, lang } = useT();
  const to = lang === 'en' ? 'to' : 'naar';
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const sel = byId.get(selected) ?? byId.get('hub')!;
  const [gx, gy] = scr(...sel.uv);
  const gs = half(sel.asset) / 3;
  const tasks = blocks.filter((b) => b.isTask);
  const ordered = [...blocks].sort((a, b) => a.uv[0] + a.uv[1] - (b.uv[0] + b.uv[1]) || a.uv[0] - b.uv[0]);
  const name = (b: Block) => b.name;
  const mapRef = useRef<HTMLDivElement>(null);
  // On a narrow screen the 900 px city does not fit: start with the home base in the middle, swipe to explore.
  useEffect(() => {
    const box = mapRef.current?.parentElement;
    if (!box || box.scrollWidth <= box.clientWidth) return;
    const [hx, hy] = scr(0, 0);
    box.scrollLeft = hx - box.clientWidth / 2;
    box.scrollTop = Math.max(0, hy - box.clientHeight / 2);
  }, []);

  return (
    <div className="map" ref={mapRef}>
      <div className="mapzoom" style={{ transform: `scale(${zoom})` }}>
        <svg aria-hidden="true" width={MAP_W} height={MAP_H} style={{ position: 'absolute', inset: 0, fill: 'none', stroke: 'rgba(255,255,255,0.035)', pointerEvents: 'none' }}>
          {Array.from({ length: 17 }, (_, i) => -40 + i * 5).flatMap((c) => {
            const a = scr(c, -60), b = scr(c, 60), e = scr(-60, c), f = scr(60, c);
            return [<path key={'u' + c} d={`M${a[0]} ${a[1]} L${b[0]} ${b[1]}`} />, <path key={'v' + c} d={`M${e[0]} ${e[1]} L${f[0]} ${f[1]}`} />];
          })}
        </svg>

        {ROUTES.map(([a, b, kind]) => {
          const A = byId.get(a), B = byId.get(b);
          if (!A || !B) return null;
          return <Road key={a + b} a={A} b={B} kind={kind} label={`${t('home.road')} ${name(A)} ${to} ${name(B)}`} />;
        })}
        {tasks.map((tb, i) => {
          const parent = SLOT_PARENT[i] === -1 ? byId.get('taken') : tasks[SLOT_PARENT[i]];
          return parent ? <Road key={'r' + tb.id} a={parent} b={tb} kind="task" label={`${t('home.road')} ${name(parent)} ${to} ${tb.name}`} /> : null;
        })}

        <div className="glowsel" aria-hidden="true" style={{
          transform: `translate(${gx}px, ${gy}px) scale(${gs})`,
          background: 'radial-gradient(closest-side, color-mix(in srgb, var(--accent) 40%, transparent), transparent)',
        }}>
          <svg width="320" height="180" viewBox="0 0 320 180" fill="none" style={{ display: 'block' }}>
            <path d="M160 34L270 90 160 146 50 90z" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </div>

        {ordered.map((b) => {
          const m = sprite(b.asset);
          const [x, y] = scr(...b.uv);
          return (
            <button key={b.id} type="button" className="isle" aria-pressed={b.id === sel.id}
              aria-label={b.isTask ? `${b.name}` : `${b.name}, ${b.status}`}
              onClick={() => onSelect(b.id)}
              style={{ left: Math.round(x - m.ax), top: Math.round(y - m.ay), width: m.w, height: m.h }}>
              <img className="px" src={`/img/stad-${b.asset}.png`} alt="" width={m.w} height={m.h} style={{ opacity: b.dim ? 0.55 : 1 }} />
            </button>
          );
        })}

        {ordered.filter((b) => !b.isTask).map((b) => {
          const [x, y] = scr(...b.uv);
          const hw = half(b.asset);
          return (
            <div key={'c' + b.id} className="mapchip" aria-hidden="true" style={{ left: Math.round(x - hw * 16 - 6), top: Math.round(y + hw * 8 + 2) }}>
              <span className="pixel" style={{ fontSize: 14, lineHeight: '17px' }}>{b.label}</span>
              <span style={{ fontSize: 11, lineHeight: '14px', color: 'var(--ink-2)' }}>{b.status}</span>
            </div>
          );
        })}
        {extraTasks > 0 && (() => {
          const [x, y] = scr(...TASK_SLOTS[TASK_SLOTS.length - 1]);
          return (
            <div className="mapchip" style={{ left: Math.round(x - 30), top: Math.round(y + 22) }}>
              <span style={{ fontSize: 12 }}>+{extraTasks} {t('home.more')}</span>
            </div>
          );
        })()}
      </div>

      <div style={{ position: 'absolute', left: 20, top: 16, pointerEvents: 'none' }}>
        <h2 className="h2">{t('home.city')}</h2>
        <div className="muted" style={{ fontSize: 13 }}>{t('home.city.hint')}</div>
      </div>

      <div className="glass map-legend" style={{ position: 'absolute', left: 20, top: 664, padding: '10px 14px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, lineHeight: '16px', color: 'var(--ink-2)' }}>
        {([['live', t('home.legend.live')], ['link', t('home.legend.link')], ['later', t('home.legend.later')]] as const).map(([k, l]) => (
          <div key={k} className="row" style={{ gap: 10 }}>
            <svg width="28" height="6" viewBox="0 0 28 6" fill="none" aria-hidden="true">
              <path d="M2 3h24" strokeLinecap="round" stroke={k === 'live' ? 'var(--accent)' : k === 'link' ? '#8A84A8' : '#5A5470'}
                strokeWidth={k === 'live' ? 3 : 2} strokeDasharray={k === 'live' ? '4 8' : k === 'later' ? '2 6' : undefined} />
            </svg>
            <span>{l}</span>
          </div>
        ))}
      </div>

      <div className="glass map-zoom" style={{ position: 'absolute', left: 836, top: 606, padding: 4, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button type="button" className="btn icon" aria-label={t('home.zoomIn')} disabled={zoom >= 1.3} onClick={() => setZoom(Math.min(1.3, Math.round((zoom + 0.1) * 10) / 10))}><Icon name="plus" /></button>
        <button type="button" className="btn icon" aria-label={t('home.zoomOut')} disabled={zoom <= 0.7} onClick={() => setZoom(Math.max(0.7, Math.round((zoom - 0.1) * 10) / 10))}><Icon name="minus" /></button>
        <button type="button" className="btn icon" aria-label={t('home.zoomReset')} onClick={() => { setZoom(1); onSelect('hub'); }}><Icon name="target" /></button>
      </div>
    </div>
  );
}
