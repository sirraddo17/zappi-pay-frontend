import { useEffect, useState } from 'react';
import { getNombaSettings, saveNombaSettings, testNomba } from '../../api';

// Settings → Wallet funding → Nomba: account numbers + Send to Bank.
// Keys are never shown back — leave a box empty to keep what's saved.
export default function NombaPanel() {
  const [d, setD] = useState(null);
  const [keys, setKeys] = useState({ clientId: '', clientSecret: '', accountId: '', webhookKey: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getNombaSettings().then(setD).catch((e) => setMsg({ ok: false, text: e.message })); }, []);
  async function run(fn, okText) {
    setBusy(true); setMsg(null);
    try { const x = await fn(); if (x && 'nombaFundingEnabled' in x) setD(x); setMsg({ ok: true, text: typeof okText === 'function' ? okText(x) : okText }); return x; } catch (e) { setMsg({ ok: false, text: e.message }); return null; } finally { setBusy(false); }
  }
  if (!d) return <div className="card" style={{ margin: '0 0 16px', maxWidth: 640 }}>{msg ? <p className="error-text">{msg.text}</p> : 'Loading Nomba…'}</div>;
  const input = { width: '100%', boxSizing: 'border-box' };
  const fields = [['clientId', 'Client ID'], ['clientSecret', 'Client secret'], ['accountId', 'Account ID (parent account)'], ['webhookKey', 'Webhook signature key']];

  return (
    <div className="card" style={{ margin: '0 0 16px', maxWidth: 640 }}>
      <b>🏦 Nomba</b>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '4px 0 6px' }}>Personal account numbers (Nombank MFB) for wallet funding, and Send to Bank. Customers can use BVN or NIN. {d.accounts} customer{d.accounts === 1 ? '' : 's'} have one.</p>

      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid var(--slate-800)' }}>
        <input type="checkbox" checked={d.nombaFundingEnabled} disabled={busy} onChange={(e) => run(() => saveNombaSettings({ nombaFundingEnabled: e.target.checked }), e.target.checked ? 'Nomba account numbers are on.' : 'Nomba account numbers are off — money sent to existing ones is still credited.')} style={{ width: 'auto', marginTop: 3 }} />
        <span><b>Turn on Nomba account numbers</b><br /><span style={{ fontSize: 12, color: 'var(--slate-400)' }}>Mode: {d.mode === 'live' ? 'LIVE' : 'SANDBOX (no real money)'} · {d.ready ? 'keys saved' : 'keys not set yet'}.</span></span>
      </label>

      <div style={{ borderTop: '1px solid var(--slate-800)', paddingTop: 10 }}>
        <b style={{ fontSize: 14 }}>Nomba keys</b>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '2px 0 8px' }}>From the Nomba dashboard → Developer → API keys (sandbox first). The webhook signature key is under Developer → Webhook Setup. Saved keys are never shown again; leave a box empty to keep it.</p>
        <div className="field">
          <label htmlFor="nb-mode">Mode</label>
          <select id="nb-mode" value={d.mode} disabled={busy} onChange={(e) => run(() => saveNombaSettings({ mode: e.target.value }), 'Mode saved.')}>
            <option value="sandbox">Sandbox (test)</option>
            <option value="live">Live</option>
          </select>
        </div>
        {fields.map(([k, l]) => (
          <div className="field" key={k}>
            <label htmlFor={`nb-${k}`}>{l}{d.keys?.[k] ? <span style={{ color: 'var(--green-500)' }}> · saved {d.keys[k]}</span> : ''}</label>
            <input id={`nb-${k}`} type="password" autoComplete="off" value={keys[k]} onChange={(e) => setKeys((x) => ({ ...x, [k]: e.target.value }))} style={input} />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" disabled={busy || !Object.values(keys).some((v) => v.trim())} onClick={async () => { const body = Object.fromEntries(Object.entries(keys).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()])); if (await run(() => saveNombaSettings(body), 'Keys saved. Tap Test connection.')) setKeys({ clientId: '', clientSecret: '', accountId: '', webhookKey: '' }); }}>Save keys</button>
          <button type="button" className="btn btn-secondary" disabled={busy || !d.ready} onClick={() => run(testNomba, (x) => (x.ok ? `Connected to Nomba (${x.mode}).${x.balance !== null && x.balance !== undefined ? ` Balance ₦${Number(x.balance).toLocaleString()}.` : ''}` : `Not connected: ${x.error}`))}>Test connection</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 10, background: 'rgba(13, 148, 136,0.08)', borderRadius: 8, padding: 10 }}>
          In Nomba → Developer → <b>Webhook Setup</b>, set the URL to:<br />
          <code style={{ wordBreak: 'break-all' }}>{d.webhookUrl}</code><br />
          and subscribe to payment_success, payout_success, payout_failed and payout_refund.
        </div>
      </div>

      {msg && <p style={{ fontSize: 13, margin: '10px 0 0', color: msg.ok ? 'var(--green-500)' : 'var(--red-500)' }}>{msg.text}</p>}
    </div>
  );
}
