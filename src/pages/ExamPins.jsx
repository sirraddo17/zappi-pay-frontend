import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getVtpassVariations, getOrder, getOrders, purchase, getPricing } from '../api';
import PinConfirm from '../components/PinConfirm';
import BottomNav from '../components/BottomNav';
import { useAppInfo, pausedFor } from '../components/ServiceNotices';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const MAX = 50;
const QUICK = [5, 10, 20, 50];
const NAME_KEY = 'zappipay_exam_sheet_name';
const LAYOUTS = [['a4', 'A4 sheet (2 across)'], ['list', 'List (1 per row)'], ['pos', 'POS printer (58mm)']];
const EXAMS = { waec: { label: 'WAEC result checker', check: 'Check at waecdirect.org', color: '#0b6b3a' } };

// Display-only mirror of the backend price (markup, then discount) on the
// whole order — the server recomputes it on purchase.
function priceFor(base, pricing) {
  const s = 'EDUCATION';
  const markup = Number(pricing?.markupPercentByService?.[s] || 0);
  const discountPct = Math.min(100, Math.max(0, Number(pricing?.discountPercentByService?.[s] || 0)));
  const cap = Number(pricing?.markupCapByService?.[s] || 0);
  const raw = (Number(base || 0) * markup) / 100;
  const markedUp = Math.round(Number(base || 0) + (cap > 0 ? Math.min(raw, cap) : raw));
  return Math.max(0, markedUp - Math.round(markedUp * (discountPct / 100)));
}

// PINs and serials from VTpass's reply.
export function examCards(order) {
  const p = order?.responsePayload || {};
  const list = p.cards || p.content?.cards || p.content?.transactions?.cards;
  if (Array.isArray(list) && list.length) return list.map((c) => ({ pin: String(c.Pin ?? c.pin ?? ''), serial: String(c.Serial ?? c.serial ?? '') })).filter((c) => c.pin);
  // "Serial No:WRN1, pin: 111||Serial No:WRN2, pin: 222"
  const code = String(p.purchased_code || p.content?.transactions?.purchased_code || '');
  return code.split(/\|\||\n|;/).map((part) => {
    const serial = /serial\s*(?:no)?\s*:?\s*([A-Za-z0-9-]+)/i.exec(part);
    const pin = /pin\s*:?\s*([0-9A-Za-z-]+)/i.exec(part);
    return pin ? { serial: serial ? serial[1] : '', pin: pin[1] } : null;
  }).filter(Boolean);
}

function Buy() {
  const { customer, refreshCustomer } = useAuth();
  const appInfo = useAppInfo();
  const navigate = useNavigate();
  const [vars, setVars] = useState(null);
  const [code, setCode] = useState('');
  const [qty, setQty] = useState(10);
  const [name, setName] = useState(() => { try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; } });
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [recent, setRecent] = useState([]);
  const [pricing, setPricing] = useState(null);

  useEffect(() => {
    getVtpassVariations('waec').then((d) => { const v = d?.content?.variations || d?.content?.varations || []; setVars(v); if (v[0]) setCode(v[0].variation_code); }).catch((e) => { setVars([]); setErr(e.message); });
    getPricing().then(setPricing).catch(() => {});
    getOrders().then((d) => setRecent((d.orders || []).filter((o) => o.service === 'EDUCATION' && o.provider === 'waec' && o.status === 'SUCCESS').slice(0, 10))).catch(() => {});
  }, []);
  const v = (vars || []).find((x) => x.variation_code === code);
  const unit = v ? Number(v.variation_amount) : 0;
  const q = Math.max(1, Math.min(MAX, parseInt(qty, 10) || 0));
  const total = unit ? priceFor(unit * q, pricing) : 0;
  const paused = pausedFor(appInfo, 'EDUCATION');

  async function buy(auth) {
    try { localStorage.setItem(NAME_KEY, name.trim()); } catch { /* ignore */ }
    const res = await purchase({ service: 'EDUCATION', serviceID: 'waec', variationCode: code, billersCode: customer?.phone || '', phone: customer?.phone || '', quantity: q, ...auth });
    await refreshCustomer();
    setConfirm(false);
    navigate(res?.order?.id ? `/exam-pins/${res.order.id}` : '/orders');
  }

  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">
        <Link to="/more" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← Back</Link>
        <h1>Exam PINs in bulk</h1>
        <p>Buy many WAEC result checker PINs at once and print them for your students or customers.</p>
      </div>
      {err && <p className="error-text" style={{ margin: '0 16px 12px' }}>{err}</p>}
      {paused && <p className="error-text" style={{ margin: '0 16px 12px' }}>{paused}</p>}
      <form className="card" onSubmit={(e) => { e.preventDefault(); setErr(''); setConfirm(true); }}>
        <div className="field">
          <label htmlFor="exV">Exam</label>
          <select id="exV" value={code} onChange={(e) => setCode(e.target.value)} required>
            {vars === null && <option value="">Loading…</option>}
            {(vars || []).map((x) => <option key={x.variation_code} value={x.variation_code}>{EXAMS.waec.label} — {x.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="exQ">How many PINs? (1–{MAX})</label>
          <input id="exQ" type="number" inputMode="numeric" min="1" max={MAX} value={qty} onChange={(e) => setQty(e.target.value)} required />
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {QUICK.map((n) => <button key={n} type="button" className={q === n ? 'btn' : 'btn btn-secondary'} style={{ width: 'auto', padding: '4px 12px', fontSize: 13 }} onClick={() => setQty(n)}>{n}</button>)}
          </div>
        </div>
        <div className="field">
          <label htmlFor="exN">Name on the printed sheet (optional)</label>
          <input id="exN" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bright Future College, or your shop name" />
        </div>
        {unit > 0 && <p style={{ fontSize: 15, margin: '4px 0 10px' }}>{q} PIN{q === 1 ? '' : 's'} · you pay <b>{naira(total)}</b>{total !== unit * q ? <span style={{ fontSize: 12, color: 'var(--slate-400)' }}> ({naira(total / q)} each)</span> : ''}</p>}
        <button className="btn" type="submit" disabled={!unit || Boolean(paused)}>{unit ? `Pay ${naira(total)}` : 'Pay'}</button>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '8px 0 0' }}>The PINs appear right after payment, ready to print, copy or download. If VTpass can’t deliver them, you’re refunded automatically. Agent prices and discounts apply.</p>
      </form>

      {recent.length > 0 && (
        <>
          <div className="section-label">Your recent PINs</div>
          {recent.map((o) => (
            <Link key={o.id} to={`/exam-pins/${o.id}`} className="card" style={{ display: 'flex', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}>
              <span>{o.quantity || 1} × WAEC · {new Date(o.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
              <span style={{ color: 'var(--purple)' }}>Open ›</span>
            </Link>
          ))}
        </>
      )}

      <PinConfirm
        open={confirm}
        summary={`Pay ${naira(total)} · ${q} WAEC result checker PIN${q === 1 ? '' : 's'}`}
        onSubmit={buy}
        onError={(e) => setErr(e.message || 'Purchase failed.')}
        onClose={() => setConfirm(false)}
      />
      <BottomNav />
    </div>
  );
}

function Sheet({ id }) {
  const { refreshCustomer } = useAuth();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState('');
  const [layout, setLayout] = useState('a4');
  const [msg, setMsg] = useState('');
  const polls = useRef(0);
  const name = useMemo(() => { try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; } }, []);

  useEffect(() => {
    let t;
    const load = () => getOrder(id).then((d) => {
      setOrder(d.order);
      if (d.order.status === 'PENDING' && polls.current < 40) { polls.current += 1; t = setTimeout(load, polls.current < 10 ? 4000 : 15000); } else refreshCustomer?.();
    }).catch((e) => setErr(e.message));
    load();
    return () => clearTimeout(t);
  }, [id]);

  // PINs only show once the order is confirmed (the server hides them too).
  const cards = order?.status === 'SUCCESS' ? examCards(order) : [];
  const exam = EXAMS[order?.provider] || EXAMS.waec;

  async function copyAll() {
    const text = cards.map((c, i) => `${i + 1}. Serial: ${c.serial}  PIN: ${c.pin}`).join('\n');
    try { await navigator.clipboard.writeText(text); setMsg('Copied ✓'); } catch { setMsg('Could not copy.'); }
    setTimeout(() => setMsg(''), 2000);
  }
  function csv() {
    const rows = [['No', 'Exam', 'Serial', 'PIN']].concat(cards.map((c, i) => [i + 1, exam.label, c.serial, c.pin]));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' }));
    a.download = `waec-pins-${new Date(order.createdAt).toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  if (err) return <div className="app-shell"><p className="error-text" style={{ margin: 16 }}>{err}</p></div>;
  if (!order) return <div className="page-loading">Loading…</div>;
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <style>{PRINT_CSS}</style>
      <div className="no-print">
        <div className="page-header">
          <Link to="/exam-pins" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← Exam PINs</Link>
          <h1>{order.quantity || 1} × {exam.label}</h1>
          <p>{new Date(order.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })} · {naira(order.amount)}</p>
        </div>
        {order.status === 'PENDING' && <div className="card"><b>⏳ Getting your PINs…</b><p style={{ fontSize: 14, color: 'var(--slate-400)', margin: '6px 0 0' }}>Usually a few seconds. You can leave this page — you’ll be notified, and refunded automatically if they can’t be delivered.</p></div>}
        {order.status === 'FAILED' && <div className="card"><b>These PINs could not be delivered.</b> {naira(order.amount)} was refunded to your wallet.</div>}
        {order.status === 'SUCCESS' && cards.length === 0 && <div className="card">The PINs are being prepared. Open this page again in a minute, or check <Link to={`/orders/${order.id}`} style={{ color: 'var(--purple)' }}>the order</Link>.</div>}
        {order.status === 'SUCCESS' && cards.length > 0 && cards.length < (order.quantity || 1) && (
          <div className="card" style={{ border: '1px solid var(--gold)', fontSize: 14 }}>Only {cards.length} of {order.quantity} PINs were delivered. {naira(Math.floor((Number(order.amount) * (order.quantity - cards.length) / order.quantity) * 100) / 100)} for the missing ones is refunded to your wallet automatically.</div>
        )}
        {order.status === 'SUCCESS' && cards.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {LAYOUTS.map(([k, l]) => <button key={k} type="button" className={layout === k ? 'btn' : 'btn btn-secondary'} style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }} onClick={() => setLayout(k)}>{l}</button>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button type="button" className="btn" onClick={() => window.print()}>🖨️ Print {cards.length}</button>
              <button type="button" className="btn btn-secondary" onClick={copyAll}>Copy all</button>
              <button type="button" className="btn btn-secondary" onClick={csv} style={{ gridColumn: 'span 2' }}>Download (Excel)</button>
            </div>
            {msg && <p style={{ fontSize: 13, margin: '8px 0 0' }}>{msg}</p>}
            <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '10px 0 0' }}>Print lets you save as PDF too. Keep PINs private until you hand them out — anyone with a PIN can use it.</p>
          </div>
        )}
        {cards.map((c, i) => (
          <div key={`${c.serial}-${c.pin}`} className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px' }}>
            <span style={{ width: 24, color: 'var(--slate-400)', fontSize: 12 }}>{i + 1}</span>
            <span style={{ flex: 1, fontFamily: 'ui-monospace, monospace' }}>
              <span style={{ display: 'block', fontSize: 15 }}>PIN {c.pin}</span>
              <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>Serial {c.serial}</span>
            </span>
          </div>
        ))}
        <BottomNav />
      </div>
      {cards.length > 0 && (
        <div className={`exam-print exam-${layout}`} aria-hidden="true">
          {cards.map((c, i) => (
            <div key={`${c.serial}-${c.pin}`} className="exam-card" style={{ '--c': exam.color }}>
              <div className="exam-top"><span>{exam.label}</span><b>#{i + 1}</b></div>
              {name && <div className="exam-biz">{name}</div>}
              <div className="exam-row"><span>Serial No</span><b>{c.serial}</b></div>
              <div className="exam-row"><span>PIN</span><b className="exam-pin">{c.pin}</b></div>
              <div className="exam-foot">{exam.check} · Keep this PIN safe</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PRINT_CSS = `
.exam-print { display: none; }
@media print {
  @page { margin: 8mm; }
  body { background: #fff !important; }
  body * { visibility: hidden !important; }
  .exam-print, .exam-print * { visibility: visible !important; }
  .no-print { display: none !important; }
  .app-shell { padding: 0 !important; max-width: none !important; background: #fff !important; }
  .exam-print { display: grid !important; position: absolute; left: 0; top: 0; width: 100%; gap: 3mm; color: #111; font-family: Arial, Helvetica, sans-serif; }
  .exam-a4 { grid-template-columns: repeat(2, 1fr); }
  .exam-list { grid-template-columns: 1fr; }
  .exam-pos { grid-template-columns: 1fr; width: 48mm; }
  .exam-card { border: 1px dashed #555; border-radius: 2mm; overflow: hidden; break-inside: avoid; page-break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .exam-top { display: flex; justify-content: space-between; background: var(--c); color: #fff; padding: 1.5mm 2.5mm; font-size: 10pt; font-weight: 700; }
  .exam-biz { font-size: 8pt; text-align: center; padding: 1mm 2mm 0; font-weight: 700; }
  .exam-row { display: flex; justify-content: space-between; gap: 2mm; padding: 1mm 2.5mm; font-size: 9pt; }
  .exam-row b { font-family: 'Courier New', monospace; font-size: 11pt; letter-spacing: 0.2mm; }
  .exam-pin { font-size: 12.5pt !important; }
  .exam-foot { font-size: 6.5pt; color: #333; padding: 0 2.5mm 1.5mm; }
  .exam-pos .exam-row { flex-direction: column; }
}
`;

// More → Exam PINs in bulk (WAEC result checker, via VTpass).
export default function ExamPins() {
  const { id } = useParams();
  return id ? <Sheet id={id} /> : <Buy />;
}
