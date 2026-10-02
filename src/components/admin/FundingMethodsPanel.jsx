import { useEffect, useState } from 'react';
import { getFundingMethods, saveFundingMethods } from '../../api';

// Settings → Wallet funding: switch bank transfer (Monnify) and card /
// USSD (Flutterwave) on or off independently, and set Flutterwave up.
// Keys are never shown back — leave a box empty to keep the saved one.
export default function FundingMethodsPanel() {
  const [d, setD] = useState(null);
  const [keys, setKeys] = useState({ publicKey: '', secretKey: '', secretHash: '' });
  const [fee, setFee] = useState({ pct: '', cap: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () => getFundingMethods().then((x) => { setD(x); setFee({ pct: String(x.cardFundingFeePercent), cap: String(x.cardFundingFeeCap) }); }).catch((e) => setMsg({ ok: false, text: e.message }));
  useEffect(() => { load(); }, []);
  async function save(body, okText) {
    setBusy(true); setMsg(null);
    try { const x = await saveFundingMethods(body); setD((p) => ({ ...p, ...x })); setMsg({ ok: true, text: okText }); return true; } catch (e) { setMsg({ ok: false, text: e.message }); return false; } finally { setBusy(false); }
  }
  if (!d) return <div className="card" style={{ margin: '0 0 16px', maxWidth: 640 }}>{msg ? <p className="error-text">{msg.text}</p> : 'Loading wallet funding…'}</div>;
  const both = d.monnifyFundingEnabled && d.flutterwaveEnabled;
  const none = !d.monnifyFundingEnabled && !d.flutterwaveEnabled;
  const row = { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid var(--slate-800)' };
  const input = { width: '100%', boxSizing: 'border-box' };

  return (
    <div className="card" style={{ margin: '0 0 16px', maxWidth: 640 }}>
      <b>💰 Wallet funding methods</b>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '4px 0 6px' }}>Turn each one on or off. Both on = customers choose. If one company has problems, switch it off and customers use the other.</p>
      <p style={{ fontSize: 13, margin: '0 0 6px', color: none ? 'var(--red-500)' : 'var(--green-500)' }}>{none ? '⚠ Both are off — customers can only use manual funding (if set up).' : both ? '✓ Customers can use bank transfer and card / USSD.' : d.monnifyFundingEnabled ? '✓ Bank transfer only.' : '✓ Card / USSD only.'}</p>

      <label style={row}>
        <input type="checkbox" checked={d.monnifyFundingEnabled} disabled={busy} onChange={(e) => save({ monnifyFundingEnabled: e.target.checked }, e.target.checked ? 'Bank transfer funding is on.' : 'Bank transfer is off — no new account numbers are shown. Money sent to existing account numbers is still credited.')} style={{ width: 'auto', marginTop: 3 }} />
        <span><b>🏦 Bank transfer (Monnify)</b><br /><span style={{ fontSize: 12, color: 'var(--slate-400)' }}>Personal account numbers. {d.monnifyReady ? 'Keys are set (Monnify tab below).' : 'Monnify keys not set yet.'} When off, money customers still send to their account number is credited anyway.</span></span>
      </label>

      <label style={row}>
        <input type="checkbox" checked={d.flutterwaveEnabled} disabled={busy} onChange={(e) => save({ flutterwaveEnabled: e.target.checked }, e.target.checked ? 'Card / USSD funding is on.' : 'Card / USSD funding is off.')} style={{ width: 'auto', marginTop: 3 }} />
        <span><b>💳 Card & USSD (Flutterwave)</b><br /><span style={{ fontSize: 12, color: 'var(--slate-400)' }}>Mode: {d.mode === 'live' ? 'LIVE' : d.mode === 'test' ? 'TEST (no real money)' : 'keys not set'}. Customers pay on Flutterwave’s secure page.</span></span>
      </label>

      <div style={{ borderTop: '1px solid var(--slate-800)', paddingTop: 10 }}>
        <b style={{ fontSize: 14 }}>Flutterwave keys</b>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '2px 0 8px' }}>From Flutterwave → Settings → API Keys. Use TEST keys first. Saved keys are never shown again; leave a box empty to keep what’s saved.</p>
        {[['publicKey', 'Public key (FLWPUBK…)'], ['secretKey', 'Secret key (FLWSECK…)'], ['secretHash', 'Webhook secret hash (make up a long password)']].map(([k, l]) => (
          <div className="field" key={k}>
            <label htmlFor={`fw-${k}`}>{l}{d.keys?.[k] ? <span style={{ color: 'var(--green-500)' }}> · saved {d.keys[k]}</span> : ''}</label>
            <input id={`fw-${k}`} type="password" autoComplete="off" value={keys[k]} onChange={(e) => setKeys((x) => ({ ...x, [k]: e.target.value }))} style={input} />
          </div>
        ))}
        <button type="button" className="btn btn-secondary" disabled={busy || !Object.values(keys).some((v) => v.trim())} onClick={async () => { const body = Object.fromEntries(Object.entries(keys).filter(([, v]) => v.trim())); if (await save(body, 'Keys saved.')) setKeys({ publicKey: '', secretKey: '', secretHash: '' }); }}>Save keys</button>
        <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 10, background: 'rgba(134,59,255,0.08)', borderRadius: 8, padding: 10 }}>
          In Flutterwave → Settings → <b>Webhooks</b>, set:<br />
          URL: <code style={{ wordBreak: 'break-all' }}>{d.webhookUrl}</code><br />
          Secret hash: the same one you typed above. Tick “Receive webhook response in JSON format” if shown.
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--slate-800)', paddingTop: 10, marginTop: 10 }}>
        <b style={{ fontSize: 14 }}>Card processing fee (added on top for the customer)</b>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <div className="field" style={{ flex: 1 }}><label htmlFor="fw-pct">Percent</label><input id="fw-pct" type="number" step="0.01" min="0" max="5" value={fee.pct} onChange={(e) => setFee((x) => ({ ...x, pct: e.target.value }))} style={input} /></div>
          <div className="field" style={{ flex: 1 }}><label htmlFor="fw-cap">Max fee (₦, 0 = no max)</label><input id="fw-cap" type="number" min="0" value={fee.cap} onChange={(e) => setFee((x) => ({ ...x, cap: e.target.value }))} style={input} /></div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '0 0 6px' }}>Flutterwave’s local card fee is about 1.4% (check your dashboard’s pricing). 0 = you absorb it.</p>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => save({ cardFundingFeePercent: Number(fee.pct || 0), cardFundingFeeCap: Number(fee.cap || 0) }, 'Fee saved.')}>Save fee</button>
      </div>

      {msg && <p style={{ fontSize: 13, margin: '10px 0 0', color: msg.ok ? 'var(--green-500)' : 'var(--red-500)' }}>{msg.text}</p>}

      {d.recent?.length > 0 && (
        <div style={{ borderTop: '1px solid var(--slate-800)', paddingTop: 10, marginTop: 10, fontSize: 12 }}>
          <b style={{ fontSize: 14 }}>Recent card payments</b>
          {d.recent.map((p) => <div key={p.txRef} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span>{new Date(p.createdAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ₦{p.amount.toLocaleString()}</span><span style={{ color: p.status === 'PAID' ? 'var(--green-500)' : p.status === 'FAILED' ? 'var(--slate-400)' : 'var(--gold)' }}>{p.status === 'PAID' ? 'Paid' : p.status === 'FAILED' ? 'Not completed' : 'Waiting'}</span></div>)}
        </div>
      )}
    </div>
  );
}
