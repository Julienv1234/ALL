'use client';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { fetchCloud, pushCloud, sb, startSync, type CloudCopy } from '@/lib/cloud';
import { firstSync, itemCount } from '@/lib/core';
import { useT } from '@/lib/i18n';
import { actions, getState, replaceFromCloud } from '@/lib/store';
import { toast } from '@/lib/toast';

type Phase =
  | { k: 'loading' }
  | { k: 'signedOut' }
  | { k: 'mfa' }
  | { k: 'recovery' }
  | { k: 'syncing' }
  | { k: 'ask'; cloud: CloudCopy }
  | { k: 'failed' }
  | { k: 'ready'; local?: boolean };

/** Login, two-step and first-sync screens; renders the app once all is in place. Loaded only when the cloud is set up. */
export default function Gate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>({ k: 'loading' });
  const [session, setSession] = useState<Session | null>(null);
  const stopSync = useRef<(() => void) | null>(null);

  const begin = useCallback(async (s: Session) => {
    setSession(s);
    const aal = await sb().auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal.data && aal.data.currentLevel === 'aal1' && aal.data.nextLevel === 'aal2') {
      setPhase({ k: 'mfa' });
      return;
    }
    setPhase({ k: 'syncing' });
    try {
      const cloud = await fetchCloud(s.user.id);
      const decision = firstSync(getState(), cloud.state);
      if (decision === 'ask') { setPhase({ k: 'ask', cloud }); return; }
      let at = cloud.updatedAt;
      if (decision === 'upload') at = await pushCloud(s.user.id, getState());
      if (decision === 'download' && cloud.state) replaceFromCloud(cloud.state);
      stopSync.current?.();
      stopSync.current = startSync(s.user.id, at);
      setPhase({ k: 'ready' });
    } catch {
      setPhase({ k: 'failed' });
    }
  }, []);

  useEffect(() => {
    let alive = true;
    sb().auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session) begin(data.session);
      else setPhase({ k: 'signedOut' });
    });
    const { data: sub } = sb().auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') { setSession(s); setPhase({ k: 'recovery' }); return; }
      if (event === 'SIGNED_OUT') {
        stopSync.current?.();
        stopSync.current = null;
        setSession(null);
        setPhase({ k: 'signedOut' });
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
      stopSync.current?.();
    };
  }, [begin]);

  if (phase.k === 'ready') return <>{children}</>;
  return (
    <main id="inhoud" tabIndex={-1} className="main" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass panel" style={{ width: 'min(460px, 100%)', gap: 16 }}>
        <img className="px" src="/img/stad-hub.png" alt="" width={145} height={156} style={{ alignSelf: 'center' }} />
        {phase.k === 'loading' || phase.k === 'syncing' ? <Loading />
          : phase.k === 'signedOut' ? <Login onSession={begin} />
          : phase.k === 'mfa' ? <Mfa onDone={() => session && begin(session)} />
          : phase.k === 'recovery' ? <NewPassword onDone={() => session && begin(session)} />
          : phase.k === 'ask' ? <Choose cloud={phase.cloud} onPick={async (use) => {
              if (!session) return;
              setPhase({ k: 'syncing' });
              try {
                let at = phase.cloud.updatedAt;
                if (use === 'cloud' && phase.cloud.state) replaceFromCloud(phase.cloud.state);
                else at = await pushCloud(session.user.id, getState());
                stopSync.current = startSync(session.user.id, at);
                setPhase({ k: 'ready' });
              } catch {
                setPhase({ k: 'failed' });
              }
            }} />
          : <Failed onRetry={() => session && begin(session)} onLocal={() => setPhase({ k: 'ready', local: true })} />}
      </div>
    </main>
  );
}

function Loading() {
  const { t } = useT();
  return <p className="muted" role="status" style={{ margin: 0, textAlign: 'center' }}>{t('auth.loading')}…</p>;
}

function Login({ onSession }: { onSession: (s: Session) => void }) {
  const { t } = useT();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (!navigator.onLine) { setMsg(t('auth.offline')); return; }
    setBusy(true);
    try {
      if (mode === 'forgot') {
        await sb().auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + '/' });
        setMsg(t('auth.resetSent'));
      } else if (mode === 'signup') {
        if (password.length < 10) { setMsg(t('auth.pwShort')); return; }
        const { data, error } = await sb().auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: location.origin + '/' } });
        if (error) setMsg(error.message);
        else if (data.session) onSession(data.session);
        else setMsg(t('auth.checkMail'));
      } else {
        const { data, error } = await sb().auth.signInWithPassword({ email: email.trim(), password });
        if (error || !data.session) setMsg(t('auth.badLogin'));
        else onSession(data.session);
      }
    } catch {
      setMsg(t('auth.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit} style={{ gap: 14 }}>
      <h1 className="h1" style={{ fontSize: 32, textAlign: 'center' }}>{mode === 'signup' ? t('auth.signup') : mode === 'forgot' ? t('auth.forgot') : t('auth.title')}</h1>
      {mode === 'login' && <p className="muted" style={{ margin: 0, fontSize: 14, textAlign: 'center' }}>{t('auth.sub')}</p>}
      <label className="field">{t('auth.email')}
        <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      {mode !== 'forgot' && (
        <label className="field">{t('auth.password')}
          <input className="input" type="password" required minLength={mode === 'signup' ? 10 : undefined}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
      )}
      {msg && <p role="alert" style={{ margin: 0, fontSize: 14, color: '#ffd3dc' }}>{msg}</p>}
      <button type="submit" className="btn cta" disabled={busy}>
        {mode === 'signup' ? t('auth.signup') : mode === 'forgot' ? t('auth.reset') : t('auth.login')}
      </button>
      <div className="wrap" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn ghost small" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setMsg(''); }}>
          {mode === 'signup' ? t('auth.toLogin') : t('auth.toSignup')}
        </button>
        {mode !== 'forgot' && <button type="button" className="btn ghost small" onClick={() => { setMode('forgot'); setMsg(''); }}>{t('auth.forgot')}</button>}
        {mode === 'forgot' && <button type="button" className="btn ghost small" onClick={() => { setMode('login'); setMsg(''); }}>{t('auth.toLogin')}</button>}
      </div>
    </form>
  );
}

export function CodeForm({ onCode, busy, msg }: { onCode: (code: string) => void; busy: boolean; msg: string }) {
  const { t } = useT();
  const [code, setCode] = useState('');
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); onCode(code.replace(/\s/g, '')); }}>
      <label className="field">{t('auth.code')}
        <input className="input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus
          value={code} onChange={(e) => setCode(e.target.value)} style={{ fontSize: 22, letterSpacing: '0.2em', fontVariantNumeric: 'tabular-nums' }} />
      </label>
      {msg && <p role="alert" style={{ margin: 0, fontSize: 14, color: '#ffd3dc' }}>{msg}</p>}
      <button type="submit" className="btn cta" disabled={busy}>{t('auth.verify')}</button>
    </form>
  );
}

function Mfa({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  return (
    <div className="stack">
      <h1 className="h1" style={{ fontSize: 30, textAlign: 'center' }}>{t('auth.mfaTitle')}</h1>
      <p className="muted" style={{ margin: 0, fontSize: 14, textAlign: 'center' }}>{t('auth.mfaSub')}</p>
      <CodeForm busy={busy} msg={msg} onCode={async (code) => {
        setBusy(true);
        setMsg('');
        try {
          const f = await sb().auth.mfa.listFactors();
          const factor = f.data?.totp.find((x) => x.status === 'verified');
          if (!factor) { onDone(); return; }
          const ch = await sb().auth.mfa.challenge({ factorId: factor.id });
          if (ch.error || !ch.data) throw ch.error;
          const v = await sb().auth.mfa.verify({ factorId: factor.id, challengeId: ch.data.id, code });
          if (v.error) setMsg(t('auth.badCode'));
          else onDone();
        } catch {
          setMsg(t('auth.error'));
        } finally {
          setBusy(false);
        }
      }} />
      <button type="button" className="btn ghost small" onClick={() => sb().auth.signOut({ scope: 'local' })}>{t('auth.signOut')}</button>
    </div>
  );
}

function NewPassword({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  return (
    <form className="stack" onSubmit={async (e) => {
      e.preventDefault();
      if (pw.length < 10) { setMsg(t('auth.pwShort')); return; }
      const { error } = await sb().auth.updateUser({ password: pw });
      if (error) setMsg(error.message);
      else { toast(t('auth.newPwDone')); onDone(); }
    }}>
      <h1 className="h1" style={{ fontSize: 28, textAlign: 'center' }}>{t('auth.newPwTitle')}</h1>
      <label className="field">{t('auth.newPw')}
        <input className="input" type="password" autoComplete="new-password" minLength={10} required value={pw} onChange={(e) => setPw(e.target.value)} />
      </label>
      {msg && <p role="alert" style={{ margin: 0, fontSize: 14, color: '#ffd3dc' }}>{msg}</p>}
      <button type="submit" className="btn cta">{t('common.save')}</button>
    </form>
  );
}

function Choose({ cloud, onPick }: { cloud: CloudCopy; onPick: (use: 'cloud' | 'device') => void }) {
  const { t } = useT();
  const local = getState();
  const download = () => {
    const url = URL.createObjectURL(new Blob([actions.exportJson()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all-backup-dit-toestel.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="stack">
      <h1 className="h1" style={{ fontSize: 28 }}>{t('sync.title')}</h1>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t('sync.sub')}</p>
      <div className="wrap" style={{ gap: 12 }}>
        {([['device', t('sync.device'), itemCount(local)], ['cloud', t('sync.cloud'), cloud.state ? itemCount(cloud.state) : 0]] as const).map(([k, label, n]) => (
          <div key={k} style={{ flex: '1 1 160px', border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
            <div className="faint">{label}</div>
            <div className="pixel" style={{ fontSize: 28 }}>{n}</div>
            <div className="faint">{t('sync.items')}</div>
          </div>
        ))}
      </div>
      <button type="button" className="btn" onClick={download}>{t('sync.backup')}</button>
      <div className="wrap">
        <button type="button" className="btn cta" onClick={() => onPick('cloud')}>{t('sync.useCloud')}</button>
        <button type="button" className="btn" onClick={() => onPick('device')}>{t('sync.useDevice')}</button>
      </div>
    </div>
  );
}

function Failed({ onRetry, onLocal }: { onRetry: () => void; onLocal: () => void }) {
  const { t } = useT();
  return (
    <div className="stack">
      <p role="alert" style={{ margin: 0 }}>{t('sync.failed')}</p>
      <div className="wrap">
        <button type="button" className="btn cta" onClick={onRetry}>{t('sync.retry')}</button>
        <button type="button" className="btn" onClick={onLocal}>{t('sync.local')}</button>
      </div>
    </div>
  );
}
