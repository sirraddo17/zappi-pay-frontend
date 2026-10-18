import { Fragment, useState } from 'react';
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

// "If a customer spends ₦X, what do I keep?" — side by side for money that
// came in through Monnify and through Squad, using your live markup,
// discount, fee and reward settings plus VTpass/partner published rates.
const PARTNERS = [['monnify', 'Monnify'], ['squad', 'Squad']];

function Lines({ r }) {
  if (!r) return null;
  if (r.error) return <li>{r.error}</li>;
  return r.lines.map((l) => <li key={l.label}>{l.label}{l.amount ? `: ${money(l.amount)}` : ''}</li>);
}

const keepStyle = (v) => ({ textAlign: 'right', fontWeight: 700, color: v > 0 ? 'var(--green-500)' : v < 0 ? 'var(--red-500)' : 'var(--slate-400)' });

export default function EarningsCalculator() {
  const [amount, setAmount] = useState('1000');
  const [coverFee, setCoverFee] = useState(true);
  const [allRewards, setAllRewards] = useState(true);
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
      const items = OPTIONS.flatMap(([service, provider]) => PARTNERS.map(([funding]) => ({ service, provider, amount: Number(amount), funding, agent, coverFee, allRewards })));
      const r = await estimateEarnings({ items });
      setRows(OPTIONS.map((o, i) => ({ label: o[2], monnify: r.results[i * 2], squad: r.results[i * 2 + 1] })));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const cell = (x) => (x && !x.error ? money(x.profit) : '—');

  return (
    <div className="card" style={{ margin: '12px 0 0' }}>
      <div style={{ fontWeight: 600 }}>🧮 Earnings calculator</div>
      <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 10px' }}>
        What you keep when a customer funds their wallet with this amount and spends it on each service — through Monnify and through Squad — after VTpass's commission, your markup and discounts, the deposit fee and every reward you've switched on.
      </p>
      <form onSubmit={run} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ margin: 0, flex: '1 1 120px' }}>
          <label htmlFor="ec-amt">Amount (₦)</label>
          <input id="ec-amt" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, paddingBottom: 10 }}>
          <input type="checkbox" checked={coverFee} onChange={(e) => setCoverFee(e.target.checked)} style={{ width: 'auto' }} /> I cover the deposit fee (customer pays no funding fee)
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, paddingBottom: 10 }}>
          <input type="checkbox" checked={allRewards} onChange={(e) => setAllRewards(e.target.checked)} style={{ width: 'auto' }} /> Count all rewards (referral, challenges, rewards split)
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, paddingBottom: 10 }}>
          <input type="checkbox" checked={agent} onChange={(e) => setAgent(e.target.checked)} style={{ width: 'auto' }} /> Agent prices
        </label>
        <button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy || !(Number(amount) > 0)}>{busy ? 'Working…' : 'Calculate'}</button>
      </form>
      {error && <p className="error-text" style={{ margin: '8px 0 0' }}>{error}</p>}
      {rows && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ marginTop: 12 }}>
            <thead><tr><th>Service</th><th>Customer pays</th><th style={{ textAlign: 'right' }}>You keep · Monnify</th><th style={{ textAlign: 'right' }}>You keep · Squad</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <Fragment key={r.label}>
                  <tr onClick={() => setOpen(open === i ? null : i)} style={{ cursor: 'pointer' }}>
                    <td>{r.label} <span style={{ color: 'var(--slate-400)', fontSize: 11 }}>{open === i ? '▲' : '▼'}</span></td>
                    <td>{r.monnify && !r.monnify.error ? money(r.monnify.customerPays) : '—'}</td>
                    <td style={keepStyle(r.monnify?.profit)}>{cell(r.monnify)}</td>
                    <td style={keepStyle(r.squad?.profit)}>{cell(r.squad)}</td>
                  </tr>
                  {open === i && (
                    <tr>
                      <td colSpan={4} data-nolabel="" style={{ textAlign: 'left' }}>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', width: '100%', fontSize: 12, color: 'var(--slate-300, #cbd5e1)' }}>
                          {PARTNERS.map(([k, name]) => (
                            <div key={k} style={{ flex: '1 1 240px' }}>
                              <strong>{r.label} through {name}</strong>
                              <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}><Lines r={r[k]} /></ul>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '8px 0 0' }}>
        Referral bonuses and challenge rewards are spread over the spending they need (worst case: every customer was invited and finishes every challenge). With Rewards split on, all rewards come from its share instead. VTpass and partner rates are their published prices — your account rates can differ. Tap a row to see each line.
      </p>
    </div>
  );
}
