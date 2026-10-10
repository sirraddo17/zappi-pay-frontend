import { useEffect, useState } from 'react';
import { getSafePricing, applySafePricing } from '../../api';

const naira = (n) => `${n < 0 ? '−' : ''}₦${Math.abs(Number(n || 0)).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

// "Safe pricing": checks typical sales against VTpass commission − Monnify's
// fee and offers one click to set discounts, agent commission, service
// charges and the rewards split so normal sales never lose money.
export default function SafePricingPanel({ onApplied }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(false);
  const [view, setView] = useState('now');

  useEffect(() => { getSafePricing().then(setD).catch((e) => setErr(e.message)); }, []);

  async function apply() {
    setBusy(true);
    setErr('');
    try {
      await applySafePricing();
      onApplied?.();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  const table = d?.[view];
  const agents = table?.rows.some((r) => r.agent !== null);
  return (
    <div className="card" style={{ margin: '0 0 16px', maxWidth: 720, border: '1px solid var(--green-500, #22c55e)' }}>
      <div style={{ fontWeight: 700, fontSize: 16 }}>✅ Safe pricing check</div>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: '4px 0 10px' }}>
        What you keep on typical sales: VTpass commission + your service charge − discounts − Monnify's fee (about 1.61%) on the money the customer funded with. Cashback, points and referral bonuses come out of this, and the rewards split only shares what's left, so they can't make a sale lose money.
      </p>
      {err && <p className="error-text" style={{ margin: '0 0 8px' }}>{err}</p>}
      {!d && !err && <p style={{ fontSize: 13 }}>Checking…</p>}
      {d && (
        <>
          <p style={{ margin: '0 0 8px', fontWeight: 600, color: d.now.losses ? 'var(--red-500)' : 'var(--green-500)' }}>
            {d.now.losses ? `⚠️ ${d.now.losses} of these sales lose money with your current prices.` : '👍 None of these sales lose money with your current prices.'}
          </p>
          {d.changes.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button type="button" className={`btn ${view === 'now' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => setView('now')}>Now</button>
              <button type="button" className={`btn ${view === 'after' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => setView('after')}>With safe pricing</button>
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--slate-400)' }}>
                  <th style={{ padding: 4 }}>Sale</th><th style={{ padding: 4 }}>Amount</th><th style={{ padding: 4 }}>You keep</th>{agents && <th style={{ padding: 4 }}>Agent sale</th>}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r) => (
                  <tr key={`${r.label}-${r.amount}`} style={{ borderTop: '1px solid var(--slate-700, #334155)' }}>
                    <td style={{ padding: 4 }}>{r.label}</td>
                    <td style={{ padding: 4 }}>{naira(r.amount)}</td>
                    <td style={{ padding: 4, color: r.customer < 0 ? 'var(--red-500)' : undefined, fontWeight: r.customer < 0 ? 700 : 400 }}>{naira(r.customer)}</td>
                    {agents && <td style={{ padding: 4, color: r.agent < 0 ? 'var(--red-500)' : undefined, fontWeight: r.agent < 0 ? 700 : 400 }}>{r.agent === null ? '—' : naira(r.agent)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '8px 0' }}>{d.note}</p>
          {d.changes.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--green-500)', margin: 0 }}>Your prices already match safe pricing.</p>
          ) : (
            <>
              <div style={{ fontWeight: 600, fontSize: 14, margin: '10px 0 4px' }}>Safe pricing would change:</div>
              <ul style={{ fontSize: 13, margin: '0 0 8px', paddingLeft: 18 }}>
                {d.changes.map((c) => <li key={c}>{c}</li>)}
              </ul>
              <details style={{ fontSize: 13, marginBottom: 10 }}>
                <summary style={{ cursor: 'pointer' }}>Why these numbers?</summary>
                <ul style={{ paddingLeft: 18, margin: '6px 0 0' }}>
                  {Object.entries(d.why).map(([k, v]) => <li key={k}><strong>{k.toLowerCase()}:</strong> {v}</li>)}
                </ul>
              </details>
              <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '0 0 8px' }}>It only makes things safer: discounts are lowered (never raised), service charges raised (never lowered). Everything stays editable below.</p>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 8 }}>
                <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} style={{ width: 'auto' }} /> I've read the changes — customers see the new prices straight away
              </label>
              <button type="button" className="btn btn-primary" disabled={!sure || busy} onClick={apply}>{busy ? 'Applying…' : 'Apply safe pricing'}</button>
            </>
          )}
        </>
      )}
    </div>
  );
}
