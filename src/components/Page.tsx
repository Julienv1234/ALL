'use client';
import type { ReactNode } from 'react';
import AskBox from './AskBox';

export default function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px 32px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <h1 className="h1">{title}</h1>
        {sub && <p className="muted" style={{ margin: 0, maxWidth: '70ch' }}>{sub}</p>}
      </div>
      <div className="wrap" style={{ alignItems: 'center', gap: 12 }}>
        {actions}
        <AskBox />
      </div>
    </header>
  );
}
