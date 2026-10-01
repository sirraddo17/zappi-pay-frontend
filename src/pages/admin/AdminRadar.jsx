import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { getWinBack, simulatePricing, getScamReports, getFeedbackDigest } from '../../api';

const TABS = [['winback', '💔 Win-back'], ['whatif', '🧮 What-if pricing'], ['feedback', '⭐ Feedback themes'], ['scams', '🚨 Scam reports']];
const SERVICES = [['DATA', 'Data'], ['AIRTIME', 'Airtime'], ['ELECTRICITY', 'Electricity'], ['CABLE', 'Cable TV'], ['EDUCATION', 'Education'], ['INTERNET', 'Internet'], ['BETTING', 'Bet funding']];
const ask = (q) => `/admin/assistant?ask=${encodeURIComponent(q)}`;
const fmt = (d) => new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function WinBack() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { getWinBack().then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="error-text">{err}</p>;
  if (!d) return <p className="empty-state">Loading…</p>;
  return (
    <div className="card" style={{ margin: 0 }}>
      <p style={{ marginTop: 0, fontSize: 14 }}>
        <b>{d.count}</b> regular customer{d.count === 1 ? '' : 's'} (3+ purchases in the 2 months before) bought nothing in the last 3 weeks.
        {Object.keys(d.byService || {}).length > 0 && <span style={{ color: 'var(--slate-400)' }}> Mostly: {Object.entries(d.byService).map(([k, v]) => `${k} ${v}`).join(', ')}.</span>}
      </p>
      {d.count > 0 && (
        <Link to={ask('Make a win-back campaign for my regulars slipping away (audience SLIPPING): a small promo on their usual service with a usage limit and end date, plus a friendly message.')} className="btn" style={{ display: 'inline-block', width: 'auto', textDecoration: 'none', marginBottom: 12 }}>✨ Make a win-back campaign</Link>
      )}
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '0 0 10px' }}>Audience “Regulars slipping away” is also in Broadcasts and Promo Codes ({d.audienceCount ?? d.count} people now).</p>
      {d.customers.length > 0 && (
        <table className="table">
          <thead><tr><th>Customer</th><th>Why</th><th>Spent before</th></tr></thead>
          <tbody>
            {d.customers.map((c) => (
              <tr key={c.customerId}>
                <td><Link to={`/admin/customers/${c.customerId}`} style={{ color: 'var(--purple)' }}>{c.name}</Link>{c.agent ? ' (agent)' : ''}<div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{c.phone}</div></td>
                <td style={{ fontSize: 13 }}>{c.reason}</td>
                <td>{c.spentBefore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function WhatIf() {
  const [f, setF] = useState({ service: 'DATA', discountPct: '', markupPct: '', cashbackPct: '', volumeChangePct: '' });
  const [r, setR] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  async function go(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const body = { service: f.service };
      for (const k of ['discountPct', 'markupPct', 'cashbackPct', 'volumeChangePct']) if (f[k] !== '') body[k] = Number(f[k]);
      setR(await simulatePricing(body));
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <div className="card" style={{ margin: 0 }}>
      <p style={{ marginTop: 0, fontSize: 13, color: 'var(--slate-400)' }}>Re-prices your last 30 days of real orders with a different discount, markup or cashback, and shows what you would have made. Leave a box empty to keep today’s value. Nothing is changed.</p>
      <form onSubmit={go}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          <div className="field"><label htmlFor="wiS">Service</label><select id="wiS" value={f.service} onChange={set('service')}>{SERVICES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label htmlFor="wiD">Discount %</label><input id="wiD" type="number" step="0.1" min="0" max="50" value={f.discountPct} onChange={set('discountPct')} /></div>
          <div className="field"><label htmlFor="wiM">Markup %</label><input id="wiM" type="number" step="0.1" min="0" max="50" value={f.markupPct} onChange={set('markupPct')} /></div>
          <div className="field"><label htmlFor="wiC">Cashback %</label><input id="wiC" type="number" step="0.1" min="0" max="20" value={f.cashbackPct} onChange={set('cashbackPct')} /></div>
          <div className="field"><label htmlFor="wiV">Expected sales change %</label><input id="wiV" type="number" step="1" min="-90" max="500" value={f.volumeChangePct} onChange={set('volumeChangePct')} placeholder="e.g. 20" /></div>
        </div>
        <button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy}>{busy ? 'Working…' : 'Work it out'}</button>
      </form>
      {err && <p className="error-text">{err}</p>}
      {r && (r.note && !r.last30Days ? <p style={{ fontSize: 14 }}>{r.note}</p> : (
        <div style={{ marginTop: 14, fontSize: 14 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="card stat" style={{ margin: 0, flex: '1 1 180px' }}><div className="label">Now ({r.last30Days.orders} orders)</div><div className="value">{r.last30Days.yourProfit}</div><div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{r.last30Days.profitPerOrder} per order</div></div>
            <div className="card stat" style={{ margin: 0, flex: '1 1 180px' }}><div className="label">With the change</div><div className="value">{r.withChange.yourProfit}</div><div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{r.withChange.profitPerOrder} per order · sales {r.withChange.assumedVolumeChange}</div></div>
            <div className="card stat" style={{ margin: 0, flex: '1 1 180px' }}><div className="label">Difference</div><div className="value" style={{ color: /-/.test(r.difference) ? 'var(--red-500)' : 'var(--green-500)' }}>{r.difference}</div></div>
          </div>
          {r.breakEvenVolumeChange && <p style={{ margin: '10px 0 0' }}>To earn the same as now you would need <b>{r.breakEvenVolumeChange}</b>.</p>}
          <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>{r.note}</p>
          <Link to={ask(`I'm thinking of changing ${r.service}: discount ${f.discountPct || 'same'}%, markup ${f.markupPct || 'same'}%, cashback ${f.cashbackPct || 'same'}%. Is it a good idea? If yes, propose it.`)} style={{ color: 'var(--purple)', fontSize: 13 }}>Ask the AI if it’s a good idea ›</Link>
        </div>
      ))}
    </div>
  );
}

function Feedback() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { getFeedbackDigest(30).then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="error-text">{err}</p>;
  if (!d) return <p className="empty-state">Loading…</p>;
  const rows = Object.entries(d.byService || {}).sort((a, b) => a[1].average - b[1].average);
  return (
    <div className="card" style={{ margin: 0 }}>
      <p style={{ marginTop: 0, fontSize: 14 }}>{d.ratings} rating{d.ratings === 1 ? '' : 's'} in 30 days{d.average ? `, average ${d.average} ★` : ''}. Lowest-rated services first.</p>
      {rows.length > 0 && (
        <table className="table">
          <thead><tr><th>Service</th><th>Ratings</th><th>Average</th><th>1–2 ★</th></tr></thead>
          <tbody>{rows.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v.ratings}</td><td>{v.average} ★</td><td style={{ color: v.lowRatings ? 'var(--red-500)' : undefined }}>{v.lowRatings}</td></tr>)}</tbody>
        </table>
      )}
      {d.comments.length > 0 && (
        <Link to={ask('Analyse the last 30 days of customer feedback: group the comments into themes with counts, the worst service/provider, and 3 quick fixes.')} className="btn" style={{ display: 'inline-block', width: 'auto', textDecoration: 'none', margin: '12px 0 0' }}>✨ Ask the AI for themes and fixes</Link>
      )}
      <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>All comments are on the <Link to="/admin/feedback" style={{ color: 'var(--purple)' }}>Feedback</Link> page.</p>
    </div>
  );
}

function Scams() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { getScamReports().then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="error-text">{err}</p>;
  if (!d) return <p className="empty-state">Loading…</p>;
  if (!d.reports.length) return <div className="card" style={{ margin: 0, fontSize: 14 }}>No scam reports yet. When customers ask the Help chat “is this real?” about a suspicious message, call or link, it is logged here.</div>;
  return (
    <div className="card" style={{ margin: 0 }}>
      <Link to={ask('Look at the recent scam reports. Are many customers being targeted the same way? If yes, propose a short warning broadcast.')} className="btn" style={{ display: 'inline-block', width: 'auto', textDecoration: 'none', marginBottom: 12 }}>✨ Should I warn customers?</Link>
      <div style={{ display: 'grid', gap: 8 }}>
        {d.reports.map((r) => (
          <div key={r.id} style={{ background: 'var(--slate-800)', borderRadius: 10, padding: 10, fontSize: 13, border: r.lostMoney ? '1px solid var(--red-500)' : 'none' }}>
            <div style={{ color: 'var(--slate-400)', fontSize: 12 }}>{fmt(r.createdAt)} · {r.channel}{r.contact ? ` · ${r.contact}` : ''}{r.customer ? <> · <Link to={`/admin/customers/${r.customerId}`} style={{ color: 'var(--purple)' }}>{r.customer.name}</Link></> : ''}{r.lostMoney ? <b style={{ color: 'var(--red-500)' }}> · lost money</b> : ''}</div>
            <div style={{ marginTop: 4 }}>{r.summary}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Owner tools that need no AI cost: win-back list, what-if pricing,
// feedback themes and scam reports. "✨" buttons hand over to the AI.
export default function AdminRadar() {
  const [tab, setTab] = useState(() => { try { return new URLSearchParams(window.location.search).get('tab') || 'winback'; } catch { return 'winback'; } });
  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Radar</h1>
        <p>Who to win back, what a price change would do, and what customers are telling you</p>
      </div>
      <div className="admin-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {TABS.map(([k, l]) => <button key={k} type="button" className={tab === k ? 'btn' : 'btn btn-secondary'} style={{ width: 'auto', padding: '6px 14px' }} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'winback' && <WinBack />}
      {tab === 'whatif' && <WhatIf />}
      {tab === 'feedback' && <Feedback />}
      {tab === 'scams' && <Scams />}
    </AdminLayout>
  );
}
