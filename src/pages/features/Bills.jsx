import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBillCategories, getBillers, getBillItems, validateBill, payBill, getBillHistory, getBill } from '../../api';
import PinConfirm from '../../components/PinConfirm';
import BottomNav from '../../components/BottomNav';
import { naira } from '../../components/circles/shared';

const ICON = { TAX: '🏛️', UTILITYBILLS: '💧', TRANSLOG: '🚌', DONATIONS: '🤲', RELINST: '⛪', SCHPB: '🏫', DEALPAY: '🧾' };
const iconFor = (c) => ICON[c.code] || (/tax/i.test(c.name) ? '🏛️' : /school|professional/i.test(c.name) ? '🏫' : /relig|church|mosque/i.test(c.name) ? '⛪' : /transport|toll/i.test(c.name) ? '🚌' : /donat/i.test(c.name) ? '🤲' : /utility|water|waste/i.test(c.name) ? '💧' : '🧾');
const STATUS = { SUCCESS: ['✅ paid', 'var(--green-500)'], PENDING: ['⏳ processing', 'var(--gold)'], FAILED: ['❌ failed — refunded', 'var(--red-500)'] };
const back = (to, label, onClick) => <Link to={to} onClick={onClick} style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← {label}</Link>;

export default function Bills() {
  const [cats, setCats] = useState(null);
  const [cat, setCat] = useState(null);
  const [billers, setBillers] = useState(null);
  const [biller, setBiller] = useState(null);
  const [items, setItems] = useState(null);
  const [item, setItem] = useState(null);
  const [customer, setCustomer] = useState('');
  const [amount, setAmount] = useState('');
  const [check, setCheck] = useState(null);
  const [checked, setChecked] = useState(false);
  const [pin, setPin] = useState(false);
  const [history, setHistory] = useState([]);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const loadHistory = () => getBillHistory().then((r) => setHistory(r.bills)).catch(() => {});
  useEffect(() => { getBillCategories().then((r) => setCats(r.categories)).catch((e) => setErr(e.message)); loadHistory(); }, []);
  function pickCat(c) { setCat(c); setBiller(null); setItems(null); setItem(null); setBillers(null); setErr(''); getBillers(c.code).then((r) => setBillers(r.billers)).catch((e) => setErr(e.message)); }
  function pickBiller(b) { setBiller(b); setItem(null); setItems(null); setErr(''); getBillItems(b.code).then((r) => { setItems(r.items); if (r.items.length === 1) pickItem(r.items[0]); }).catch((e) => setErr(e.message)); }
  function pickItem(i) { setItem(i); setCheck(null); setChecked(false); setAmount(i.fixed ? String(i.amount) : ''); }
  async function verify() {
    setErr(''); setCheck(null);
    try { setCheck(await validateBill({ billerCode: biller.code, itemCode: item.code, customer })); } catch (e) { setErr(e.message); }
  }
  const amt = Number(amount || 0);
  const fee = item ? item.providerFee + item.ourFee : 0;
  const ready = item && customer.trim() && amt >= 50 && (check?.ok || checked);
  if (done) return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="card" style={{ textAlign: 'center', marginTop: 24 }}>
        <div style={{ fontSize: 40 }}>{done.status === 'SUCCESS' ? '✅' : done.status === 'PENDING' ? '⏳' : '😕'}</div>
        <b>{done.status === 'SUCCESS' ? 'Paid' : done.status === 'PENDING' ? 'Processing' : 'Not paid'}</b>
        <p style={{ fontSize: 14 }}>{done.status === 'FAILED' ? done.message : done.status === 'PENDING' ? 'The biller is still confirming. We’ll notify you — if it fails you get your money back automatically.' : `${naira(done.total)} paid.`}</p>
        <Link to={`/bills/${done.reference}`} className="btn" style={{ textDecoration: 'none', display: 'inline-block', width: 'auto' }}>View receipt</Link>
        <button type="button" className="btn btn-secondary" style={{ width: 'auto', marginLeft: 8 }} onClick={() => { setDone(null); setItem(null); setCustomer(''); setAmount(''); loadHistory(); }}>Pay another</button>
      </div>
      <BottomNav />
    </div>
  );
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">{cat ? <button type="button" onClick={() => (biller ? setBiller(null) : setCat(null))} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', padding: 0, fontSize: 14 }}>← Back</button> : back('/more', 'Back')}<h1>🧾 {cat ? cat.name : 'More bills'}</h1><p>{biller ? biller.name : 'Tax, waste, water, tolls, school & professional fees, offerings and more — paid from your wallet.'}</p></div>
      {err && <p className="error-text" style={{ margin: '0 16px' }}>{err}</p>}
      {!cat && (
        !cats ? <p className="empty-state">Loading…</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, margin: '0 16px 16px' }}>
            {cats.map((c) => <button key={c.code} type="button" className="card" onClick={() => pickCat(c)} style={{ margin: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit', border: '1px solid var(--slate-800)' }}><div style={{ fontSize: 26 }}>{iconFor(c)}</div><b style={{ fontSize: 14 }}>{c.name}</b></button>)}
          </div>
        )
      )}
      {cat && !biller && (
        <div className="card">
          {!billers ? <p className="empty-state">Loading…</p> : billers.length === 0 ? <p style={{ fontSize: 14 }}>No billers here yet.</p> : billers.map((b) => <button key={b.code} type="button" onClick={() => pickBiller(b)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: '1px solid var(--slate-800)', color: 'inherit', padding: '10px 0', cursor: 'pointer', fontSize: 14 }}><b>{b.name}</b>{b.description && b.description !== b.name ? <><br /><small style={{ color: 'var(--slate-400)' }}>{b.description}</small></> : null}</button>)}
        </div>
      )}
      {biller && (
        <form className="card" onSubmit={(e) => { e.preventDefault(); setErr(''); setPin(true); }}>
          {!items ? <p className="empty-state">Loading…</p> : (
            <>
              {items.length > 1 && <div className="field"><label htmlFor="bI">What are you paying for?</label><select id="bI" value={item?.code || ''} onChange={(e) => pickItem(items.find((i) => i.code === e.target.value))} required><option value="">Choose…</option>{items.map((i) => <option key={i.code} value={i.code}>{i.name}{i.fixed ? ` — ${naira(i.amount)}` : ''}</option>)}</select></div>}
              {item && (
                <>
                  <div className="field"><label htmlFor="bC">{item.label}</label>
                    <div style={{ display: 'flex', gap: 8 }}><input id="bC" value={customer} onChange={(e) => { setCustomer(e.target.value); setCheck(null); setChecked(false); }} required style={{ flex: 1 }} /><button type="button" className="btn btn-secondary" style={{ width: 'auto' }} disabled={!customer.trim()} onClick={verify}>Verify</button></div>
                    {check?.ok && <small style={{ color: 'var(--green-500)' }}>✓ {check.name || 'Details confirmed'}</small>}
                    {check && !check.ok && <small style={{ color: 'var(--gold)' }}>We couldn’t confirm it automatically ({check.message}).</small>}
                  </div>
                  {check && !check.ok && <label style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 8 }}><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} style={{ width: 'auto' }} /> I’ve checked the {item.label.toLowerCase()} is correct</label>}
                  <div className="field"><label htmlFor="bA">Amount (₦)</label><input id="bA" type="number" min="50" value={amount} onChange={(e) => setAmount(e.target.value)} readOnly={item.fixed} required /></div>
                  {amt > 0 && <div style={{ fontSize: 14, margin: '6px 0 10px' }}>{naira(amt)} + {naira(fee)} service fee = <b>{naira(amt + fee)}</b></div>}
                  <button className="btn" type="submit" disabled={!ready}>{check ? `Pay ${naira(amt + fee)}` : 'Verify first'}</button>
                </>
              )}
            </>
          )}
        </form>
      )}
      {!cat && history.length > 0 && (
        <div className="card">
          <b>Recent bills</b>
          {history.map((h) => { const [t, c] = STATUS[h.status] || [h.status, 'inherit']; return <Link key={h.reference} to={`/bills/${h.reference}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--slate-800)', textDecoration: 'none', color: 'inherit', fontSize: 14 }}><span><b>{h.biller}</b><br /><small style={{ color: 'var(--slate-400)' }}>{h.item} · {h.customer}</small></span><span style={{ textAlign: 'right' }}>{naira(h.amount)}<br /><small style={{ color: c }}>{t}</small></span></Link>; })}
        </div>
      )}
      <PinConfirm open={pin} summary={`Pay ${naira(amt + fee)} · ${biller?.name || ''} ${item?.name ? `(${item.name})` : ''} for ${customer}`}
        onSubmit={async (auth) => { const r = await payBill({ category: cat.code, billerCode: biller.code, itemCode: item.code, customer: customer.trim(), customerName: check?.name, amount: amt, ...auth }); setPin(false); setDone(r); }}
        onError={(e) => setErr(e.message)} onClose={() => setPin(false)} />
      <BottomNav />
    </div>
  );
}

export function BillReceipt() {
  const { ref } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { getBill(ref).then(setD).catch((e) => setErr(e.message)); }, [ref]);
  if (!d) return <div className="app-shell">{err ? <p className="error-text" style={{ margin: 16 }}>{err}</p> : <p className="empty-state">Loading…</p>}</div>;
  const [t, c] = STATUS[d.status] || [d.status, 'inherit'];
  const rows = [['Biller', d.biller], ['For', d.item], ['Customer', d.customer], ['Amount', naira(d.amount)], ['Service fee', naira(d.fee)], ['Total', naira(d.amount + d.fee)], ['Date', new Date(d.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })], ['Reference', d.reference]];
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">{back('/bills', 'More bills')}<h1>🧾 Receipt</h1><p style={{ color: c }}>{t}</p></div>
      <div className="card">
        {d.token && <div style={{ padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.1)', marginBottom: 10 }}><small>Token / receipt number</small><div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>{d.token}</div></div>}
        {rows.map(([k, v]) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0', borderTop: '1px solid var(--slate-800)' }}><span style={{ color: 'var(--slate-400)' }}>{k}</span><span style={{ textAlign: 'right', wordBreak: 'break-all' }}>{v}</span></div>)}
        <button type="button" className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => window.print()}>Print / save</button>
      </div>
      <BottomNav />
    </div>
  );
}
