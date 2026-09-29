import { useState } from 'react';
import { estimateEarnings } from '../../api';

const money = (n) => `${Number(n) < 0 ? '−' : ''}₦${Math.abs(Number(n || 0)).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

// Everything a customer can spend on, with VTpass's serviceIDs.
const OPTIONS = [
  ['AIRTIME', 'mtn', 'MTN airtime'], ['AIRTIME', 'airtel', 'Airtel airtime'], ['AIRTIME', 'glo', 'Glo airtime'], ['AIRTIME', 'etisalat', '9mobile airtime'],
  ['DATA', 'mtn-data', 'MTN data'], ['DATA', 'airtel-data', 'Airtel data'], ['DATA', 'glo-data', 'Glo data'], ['DATA', 'etisalat-data', '9mobile data'],
  ['ELECTRICITY', 'ikeja-electric', 'Ikeja Electric'], ['ELECTRICITY', 'eko-electric', 'Eko (EKEDC)'], ['ELECTRICITY', 'ibadan-electric', 'Ibadan (IBEDC)'],
  ['ELECTRICITY', 'abuja-electric', 'Abuja (AEDC)'], ['ELECTRICITY', 'portharcourt-electric', 'Port Harcourt (PHED)'], ['ELECTRICITY', 'enugu-electric', 'Enugu (EEDC)'],
  ['ELECTRICITY', 'benin-electric', 'Benin (BEDC)'], ['ELECTRICITY', 'kaduna-electric', 'Kaduna'], ['ELECTRICITY', 'kano-electric', 'Kano'],
  ['ELECTRICITY', 'jos-electric', 'Jos (JED)'], ['ELECTRICITY', 'aba-electric', 'Aba'], ['ELECTRICITY', 'yola-electric', 'Yola'],
  ['CABLE', 'dstv', 'DStv'], ['CABLE', 'gotv', 'GOtv'], ['CABLE', 'startimes', 'Startimes'],
  ['INTERNET', 'smile-direct', 'Smile internet'],
  ['EDUCATION', 'waec', 'WAEC result checker PIN'], ['EDUCATION', 'waec-registration', 'WAEC registration PIN'],
  ['SEND_TO_BANK', '', 'Send to bank'], ['TRANSFER', '', 'ZappiPay to ZappiPay transfer'], ['AIRTIME_CASH', '', 'Airtime to Cash'],
];

// "If a customer spends ₦X, what do I keep?" — uses your live markup,
// discount and fee settings plus VTpass/Monnify's published rates.
export default function EarningsCalculator() {
  const [amount, setAmount] = useState('1000');
  const [funding, setFunding] = useState('wallet');
  const [agent, setAgent] = useState(false);
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(e) {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const items = OPTIONS.map(([service, provider]) => ({ service, provider, amount: Number(amount), funding, agent }));
      const r = await estimateEarnings({ items });
      setRows(r.results.map((x, i) => ({ ...x, label: OPTIONS[i][2] })));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ margin: '12px 0 0' }}>
      <div style={{ fontWeight: 600 }}>🧮 Earnings calculator</div>
      <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 10px' }}>
        What you keep when a customer spends this amount on each service — using your current markup, discounts and fees, VTpass's commission and Monnify's charges.
      </p>
      <form onSubmit={run} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ margin: 0, flex: '1 1 120px' }}>
          <label htmlFor="ec-amt">Amount (₦)</label>
          <input id="ec-amt" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="field" style={{ margin: 0, flex: '2 1 220px' }}>
          <label htmlFor="ec-fund">Customer's money came from</label>
          <select id="ec-fund" value={funding} onChange={(e) => setFunding(e.target.value)}>
            <option value="wallet">Wallet balance / manual funding (no Monnify fee)</option>
            <option value="bank">Just funded by bank transfer (Monnify fee applies)</option>
          </select>
        </div>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, paddingBottom: 10 }}>
          <input type="checkbox" checked={agent} onChange={(e) => setAgent(e.target.checked)} style={{ width: 'auto' }} /> Agent prices
        </label>
        <button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy || !(Number(amount) > 0)}>{busy ? 'Working…' : 'Calculate'}</button>
      </form>
      {error && <p className="error-text" style={{ margin: '8px 0 0' }}>{error}</p>}
      {rows && (
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Service</th><th>Customer pays</th><th style={{ textAlign: 'right' }}>You keep</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} onClick={() => setOpen(open === i ? null : i)} style={{ cursor: 'pointer' }}>
                <td>
                  {r.label} <span style={{ color: 'var(--slate-400)', fontSize: 11 }}>{open === i ? '▲' : '▼'}</span>
                  {open === i && (
                    <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 12, color: 'var(--slate-300, #cbd5e1)' }}>
                      {r.error ? <li>{r.error}</li> : r.lines.map((l) => <li key={l.label}>{l.label}: {money(l.amount)}</li>)}
                    </ul>
                  )}
                </td>
                <td>{r.error ? '—' : money(r.customerPays)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: r.profit > 0 ? 'var(--green-500)' : r.profit < 0 ? 'var(--red-500)' : 'var(--slate-400)' }}>{r.error ? '—' : money(r.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '8px 0 0' }}>
        VTpass and Monnify rates are their published prices — check your own dashboards, as account rates can differ. Tap a row to see each line.
      </p>
    </div>
  );
}
