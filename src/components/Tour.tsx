'use client';
import { useEffect, useRef, useState } from 'react';
import { itemCount } from '@/lib/core';
import { useT, type Key } from '@/lib/i18n';
import { actions, getState, useAll, useReady } from '@/lib/store';

const FLAG = 'all.toured';
const STEPS: { img: string; title: Key; text: Key }[] = [
  { img: 'hub', title: 'tour.1.t', text: 'tour.1.x' },
  { img: 'taken', title: 'tour.2.t', text: 'tour.2.x' },
  { img: 'assistent', title: 'tour.3.t', text: 'tour.3.x' },
  { img: 'leren', title: 'tour.4.t', text: 'tour.4.x' },
  { img: 'notities', title: 'tour.5.t', text: 'tour.5.x' },
];

/** A short welcome the very first time ALL opens on a device with no data. Can be replayed from the command window. */
export default function Tour() {
  const ready = useReady();
  const s = useAll();
  const { t } = useT();
  const dlg = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const [isOpen, setOpen] = useState(false);
  const [welcome, setWelcome] = useState(false);

  const open = () => { setStep(0); setOpen(true); if (!dlg.current?.open) dlg.current?.showModal(); };
  const done = () => {
    try { localStorage.setItem(FLAG, '1'); } catch { /* private mode: it may show again, that is fine */ }
    setWelcome(false);
    dlg.current?.close();
  };

  useEffect(() => {
    if (!ready) return;
    let seen = false;
    try { seen = !!localStorage.getItem(FLAG); } catch { seen = true; }
    // A small, quiet invitation instead of a pop-up: the tour starts only if you want it.
    if (!seen && itemCount(getState()) === 0) setWelcome(true);
    const onTour = () => open();
    window.addEventListener('all:tour', onTour);
    return () => window.removeEventListener('all:tour', onTour);
  }, [ready]);

  const st = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <>
    {welcome && !isOpen && (
      <aside className="glass welcome" aria-labelledby="welcome-h">
        <h2 id="welcome-h" className="pixel" style={{ margin: 0, fontSize: 18 }}>{t('tour.1.t')}</h2>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t('tour.invite')}</p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn cta small" onClick={open}>{t('tour.go')}</button>
          <button type="button" className="btn ghost small" onClick={done}>{t('tour.noThanks')}</button>
        </div>
      </aside>
    )}
    <dialog ref={dlg} className="tour" aria-labelledby="tour-h" aria-describedby="tour-x" onClose={() => { done(); setOpen(false); }}>
      {isOpen && <div className="tour-in">
        <img className="px tour-img" src={`/img/stad-${st.img}.png`} alt="" width={168} height={160} />
        <p className="faint" style={{ margin: 0 }}>{t('tour.step')} {step + 1} / {STEPS.length}</p>
        <h2 id="tour-h" className="pixel" style={{ margin: 0, fontSize: 26 }}>{t(st.title)}</h2>
        <p id="tour-x" style={{ margin: 0, lineHeight: 1.6 }}>{t(st.text)}</p>
        {step === 0 && (
          <label className="field" style={{ alignSelf: 'stretch', textAlign: 'left' }}>{t('tour.name')}
            <input className="input" value={s.settings.name} maxLength={60} placeholder={t('set.name.ph')}
              onChange={(e) => actions.setSettings({ name: e.target.value })} />
          </label>
        )}
        <div className="tour-dots" aria-hidden="true">
          {STEPS.map((_, i) => <span key={i} className={i === step ? 'on' : ''} />)}
        </div>
        <div className="row" style={{ gap: 8, justifyContent: 'space-between', alignSelf: 'stretch', flexWrap: 'wrap' }}>
          <button type="button" className="btn ghost" onClick={done}>{last ? t('common.close') : t('tour.skip')}</button>
          <div className="row" style={{ gap: 8 }}>
            {step > 0 && <button type="button" className="btn" onClick={() => setStep(step - 1)}>{t('tour.back')}</button>}
            <button type="button" className="btn cta" ref={(el) => { if (el && step === 0) el.focus(); }} onClick={() => (last ? done() : setStep(step + 1))}>{last ? t('tour.start') : t('tour.next')}</button>
          </div>
        </div>
      </div>}
    </dialog>
    </>
  );
}
