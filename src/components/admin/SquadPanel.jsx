import { useEffect, useState } from 'react';
import { getSquadSettings, saveSquadSettings, testSquad, syncSquad, simulateSquadPayment } from '../../api';

// Settings → Wallet funding → Squad: personal GTBank account numbers,
// and the choice of partner for Send to Bank (Monnify or Squad).
// The secret key is never shown back — leave the box empty to keep it.
export default function SquadPanel() {
  const [d, setD] = useState(null);
  const [key, setKey] = useState('');
  const [ben, setBen] = useState('');
  const [mid, setMid] = useState('');
  const [sim, setSim] = useState({ accountNumber: '', amount: '1000' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getSquadSettings().then((x) => { setD(x); setBen(x.beneficiaryAccount || ''); }).catch((e) => setMsg({ ok: false, text: e.message })); }, []);
  async function run(fn, okText) {
    setBusy(true); setMsg(null);
    try { const x = await fn(); if (x && 'squadFundingEnabled' in x) setD(x); setMsg({ ok: true, text: typeof okText === 'function' ? okText(x) : okText }); return x; } catch (e) { setMsg({ ok: false, text: e.message }); return null; } finally { setBusy(false); }
  }
  if (!d) return <div className="card" style={{ margin: '0 0 16px', maxWidth: 640 }}>{msg ? <p className="error-text">{msg.text}</p> : 'Loading Squad…'}</div>;
  const row = { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid var(--slate-800)' };
  const input = { width: '100%', boxSizing: 'border-box' };
  const keySet = d.source !== 'none';

  return (
    <div className="card" style={{ margin: '0 0 16px', maxWidth: 640 }}>
      <b>🏦 GTBank account numbers (Squad)</b>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '4px 0 6px' }}>Personal GTBank account numbers for automatic wallet funding. Squad’s fee is lower than Monnify’s. Customers need their BVN (not NIN). {d.accounts} customer{d.accounts === 1 ? '' : 's'} have one.</p>

      <label style={row}>
        <input type="checkbox" checked={d.squadFundingEnabled} disabled={busy} onChange={(e) => run(() => saveSquadSettings({ squadFundingEnabled: e.target.checked }), e.target.checked ? 'Squad is on.' : 'Squad is off — no new GTBank numbers. Money sent to existing ones is still credited.')} style={{ width: 'auto', marginTop: 3 }} />
        <span><b>Turn on GTBank account numbers</b><br /><span style={{ fontSize: 12, color: 'var(--slate-400)' }}>Mode: {d.mode === 'live' ? 'LIVE' : 'SANDBOX (no real money)'}{keySet ? ` · key saved ${d.secretKey}` : ' · no key yet'}.</span></span>
      </label>
      <label style={row}>
        <input type="checkbox" checked={d.squadPrimary} disabled={busy || !d.squadFundingEnabled} onChange={(e) => run(() => saveSquadSettings({ squadPrimary: e.target.checked }), e.target.checked ? 'New customers now get a GTBank account number.' : 'New customers get Monnify account numbers again.')} style={{ width: 'auto', marginTop: 3 }} />
        <span><b>Make it the main option for new customers</b><br /><span style={{ fontSize: 12, color: 'var(--slate-400)' }}>Off = new customers get Monnify; customers who already have account numbers can still add a GTBank one.</span></span>
      </label>

      <div style={{ borderTop: '1px solid var(--slate-800)', paddingTop: 10 }}>
        <b style={{ fontSize: 14 }}>Squad keys</b>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '2px 0 8px' }}>From the Squad dashboard → Profile/Settings → API &amp; Webhook. Use the sandbox key first (starts with sandbox_sk_). Saved keys are never shown again.</p>
        <div className="field">
          <label htmlFor="sq-mode">Mode</label>
          <select id="sq-mode" value={d.mode} disabled={busy} onChange={(e) => run(() => saveSquadSettings({ mode: e.target.value }), 'Mode saved.')}>
            <option value="sandbox">Sandbox (test)</option>
            <option value="live">Live</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="sq-key">Secret key</label>
          <input id="sq-key" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} style={input} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" disabled={busy || !key.trim()} onClick={async () => { if (await run(() => saveSquadSettings({ secretKey: key.trim() }), 'Key saved. Tap Test connection.')) setKey(''); }}>Save key</button>
          <button type="button" className="btn btn-secondary" disabled={busy || !keySet} onClick={() => run(testSquad, (x) => (x.ok ? `Connected to Squad (${x.mode}).${x.hints?.length ? ` ${x.hints.join(' ')}` : ''}` : `Not connected: ${x.error}${x.hints?.length ? ` ${x.hints.join(' ')}` : ''}`))}>Test connection</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 10, background: 'rgba(13, 148, 136,0.08)', borderRadius: 8, padding: 10 }}>
          In Squad → Profile/Settings → <b>API &amp; Webhook</b>, set the webhook URL to:<br />
          <code style={{ wordBreak: 'break-all' }}>{d.webhookUrl}</code>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--slate-800)', paddingTop: 10, marginTop: 10 }}>
        <b style={{ fontSize: 14 }}>GTBank settlement account (optional)</b>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '2px 0 8px' }}>Your company GTBank account (10 digits). If set, money goes there instantly; if empty, it collects in your Squad balance and settles next working day. Only affects NEW account numbers.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input inputMode="numeric" maxLength={10} value={ben} onChange={(e) => setBen(e.target.value.replace(/\D/g, ''))} style={{ ...input, flex: 1 }} aria-label="GTBank settlement account" />
          <button type="button" className="btn btn-secondary" style={{ width: 'auto', flex: '0 0 auto' }} disabled={busy} onClick={() => run(() => saveSquadSettings({ beneficiaryAccount: ben }), 'Settlement account saved.')}>Save</button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--slate-800)', paddingTop: 10, marginTop: 10 }}>
        <b style={{ fontSize: 14 }}>Send to Bank through</b>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '2px 0 8px' }}>Which partner pays out customer withdrawals and supplier payments. Squad: ₦8 / ₦15 / ₦40 per transfer, no OTP. Transfers already sent are always checked with the partner that sent them. Make sure the chosen partner’s wallet has money.</p>
        <div className="field">
          <label htmlFor="sq-mid">Squad merchant ID{d.merchantId ? <span style={{ color: 'var(--green-500)' }}> · saved {d.merchantId}</span> : ''}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input id="sq-mid" autoComplete="off" placeholder="Top of your Squad dashboard, e.g. SBABCKDY" value={mid} onChange={(e) => setMid(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} style={{ ...input, flex: 1 }} />
            <button type="button" className="btn btn-secondary" style={{ width: 'auto', flex: '0 0 auto' }} disabled={busy || !mid} onClick={async () => { if (await run(() => saveSquadSettings({ merchantId: mid }), 'Merchant ID saved.')) setMid(''); }}>Save</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['monnify', 'Monnify'], ['squad', 'Squad']].map(([v, l]) => (
            <button key={v} type="button" className={d.payoutProvider === v ? 'btn' : 'btn btn-secondary'} disabled={busy || d.payoutProvider === v || (v === 'squad' && !d.payoutReady)} onClick={() => run(() => saveSquadSettings({ payoutProvider: v }), `Bank transfers now go out through ${l}.`)}>{l}</button>
          ))}
        </div>
        {!d.payoutReady && <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '6px 0 0' }}>Save the Squad key and merchant ID to allow Squad.</p>}
      </div>

      <div style={{ borderTop: '1px solid var(--slate-800)', paddingTop: 10, marginTop: 10 }}>
        <b style={{ fontSize: 14 }}>Missed payments</b>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '2px 0 8px' }}>Payments Squad couldn’t deliver to us are re-checked every 10 minutes. Frozen payments are never credited — you get an alert.</p>
        <button type="button" className="btn btn-secondary" disabled={busy || !keySet} onClick={() => run(syncSquad, (x) => `Checked ${x.checked} · credited ${x.credited}.`)}>Check now</button>
      </div>

      {d.mode === 'sandbox' && keySet && (
        <div style={{ borderTop: '1px solid var(--slate-800)', paddingTop: 10, marginTop: 10 }}>
          <b style={{ fontSize: 14 }}>Send a test payment (sandbox)</b>
          <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '2px 0 8px' }}>Pretend someone paid into a test GTBank account number. The wallet should be credited within a minute.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input inputMode="numeric" maxLength={10} placeholder="Account number" value={sim.accountNumber} onChange={(e) => setSim((x) => ({ ...x, accountNumber: e.target.value.replace(/\D/g, '') }))} style={{ flex: 2, minWidth: 140 }} aria-label="Test account number" />
            <input inputMode="numeric" placeholder="₦" value={sim.amount} onChange={(e) => setSim((x) => ({ ...x, amount: e.target.value.replace(/\D/g, '') }))} style={{ flex: 1, minWidth: 80 }} aria-label="Test amount" />
            <button type="button" className="btn btn-secondary" style={{ width: 'auto', flex: '1 0 100%' }} disabled={busy || sim.accountNumber.length !== 10} onClick={() => run(() => simulateSquadPayment({ accountNumber: sim.accountNumber, amount: Number(sim.amount) }), 'Test payment sent. Check that customer’s wallet.')}>Send</button>
          </div>
        </div>
      )}

      {msg && <p style={{ fontSize: 13, margin: '10px 0 0', color: msg.ok ? 'var(--green-500)' : 'var(--red-500)' }}>{msg.text}</p>}
    </div>
  );
}
