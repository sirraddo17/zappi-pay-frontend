import { useEffect, useState } from 'react';
import { getDeliveryPromise, saveDeliveryPromise } from '../../api';

const LABEL = { AIRTIME: 'Airtime', DATA: 'Data', ELECTRICITY: 'Electricity', CABLE: 'Cable TV', EDUCATION: 'Exam PINs', INTERNET: 'Internet', BETTING: 'Betting' };
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

// Settings → Delivery promise: "Delivered in 60s or ₦20 back".
export default function DeliveryPromisePanel() {
  const [c, setC] = useState(null);
  const [stats, setStats] = useState(null);
  const [all, setAll] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    getDeliveryPromise().then((d) => { setC(d.config); setStats(d.stats); setAll(d.services); }).catch((e) => setErr(e.message));
  }, []);
  if (!c) return <div className="card">{err ? <p className="error-text">{err}</p> : 'Loading…'}</div>;

  const set = (k) => (e) => setC({ ...c, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const toggle = (k) => setC({ ...c, services: c.services.includes(k) ? c.services.filter((x) => x !== k) : [...c.services, k] });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const d = await saveDeliveryPromise(c);
      setC(d.config);
      setMsg(d.config.enabled ? 'Saved — customers now see the promise on the Buy page.' : 'Saved — the promise is off.');
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  const num = (k, label, hint) => (
    <div className="field" style={{ flex: '1 1 140px' }}>
      <label htmlFor={`dp-${k}`}>{label}</label>
      <input id={`dp-${k}`} type="number" inputMode="numeric" value={c[k]} onChange={set(k)} />
      {hint && <small style={{ color: 'var(--slate-400)' }}>{hint}</small>}
    </div>
  );

  return (
    <form className="card" style={{ maxWidth: 640 }} onSubmit={save}>
      <h2 style={{ marginTop: 0, fontSize: 16, marginBottom: 4 }}>⚡ Delivery promise</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: 0 }}>
        Show “Delivered in {c.seconds} seconds or {naira(c.bonus)} back” on the Buy page. If a purchase takes longer than that to confirm, the customer gets the bonus automatically. Quick failures (like a wrong number) don’t count, each customer gets at most one bonus a day, and it stops once the daily budget is used.
      </p>
      {stats && (
        <p style={{ fontSize: 13, margin: '0 0 12px' }}>
          Paid today: <b>{naira(stats.today.amount)}</b> ({stats.today.count}) · last 30 days: <b>{naira(stats.last30.amount)}</b> ({stats.last30.count})
        </p>
      )}
      {err && <p className="error-text" style={{ margin: '0 0 8px' }}>{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)', fontSize: 13, margin: '0 0 8px' }}>{msg}</p>}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, fontWeight: 600 }}>
        <input type="checkbox" checked={c.enabled} onChange={set('enabled')} style={{ width: 'auto' }} /> Turn on the delivery promise
      </label>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {num('seconds', 'Promise (seconds)', '30 – 600')}
        {num('bonus', 'Bonus (₦)', 'Paid to the wallet')}
        {num('minAmount', 'Min purchase (₦)', 'Smaller buys don’t qualify')}
        {num('dailyBudget', 'Daily budget (₦)', 'Across all customers')}
      </div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>Services covered:</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {all.map((k) => (
          <label key={k} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, padding: '6px 10px', borderRadius: 8, border: `1px solid ${c.services.includes(k) ? 'var(--purple)' : 'var(--slate-700)'}` }}>
            <input type="checkbox" checked={c.services.includes(k)} onChange={() => toggle(k)} style={{ width: 'auto' }} /> {LABEL[k] || k}
          </label>
        ))}
      </div>
      <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>Tip: airtime and data usually arrive in seconds. Electricity tokens and TV renewals can be slow on the provider’s side, so covering them costs more.</p>
      <button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </form>
  );
}
