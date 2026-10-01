import { useEffect, useState } from 'react';
import { getBackupCodes, makeBackupCodes } from '../../api';
import PasswordField from '../PasswordField';

// Settings → Security: one-time backup codes for two-step login, for
// when the email code can't be sent (email service down or expired).
export default function BackupCodesPanel() {
  const [st, setSt] = useState(null);
  const [pw, setPw] = useState('');
  const [codes, setCodes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { getBackupCodes().then(setSt).catch(() => setSt({ left: 0 })); }, []);

  async function make(e) {
    e.preventDefault();
    if (st?.left && !window.confirm('Make new codes? Your old codes will stop working.')) return;
    setBusy(true);
    setMsg('');
    try {
      const r = await makeBackupCodes(pw);
      setCodes(r.codes);
      setPw('');
      setSt({ left: r.codes.length, createdAt: new Date().toISOString() });
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(`ZAPPI PAY admin backup codes (each works once)\n${codes.join('\n')}`); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* select manually */ }
  }

  return (
    <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'var(--slate-900)' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>🔑 Backup codes</div>
      <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '0 0 8px' }}>
        If the login email can’t be sent (email service down or expired), log in with one of these instead. Each code works once. Save them somewhere safe — not in this phone’s photos or chats.
        {st && <> You have <b style={{ color: st.left ? 'var(--green-500)' : 'var(--gold)' }}>{st.left}</b> unused{st.createdAt ? ` (made ${new Date(st.createdAt).toLocaleDateString('en-NG')})` : ''}.</>}
      </p>
      {codes ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontFamily: 'monospace', fontSize: 15, margin: '8px 0', userSelect: 'all' }}>
            {codes.map((c) => <div key={c} style={{ background: 'var(--slate-800)', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>{c}</div>)}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={copy}>{copied ? 'Copied ✓' : 'Copy codes'}</button>
            <button type="button" className="btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={() => setCodes(null)}>I’ve saved them</button>
          </div>
          <p style={{ color: 'var(--gold)', fontSize: 12, margin: '6px 0 0' }}>These are shown only once.</p>
        </>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label htmlFor="bcPw" style={{ fontSize: 12, color: 'var(--slate-400)' }}>Your admin password</label>
            <PasswordField id="bcPw" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
          </div>
          <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} disabled={busy || !pw} onClick={make}>{busy ? 'Making…' : st?.left ? 'Make new codes' : 'Make backup codes'}</button>
        </div>
      )}
      {msg && <p className="error-text" style={{ margin: '6px 0 0' }}>{msg}</p>}
    </div>
  );
}
