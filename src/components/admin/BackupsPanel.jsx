import { useEffect, useState } from 'react';
import { getBackup, saveBackupEmails, runBackupNow, downloadBackup } from '../../api';

// Settings → Backups: nightly database backups emailed to up to 3
// addresses, plus "Send now" and "Download". The file is locked with
// BACKUP_PASSWORD (set in the server settings (.env)) — never stored in the app.
export default function BackupsPanel() {
  const [d, setD] = useState(null);
  const [emails, setEmails] = useState(['', '', '']);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState('');
  const show = (x) => { setD(x); setEmails([...(x.emails || []), '', '', ''].slice(0, 3)); };
  useEffect(() => { getBackup().then(show).catch((e) => setMsg({ ok: false, text: e.message })); }, []);

  async function act(kind, fn) {
    setBusy(kind);
    setMsg(null);
    try { await fn(); } catch (e) { setMsg({ ok: false, text: e.message }); } finally { setBusy(''); }
  }
  if (!d) return <div className="card" style={{ margin: 0, maxWidth: 560 }}>{msg ? <p className="error-text">{msg.text}</p> : 'Loading…'}</div>;
  const when = (t) => (t ? new Date(t).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'never');
  const ready = d.passwordSet && d.emailReady && d.emails.length > 0;
  const input = { width: '100%', boxSizing: 'border-box' };

  return (
    <div className="card" style={{ margin: 0, maxWidth: 560 }}>
      <h2 style={{ marginTop: 0, fontSize: 16, marginBottom: 4 }}>💾 Database backups</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: 0 }}>Every night (about 2am) a full copy of the database — customers, wallets, transactions, orders, transfers and settings — is emailed to the addresses below. The file is locked with your backup password, so it’s useless to anyone without it.</p>

      <div style={{ fontSize: 13, background: 'rgba(13, 148, 136,0.08)', borderRadius: 8, padding: 10, margin: '0 0 12px' }}>
        <div>{d.passwordSet ? '✅' : '🔴'} Backup password {d.passwordSet ? 'is set on the server' : <>not set — on the server, add <code>BACKUP_PASSWORD</code> (12+ characters, write it down somewhere safe) to <code>/opt/zappi-pay-backend/.env</code>, then run <code>pm2 restart zappi-pay-api</code></>}</div>
        <div>{d.emailReady ? '✅' : '🔴'} Email sending {d.emailReady ? 'works' : 'is not set up on the server (RESEND_API_KEY / EMAIL_FROM)'}</div>
        <div>{d.lastOkAt ? '✅' : '🟠'} Last backup sent: <b>{when(d.lastOkAt)}</b>{d.lastStatus ? ` — ${d.lastStatus}` : ''}</div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); act('save', async () => { show(await saveBackupEmails(emails.map((x) => x.trim()).filter(Boolean))); setMsg({ ok: true, text: 'Backup emails saved.' }); }); }}>
        {[0, 1, 2].map((i) => (
          <div className="field" key={i}>
            <label htmlFor={`bk-${i}`}>{i === 0 ? 'Backup email' : `Backup email ${i + 1} (optional)`}</label>
            <input id={`bk-${i}`} type="email" autoComplete="off" value={emails[i]} onChange={(e) => setEmails((x) => x.map((v, j) => (j === i ? e.target.value : v)))} placeholder={i === 0 ? 'e.g. sirraddoventures@gmail.com' : 'another inbox you control'} style={input} />
          </div>
        ))}
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '-4px 0 10px' }}>Each backup goes to every address. Use inboxes on different accounts, so losing one account doesn’t lose your backups.</p>
        <button type="submit" className="btn" style={{ width: 'auto' }} disabled={Boolean(busy)}>{busy === 'save' ? 'Saving…' : 'Save emails'}</button>
      </form>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, borderTop: '1px solid var(--slate-700)', paddingTop: 14 }}>
        <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} disabled={Boolean(busy) || !ready} onClick={() => act('run', async () => { const r = await runBackupNow(); show(r.status); setMsg({ ok: true, text: r.message }); })}>{busy === 'run' ? 'Sending…' : '📧 Send a backup now'}</button>
        <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} disabled={Boolean(busy) || !d.passwordSet} onClick={() => act('dl', async () => { await downloadBackup(); setMsg({ ok: true, text: 'Backup downloaded.' }); })}>{busy === 'dl' ? 'Preparing…' : '⬇️ Download a backup'}</button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '8px 0 0' }}>Download one before any big change (like moving servers). To restore, see docs/BACKUP.md in the backend repo — you need the .zpbak file and the backup password.</p>
      {msg && <p style={{ fontSize: 13, margin: '10px 0 0', color: msg.ok ? 'var(--green-500)' : 'var(--red-500)' }}>{msg.text}</p>}
    </div>
  );
}
