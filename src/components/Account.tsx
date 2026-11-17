'use client';
import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { cloudConfigured, qrSrc, sb, signOutHere, useSyncStatus } from '@/lib/cloud';
import { useT, type Key } from '@/lib/i18n';
import { clearDevice } from '@/lib/store';
import { toast } from '@/lib/toast';
import { CodeForm } from './AuthGate';

/** Settings panel: who is signed in, sync status, two-step verification, sign out. */
export default function Account() {
  const { t } = useT();
  if (!cloudConfigured) {
    return (
      <section className="glass panel" aria-labelledby="acct-h">
        <h2 id="acct-h" className="h2">{t('acct.title')}</h2>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t('acct.local')}</p>
      </section>
    );
  }
  return <Connected />;
}

function Connected() {
  const { t } = useT();
  const { status } = useSyncStatus();
  const [user, setUser] = useState<User | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const refresh = async () => {
    const u = await sb().auth.getUser();
    setUser(u.data.user);
    const f = await sb().auth.mfa.listFactors();
    setFactorId(f.data?.totp.find((x) => x.status === 'verified')?.id ?? null);
  };
  useEffect(() => { refresh(); }, []);

  const startEnroll = async () => {
    setBusy(true);
    setMsg('');
    try {
      // Clear half-finished attempts so a new one can start.
      const f = await sb().auth.mfa.listFactors();
      for (const x of f.data?.all ?? []) if (x.status === 'unverified') await sb().auth.mfa.unenroll({ factorId: x.id });
      const { data, error } = await sb().auth.mfa.enroll({ factorType: 'totp', friendlyName: 'ALL ' + new Date().toISOString().slice(0, 10) });
      if (error || !data) throw error;
      setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch {
      setMsg(t('auth.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass panel" aria-labelledby="acct-h">
      <h2 id="acct-h" className="h2">{t('acct.title')}</h2>
      <p className="muted" style={{ margin: 0, fontSize: 14, overflowWrap: 'anywhere' }}>{t('acct.signedIn')} <strong style={{ color: 'var(--ink)' }}>{user?.email ?? '…'}</strong></p>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t('acct.status')}: <span className={status === 'synced' ? 'ok' : undefined}>{t(`acct.st.${status}` as Key)}</span></p>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }} className="stack">
        <h3 className="pixel" style={{ margin: 0, fontSize: 17 }}>{t('acct.mfa')}</h3>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>{factorId ? t('acct.mfa.on') : t('acct.mfa.off')}</p>
        {!factorId && !enroll && <button type="button" className="btn cta" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={startEnroll}>{t('acct.mfa.enable')}</button>}
        {enroll && (
          <div className="stack">
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t('acct.mfa.scan')}</p>
            <img src={qrSrc(enroll.qr)} alt="QR" width={180} height={180} style={{ background: '#fff', borderRadius: 8, padding: 8 }} />
            <p className="faint" style={{ margin: 0 }}>{t('acct.mfa.secret')} <code style={{ userSelect: 'all', color: 'var(--ink)', overflowWrap: 'anywhere' }}>{enroll.secret}</code></p>
            <CodeForm busy={busy} msg={msg} onCode={async (code) => {
              setBusy(true);
              setMsg('');
              try {
                const ch = await sb().auth.mfa.challenge({ factorId: enroll.id });
                if (ch.error || !ch.data) throw ch.error;
                const v = await sb().auth.mfa.verify({ factorId: enroll.id, challengeId: ch.data.id, code });
                if (v.error) { setMsg(t('auth.badCode')); return; }
                setEnroll(null);
                toast(t('acct.mfa.done'));
                await refresh();
              } catch {
                setMsg(t('auth.error'));
              } finally {
                setBusy(false);
              }
            }} />
            <button type="button" className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setEnroll(null)}>{t('common.cancel')}</button>
          </div>
        )}
        {factorId && (
          <button type="button" className="btn danger" style={{ alignSelf: 'flex-start' }} onClick={async () => {
            if (!window.confirm(t('acct.mfa.confirmOff'))) return;
            const { error } = await sb().auth.mfa.unenroll({ factorId });
            if (error) toast(t('auth.error'));
            else { toast(t('acct.mfa.removed')); await refresh(); }
          }}>{t('acct.mfa.disable')}</button>
        )}
        {msg && !enroll && <p role="alert" style={{ margin: 0, fontSize: 14, color: '#ffd3dc' }}>{msg}</p>}
      </div>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }} className="stack">
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t('acct.signOut.text')}</p>
        <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} onClick={async () => {
          await signOutHere();
          clearDevice();
        }}>{t('auth.signOut')}</button>
      </div>
    </section>
  );
}
