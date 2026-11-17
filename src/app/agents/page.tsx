'use client';
import { useState } from 'react';
import Icon from '@/components/Icon';
import PageHeader from '@/components/Page';
import { agentBriefing, agentContext, TEMPLATES, templateOf } from '@/lib/agents';
import { AGENT_AREAS, isoDay, makeDraft } from '@/lib/core';
import { useT, type Key } from '@/lib/i18n';
import { actions, lastLogId, useAll } from '@/lib/store';
import { toast } from '@/lib/toast';
import type { Access, Agent, AgentArea } from '@/lib/types';

const ACCESS: Access[] = ['none', 'read', 'draft'];

function AgentForm({ initial, onSave, onCancel, submit }: { initial: Agent; onSave: (a: Agent) => void; onCancel?: () => void; submit: string }) {
  const { t } = useT();
  const [a, setA] = useState<Agent>(initial);
  const set = (p: Partial<Agent>) => setA((x) => ({ ...x, ...p }));
  const tpl = templateOf(a);
  return (
    <form className="stack" style={{ maxWidth: 760 }} onSubmit={(e) => { e.preventDefault(); if (a.name.trim()) onSave({ ...a, name: a.name.trim(), instructions: a.instructions.trim() }); }}>
      <label className="field">{t('proj.name')}<input className="input" value={a.name} maxLength={60} required onChange={(e) => set({ name: e.target.value })} /></label>
      <label className="field">{t('agent.instructions')}
        <textarea className="input" rows={4} value={a.instructions} maxLength={4000} onChange={(e) => set({ instructions: e.target.value })} aria-describedby={'ins-' + a.id} />
      </label>
      <span id={'ins-' + a.id} className="faint" style={{ marginTop: -6 }}>{t('agent.instructionsHelp')}</span>

      <div className="stack" style={{ gap: 6 }}>
        <span className="faint">{t('agent.may')}</span>
        <div className="hscroll">
          <table className="ptable">
            <caption className="sr-only">{t('agent.may')}</caption>
            <thead>
              <tr><th scope="col" style={{ textAlign: 'left' }}>{t('agent.area')}</th>{ACCESS.map((x) => <th key={x} scope="col">{t(`agent.acc.${x}` as Key)}</th>)}</tr>
            </thead>
            <tbody>
              {AGENT_AREAS.map((area) => (
                <tr key={area}>
                  <th scope="row" style={{ textAlign: 'left', fontWeight: 500 }}>{t(`agent.area.${area}` as Key)}</th>
                  {ACCESS.map((x) => (
                    <td key={x}>
                      <input type="radio" name={`${a.id}-${area}`} checked={a.can[area] === x} onChange={() => set({ can: { ...a.can, [area]: x } })}
                        aria-label={`${t(`agent.area.${area}` as Key)}: ${t(`agent.acc.${x}` as Key)}`} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row" style={{ textAlign: 'left', fontWeight: 500 }}>{t('agent.area.outside')}</th>
                <td colSpan={3} className="faint" style={{ textAlign: 'left' }}>{t('agent.never')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
        <label className="row" style={{ gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!a.schedule} onChange={(e) => set({ schedule: e.target.checked ? (tpl.schedule || '07:30') : '' })} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
          <span>{t('agent.daily')}</span>
        </label>
        {a.schedule && (
          <label className="field" style={{ width: 140 }}>{t('agent.at')}
            <input className="input" type="time" value={a.schedule} onChange={(e) => set({ schedule: e.target.value || '07:30' })} />
          </label>
        )}
      </div>
      <div className="wrap">
        <button type="submit" className="btn cta" disabled={!a.name.trim()}>{submit}</button>
        {onCancel && <button type="button" className="btn" onClick={onCancel}>{t('common.cancel')}</button>}
      </div>
    </form>
  );
}

function TryRun({ a }: { a: Agent }) {
  const s = useAll();
  const { t, lang } = useT();
  const ctx = agentContext(s, a);
  const tpl = templateOf(a);
  const brief = !tpl.ai ? agentBriefing(s, a, isoDay(), lang) : null;
  return (
    <div className="glass stack" style={{ padding: 16, borderRadius: 12, gap: 10 }} aria-label={`${t('agent.try')}: ${a.name}`} role="region">
      <h4 className="pixel" style={{ margin: 0, fontSize: 16 }}>{t('agent.sees')}</h4>
      {ctx.areas.length === 0 && <p className="muted" style={{ margin: 0 }}>{t('agent.seesNothing')}</p>}
      <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4, fontSize: 14 }}>
        {ctx.areas.map((x) => (
          <li key={x.area}>
            <strong>{t(`agent.area.${x.area}` as Key)}</strong> · {x.count} · <span className="faint">{t(`agent.acc.${x.access}` as Key)}</span>
            {x.sample.length > 0 && <span className="muted">: {x.sample.join(' · ')}{x.count > x.sample.length ? ' …' : ''}</span>}
          </li>
        ))}
      </ul>
      <p className="faint" style={{ margin: 0 }}>{t('agent.size')}: ~{ctx.tokens} tokens</p>
      {brief ? (
        <>
          <h4 className="pixel" style={{ margin: '6px 0 0', fontSize: 16 }}>{t('agent.wouldWrite')}</h4>
          <pre className="brief-pre">{brief.title}{'\n\n'}{brief.body}</pre>
          {a.lastRun === isoDay() ? <p className="faint" style={{ margin: 0 }}>{t('agent.doneToday')}</p> : <button type="button" className="btn small" style={{ alignSelf: 'flex-start' }} onClick={() => {
            const d = makeDraft({ kind: 'note', title: brief.title, date: '', time: '', repeat: 'none', project: '', body: brief.body, source: `agent:${a.name}` });
            actions.agentDraft(a, d);
            toast(t('draft.made'), lastLogId());
          }}>{t('agent.asDraft')}</button>}
        </>
      ) : (
        <p className="muted" style={{ margin: 0 }}>{t('agent.needsAi')}</p>
      )}
    </div>
  );
}

export default function AgentsPage() {
  const s = useAll();
  const { t, lang } = useT();
  const [editing, setEditing] = useState<string | null>(null);
  const [trying, setTrying] = useState<string | null>(null);
  const [draft, setDraft] = useState<Agent | null>(null);

  const fromTemplate = (id: string) => {
    const tp = TEMPLATES.find((x) => x.id === id)!;
    setDraft({
      id: 'new-' + id, name: t(`agent.t.${id}` as Key), template: id, instructions: id === 'leeg' ? '' : t(`agent.t.${id}.ins` as Key),
      can: { ...tp.can }, schedule: tp.schedule, enabled: true, lastRun: '', createdAt: '',
    });
  };

  return (
    <main id="inhoud" tabIndex={-1} className="main">
      <PageHeader title={t('agents.title')} sub={t('agent.sub')} />

      <section className="glass panel" aria-labelledby="ag-h">
        <h2 id="ag-h" className="h2">{t('agent.mine')}</h2>
        {s.agents.length === 0 && <p className="muted" style={{ margin: 0 }}>{t('agent.empty')}</p>}
        <div className="divide">
          {s.agents.map((a) => {
            const tp = templateOf(a);
            const status = !a.enabled ? t('agent.st.off') : tp.ai ? t('agent.st.sleep') : a.schedule ? `${t('agent.st.daily')} ${a.schedule}` : t('agent.st.ask');
            return (
              <article key={a.id} className="stack" style={{ padding: '14px 0', gap: 10 }} aria-labelledby={'a-' + a.id}>
                <div className="agent-row">
                  <img className="px" src={`/img/stad-${tp.img}.png`} alt="" width={72} height={68} style={{ objectFit: 'contain', flex: '0 0 auto', opacity: a.enabled ? 1 : 0.5 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 id={'a-' + a.id} className="pixel" style={{ margin: 0, fontSize: 18, overflowWrap: 'anywhere' }}>{a.name}</h3>
                    <div className={'chip' + (tp.ai ? '' : ' ok')} style={{ marginTop: 4, display: 'inline-block' }}>{status}</div>
                    {a.instructions && <p className="muted" style={{ margin: '6px 0 0', fontSize: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.instructions}</p>}
                  </div>
                  <div className="agent-btns">
                    <button type="button" className="btn small" aria-expanded={trying === a.id} onClick={() => setTrying(trying === a.id ? null : a.id)}><Icon name="eye" size={16} />{t('agent.try')}<span className="sr-only">: {a.name}</span></button>
                    <button type="button" className="btn small toggle" aria-pressed={a.enabled} onClick={() => actions.updateAgent({ ...a, enabled: !a.enabled })}><span className="sr-only">{a.name}: </span>{t('flow.active')}</button>
                    <button type="button" className="btn ghost icon" aria-label={`${t('common.edit')}: ${a.name}`} aria-expanded={editing === a.id} onClick={() => setEditing(editing === a.id ? null : a.id)}><Icon name="edit" /></button>
                    <button type="button" className="btn ghost icon" aria-label={`${t('common.delete')}: ${a.name}`} onClick={() => { actions.deleteAgent(a); toast(t('toast.deleted'), lastLogId()); }}><Icon name="trash" /></button>
                  </div>
                </div>
                {editing === a.id && (
                  <div className="glass" style={{ padding: 16, borderRadius: 12 }}>
                    <AgentForm initial={a} submit={t('common.save')} onCancel={() => setEditing(null)} onSave={(x) => { actions.updateAgent(x); setEditing(null); }} />
                  </div>
                )}
                {trying === a.id && <TryRun a={a} />}
              </article>
            );
          })}
        </div>
      </section>

      <section className="glass panel" aria-labelledby="new-ag-h">
        <h2 id="new-ag-h" className="h2">{t('agent.new')}</h2>
        {!draft ? (
          <div className="agent-tpls">
            {TEMPLATES.map((tp) => (
              <button key={tp.id} type="button" className="agent-tpl" onClick={() => fromTemplate(tp.id)}>
                <img className="px" src={`/img/stad-${tp.img}.png`} alt="" width={84} height={80} />
                <span className="pixel" style={{ fontSize: 16 }}>{t(`agent.t.${tp.id}` as Key)}</span>
                <span className="faint">{t(`agent.t.${tp.id}.x` as Key)}</span>
                <span className={'chip' + (tp.ai ? '' : ' ok')}>{tp.ai ? t('agent.needsAiShort') : t('agent.worksNow')}</span>
              </button>
            ))}
          </div>
        ) : (
          <AgentForm key={draft.id} initial={draft} submit={t('agent.create')} onCancel={() => setDraft(null)}
            onSave={(a) => {
              actions.addAgent(a);
              setDraft(null);
              // A scheduled agent whose time has already passed today does its job straight away.
              const n = actions.runAgents();
              toast(n ? t('bg.firedOne') : lang === 'en' ? 'Agent created.' : 'Agent gemaakt.');
            }} />
        )}
      </section>

      <section className="glass panel" aria-labelledby="how-ag-h">
        <h2 id="how-ag-h" className="h2">{t('agent.how')}</h2>
        <ul className="muted" style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6, fontSize: 14 }}>
          <li>{t('agent.how1')}</li>
          <li>{t('agent.how2')}</li>
          <li>{t('agent.how3')}</li>
        </ul>
      </section>
    </main>
  );
}
