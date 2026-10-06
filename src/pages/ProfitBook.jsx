import { SkeletonRows } from '../components/Skeleton';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProfitBook, getOwing, saveAgentSale } from '../api';
import { SERVICE_LABEL } from '../lib/repeat';

const naira = (n) => { const v = Number(n || 0); return `₦${v.toLocaleString('en-NG', Number.isInteger(v) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; };
const LAGOS = 3600000;
const ymd = (d) => new Date(new Date(d).getTime() + LAGOS).toISOString().slice(0, 10);
const RANGES = [
  ['today', 'Today', () => ({ from: ymd(Date.now()), to: ymd(Date.now()) })],
  ['7d', '7 days', () => ({ from: ymd(Date.now() - 6 * 86400000), to: ymd(Date.now()) })],
  ['month', 'This month', () => ({ from: `${ymd(Date.now()).slice(0, 8)}01`, to: ymd(Date.now()) })],
  ['last', 'Last month', () => { const d = new Date(`${ymd(Date.now()).slice(0, 8)}01T12:00:00Z`); const end = new Date(d.getTime() - 86400000); return { from: `${ymd(end).slice(0, 8)}01`, to: ymd(end) }; }],
];

function Stat({ label, value, tone }) {
  return (
    <div style={{ flex: '1 1 45%', padding: '10px 12px', borderRadius: 12, background: 'var(--slate-800)', border: '1px solid var(--slate-700)' }}>
      <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: tone }}>{value}</div>
    </div>
  );
}

function Bars({ days }) {
  const max = Math.max(1, ...days.map((d) => Math.abs(d.profit)));
  if (days.length < 2) return null;
  return (
    <div className="card">
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Profit per day</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 90 }} role="img" aria-label="Profit per day chart">
        {days.map((d) => (
          <div key={d.date} title={`${d.date}: ${naira(d.profit)} (${d.sales} sales)`} style={{ flex: 1, minWidth: 2, height: `${Math.max(2, (Math.abs(d.profit) / max) * 100)}%`, background: d.profit < 0 ? 'var(--red-500)' : '#863bff', borderRadius: '3px 3px 0 0', opacity: d.profit === 0 ? 0.25 : 1 }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate-400)', marginTop: 4 }}>
        <span>{days[0].date.slice(5)}</span><span>{days[days.length - 1].date.slice(5)}</span>
      </div>
    </div>
  );
}

function SaleEditor({ order, onSaved, onClose }) {
  const [soldFor, setSoldFor] = useState(String(order.soldFor));
  const [name, setName] = useState(order.customerName || '');
  const [owing, setOwing] = useState(order.owing);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function save() {
    setBusy(true);
    setErr('');
    try {
      await saveAgentSale(order.id, { soldFor: Number(soldFor), customerName: name, owing });
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  const profit = Number(soldFor) - order.paid;
  return (
    <div style={{ padding: '10px 16px 14px', background: 'var(--slate-800)' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="field" style={{ flex: 1, margin: 0 }}>
          <label htmlFor={`sf-${order.id}`}>I sold it for (₦)</label>
          <input id={`sf-${order.id}`} type="number" inputMode="decimal" value={soldFor} onChange={(e) => setSoldFor(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, margin: 0 }}>
          <label htmlFor={`cn-${order.id}`}>Customer (optional)</label>
          <input id={`cn-${order.id}`} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mama Tunde" />
        </div>
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, margin: '10px 0' }}>
        <input type="checkbox" checked={owing} onChange={(e) => setOwing(e.target.checked)} style={{ width: 'auto' }} /> They haven’t paid me yet
      </label>
      <div style={{ fontSize: 13, marginBottom: 8 }}>You paid {naira(order.paid)} · profit <b style={{ color: profit < 0 ? 'var(--red-500)' : 'var(--green-500)' }}>{naira(profit)}</b></div>
      {err && <p className="error-text" style={{ margin: '0 0 8px' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn" style={{ flex: 1 }} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// Agents: sales, profit, commission and who owes them.
export default function ProfitBook() {
  const [rangeKey, setRangeKey] = useState('month');
  const [data, setData] = useState(null);
  const [owing, setOwingList] = useState(null);
  const [tab, setTab] = useState('sales');
  const [editing, setEditing] = useState('');
  const [err, setErr] = useState('');
  const r = useMemo(() => RANGES.find((x) => x[0] === rangeKey)[2](), [rangeKey]);

  function load() {
    setErr('');
    getProfitBook(r).then(setData).catch((e) => setErr(e.message));
    getOwing().then((d) => setOwingList(d.owing)).catch(() => setOwingList([]));
  }
  useEffect(load, [r.from, r.to]);

  async function markPaid(id) {
    await saveAgentSale(id, { owing: false }).catch(() => {});
    load();
  }

  function exportCsv() {
    const esc = (v) => { const s = String(v ?? ''); const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; return `"${safe.replace(/"/g, '""')}"`; };
    const lines = [['Date', 'Service', 'Number', 'Customer', 'Face value', 'I paid', 'I sold for', 'Profit', 'Owing'].map(esc).join(',')];
    for (const o of data.orders) lines.push([new Date(o.createdAt).toLocaleString('en-NG'), SERVICE_LABEL[o.service] || o.service, o.recipient, o.customerName || '', o.face, o.paid, o.soldFor, o.profit, o.owing ? 'Yes' : ''].map(esc).join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    a.download = `zappipay-profit-${data.from}-to-${data.to}.csv`;
    a.click();
  }

  const s = data?.summary;
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">
        <Link to="/profile" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← Back</Link>
        <h1>📒 Profit book</h1>
        <p>What you sold, what it cost you, and who owes you</p>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px', overflowX: 'auto' }}>
        {RANGES.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={rangeKey === k} onClick={() => setRangeKey(k)} style={{ padding: '6px 12px', borderRadius: 999, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', border: `1px solid ${rangeKey === k ? 'var(--purple)' : 'var(--slate-700)'}`, background: rangeKey === k ? 'rgba(134,59,255,0.18)' : 'transparent', color: 'var(--slate-100)' }}>{l}</button>
        ))}
      </div>
      {err && <p className="error-text" style={{ margin: '0 16px 8px' }}>{err}</p>}
      {!data && !err && <div style={{ margin: '0 16px' }}><SkeletonRows rows={3} /></div>}
      {s && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 16px 12px' }}>
            <Stat label="Profit" value={naira(s.profit)} tone={s.profit < 0 ? 'var(--red-500)' : 'var(--green-500)'} />
            <Stat label="Sales" value={s.sales} />
            <Stat label="You sold for" value={naira(s.soldTotal)} />
            <Stat label="You paid" value={naira(s.costTotal)} />
            {s.commission > 0 && <Stat label="Shop link commission" value={naira(s.commission)} tone="var(--green-500)" />}
            <Stat label="Owed to you (all time)" value={naira(s.owed)} tone={s.owed > 0 ? 'var(--gold)' : undefined} />
          </div>
          <Bars days={data.days} />
          {data.byService.length > 0 && (
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>By service</div>
              {data.byService.map((b) => (
                <div key={b.service} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0' }}>
                  <span>{SERVICE_LABEL[b.service] || b.service} · {b.sales}</span><b>{naira(b.profit)}</b>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, padding: '0 16px 8px' }}>
            {[['sales', `Sales (${data.orders.length})`], ['owing', `Who owes me (${owing?.length || 0})`]].map(([k, l]) => (
              <button key={k} type="button" className={tab === k ? 'btn' : 'btn btn-secondary'} style={{ flex: 1, padding: '8px 10px', fontSize: 13 }} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          {tab === 'sales' && (
            <div className="card" style={{ padding: 0 }}>
              {data.orders.length === 0 && <p className="empty-state">No sales in this period.</p>}
              {data.orders.map((o, i) => (
                <div key={o.id} style={{ borderTop: i ? '1px solid var(--slate-700)' : 'none' }}>
                  <button type="button" onClick={() => setEditing(editing === o.id ? '' : o.id)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 16px', background: 'none', border: 'none', color: 'var(--slate-100)', textAlign: 'left', cursor: 'pointer' }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{SERVICE_LABEL[o.service] || o.service} · {o.recipient}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--slate-400)' }}>
                        {new Date(o.createdAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}{o.customerName ? ` · ${o.customerName}` : ''}{o.owing ? ' · ' : ''}{o.owing && <span style={{ color: 'var(--gold)' }}>owes you</span>}
                      </span>
                    </span>
                    <span style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: o.profit < 0 ? 'var(--red-500)' : 'var(--green-500)' }}>{o.profit >= 0 ? '+' : ''}{naira(o.profit)}</span>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--slate-400)' }}>sold {naira(o.soldFor)}{o.edited ? '' : ' ✎'}</span>
                    </span>
                  </button>
                  {editing === o.id && <SaleEditor order={o} onClose={() => setEditing('')} onSaved={() => { setEditing(''); load(); }} />}
                </div>
              ))}
            </div>
          )}
          {tab === 'owing' && (
            <div className="card" style={{ padding: 0 }}>
              {!owing?.length && <p className="empty-state">Nobody owes you. 🎉</p>}
              {owing?.map((o, i) => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderTop: i ? '1px solid var(--slate-700)' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{o.customerName || o.recipient} · {naira(o.soldFor)}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{SERVICE_LABEL[o.service] || o.service} for {o.recipient} · {new Date(o.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</div>
                  </div>
                  <button type="button" className="btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={() => markPaid(o.id)}>Paid ✓</button>
                </div>
              ))}
            </div>
          )}
          {data.orders.length > 0 && <button type="button" className="btn btn-secondary" style={{ margin: '0 16px', width: 'calc(100% - 32px)' }} onClick={exportCsv}>Download as spreadsheet (CSV)</button>}
          <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '10px 16px' }}>Sales are counted at face value until you change the price. Tap a sale to set what you charged, who it was for, or that they still owe you.</p>
        </>
      )}
    </div>
  );
}
