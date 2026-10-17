import { useEffect, useState } from 'react';
import { getPaymentPartners, savePaymentPartners } from '../../api';

const NAMES = { monnify: 'Monnify', squad: 'Squad', nomba: 'Nomba' };

// Settings → Wallet funding → Payment partners: who gives new customers
// account numbers, who sends Send to Bank, and the automatic backup.
export default function PaymentPartnersPanel() {
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () => getPaymentPartners().then(setD).catch((e) => setMsg({ ok: false, text: e.message }));
  useEffect(() => { load(); }, []);
  async function save(body, okText) {
    setBusy(true); setMsg(null);
    try { setD(await savePaymentPartners(body)); setMsg({ ok: true, text: okText }); } catch (e) { setMsg({ ok: false, text: e.message }); } finally { setBusy(false); }
  }
  if (!d) return <div className="card" style={{ margin: '0 0 16px', maxWidth: 640 }}>{msg ? <p className="error-text">{msg.text}</p> : 'Loading payment partners…'}</div>;
  const readyCount = Object.values(d.ready).filter(Boolean).length;
  const block = { borderTop: '1px solid var(--slate-800)', paddingTop: 10, marginTop: 10 };

  return (
    <div className="card" style={{ margin: '0 0 16px', maxWidth: 640 }}>
      <b>🤝 Payment partners</b>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '4px 0 0' }}>Customers never see partner names. Set each partner up in its own box below first.</p>

      <div style={block}>
        <b style={{ fontSize: 14 }}>New customers get account numbers from</b>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          {[['', 'Automatic'], ['monnify', 'Monnify'], ['squad', 'Squad'], ['nomba', 'Nomba']].map(([v, l]) => (
            <button key={v || 'auto'} type="button" style={{ width: 'auto' }} className={d.fundingPrimary === v ? 'btn' : 'btn btn-secondary'} disabled={busy || d.fundingPrimary === v || (v && !d.funding[v])} onClick={() => save({ fundingPrimary: v }, v ? `New customers now get ${l} account numbers.` : 'Back to automatic.')}>{l}</button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '6px 0 0' }}>Customers who already have account numbers can add the other partners’ numbers from their Wallet page. Money sent to any of them is credited.</p>
      </div>

      <div style={block}>
        <b style={{ fontSize: 14 }}>Send to Bank goes out through</b>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          {['monnify', 'squad', 'nomba'].map((v) => (
            <button key={v} type="button" style={{ width: 'auto' }} className={d.payoutProvider === v ? 'btn' : 'btn btn-secondary'} disabled={busy || d.payoutProvider === v || !d.ready[v]} onClick={() => save({ payoutProvider: v }, `Bank transfers now go out through ${NAMES[v]}.`)}>{NAMES[v]}{d.ready[v] ? '' : ' (not set up)'}</button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '6px 0 0' }}>Transfers already sent are always checked with the partner that sent them. Keep money in the chosen partner’s wallet.</p>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingTop: 10 }}>
          <input type="checkbox" checked={d.payoutFallback} disabled={busy} onChange={(e) => save({ payoutFallback: e.target.checked }, e.target.checked ? 'Automatic backup is on.' : 'Automatic backup is off.')} style={{ width: 'auto', marginTop: 3 }} />
          <span><b>Automatic backup</b><br /><span style={{ fontSize: 12, color: 'var(--slate-400)' }}>If the main partner clearly can’t send (refused, account check down, wallet too low), the next ready partner sends it — Monnify, then Squad, then Nomba. Never on timeouts, so nothing is paid twice. You get an alert. {readyCount < 2 ? 'Needs at least two partners set up.' : `${readyCount} partners ready.`}</span></span>
        </label>
      </div>

      {msg && <p style={{ fontSize: 13, margin: '10px 0 0', color: msg.ok ? 'var(--green-500)' : 'var(--red-500)' }}>{msg.text}</p>}
    </div>
  );
}
