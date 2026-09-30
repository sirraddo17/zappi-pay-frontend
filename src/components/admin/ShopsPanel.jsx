import { useEffect, useState } from 'react';
import { getAdminShops, saveAdminShops } from '../../api';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

// Settings → Agent shops: commission for sales through agent links.
export default function ShopsPanel() {
  const [c, setC] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    getAdminShops().then((d) => { setC(d.config); setInfo(d); }).catch((e) => setErr(e.message));
  }, []);
  if (!c) return <div className="card">{err ? <p className="error-text">{err}</p> : 'Loading…'}</div>;

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const d = await saveAdminShops(c);
      setC(d.config);
      setMsg('Saved.');
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="card" style={{ maxWidth: 640 }} onSubmit={save}>
      <h2 style={{ marginTop: 0, fontSize: 16, marginBottom: 4 }}>🏪 Agent shop links</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: 0 }}>
        Approved agents can share zappipay.com.ng/shop/their-username. Purchases made by customers who came through a shop link (for 30 days) earn the agent a commission. It is capped per sale and by your reward safety limit, so it never costs more than you earn on the purchase.
      </p>
      <p style={{ fontSize: 13, margin: '0 0 12px' }}>{info.shops} shop{info.shops === 1 ? '' : 's'} open · paid last 30 days: <b>{naira(info.last30.paid)}</b> ({info.last30.count})</p>
      {err && <p className="error-text" style={{ margin: '0 0 8px' }}>{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)', fontSize: 13, margin: '0 0 8px' }}>{msg}</p>}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, fontWeight: 600 }}>
        <input type="checkbox" checked={c.enabled} onChange={(e) => setC({ ...c, enabled: e.target.checked })} style={{ width: 'auto' }} /> Turn on agent shop links
      </label>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: '1 1 140px' }}>
          <label htmlFor="sh-pct">Commission (%)</label>
          <input id="sh-pct" type="number" step="0.1" value={c.pct} onChange={(e) => setC({ ...c, pct: e.target.value })} />
          <small style={{ color: 'var(--slate-400)' }}>0 – 10% of the purchase</small>
        </div>
        <div className="field" style={{ flex: '1 1 140px' }}>
          <label htmlFor="sh-max">Max per sale (₦)</label>
          <input id="sh-max" type="number" value={c.max} onChange={(e) => setC({ ...c, max: e.target.value })} />
          <small style={{ color: 'var(--slate-400)' }}>0 = no cap (safety limit still applies)</small>
        </div>
      </div>
      <button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </form>
  );
}
