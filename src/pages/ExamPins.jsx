import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getVtpassVariations, getOrder, getOrders, purchase, getPricing } from '../api';
import PinConfirm from '../components/PinConfirm';
import BottomNav from '../components/BottomNav';
import { useAppInfo, pausedFor } from '../components/ServiceNotices';
import { SvcHero, Step, Stepper, Summary, Trust } from '../components/ServiceKit';

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

  const each = q ? total / q : 0;
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <SvcHero icon="🎓" color="#15803d" title="Exam PINs in bulk" sub="For schools, cafés and agents — buy many result checkers at once, then print." steps={['Pick how many', 'Pay from wallet', 'Print, copy or download']} />
      {err && <p className="error-text" style={{ margin: '0 16px 12px' }}>{err}</p>}
      {paused && <p className="error-text" style={{ margin: '0 16px 12px' }}>{paused}</p>}
      <form className="card" onSubmit={(e) => { e.preventDefault(); setErr(''); setConfirm(true); }}>
        <Step n={1} title="Exam">
          {vars === null ? <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: 0 }}>Loading…</p> : (
            <div className="pkg-list" role="radiogroup">
              {(vars || []).map((x) => {
                const on = x.variation_code === code;
                return (
                  <button key={x.variation_code} type="button" role="radio" aria-checked={on} className={`pkg-card${on ? ' on' : ''}`} onClick={() => setCode(x.variation_code)}>
                    <span className={`pkg-radio${on ? ' on' : ''}`} aria-hidden />
                    <span className="prov-badge" style={{ background: EXAMS.waec.color, minWidth: 40, height: 40, borderRadius: 12, fontSize: 10 }}>WAEC</span>
                    <span className="pkg-main"><span className="pkg-name">{EXAMS.waec.label}</span><span className="pkg-sub">{EXAMS.waec.check}</span></span>
                    <span className="pkg-price">{naira(priceFor(Number(x.variation_amount), pricing))}<small style={{ display: 'block', fontSize: 10, fontWeight: 500, color: 'var(--slate-400)' }}>per PIN</small></span>
                  </button>
                );
              })}
            </div>
          )}
        </Step>
        <Step n={2} title="How many PINs?" right={`1–${MAX}`}>
          <Stepper value={qty} onChange={setQty} min={1} max={MAX} quick={QUICK} />
        </Step>
        <Step n={3} title="Name on the printed sheet" right="optional">
          <input id="exN" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bright Future College, or your shop name" aria-label="Name on the printed sheet" />
        </Step>
        {unit > 0 && (
          <Summary
            rows={[['Exam', 'WAEC result checker'], ['Price per PIN', naira(each)], ['Quantity', `× ${q}`], ['Wallet balance', naira(customer?.walletBalance), Number(customer?.walletBalance || 0) < total ? 'bad' : undefined]]}
            total={naira(total)}
            note={total < unit * q ? `You save ${naira(unit * q - total)}` : undefined}
          />
        )}
        <button className="btn" type="submit" style={{ marginTop: 12 }} disabled={!unit || Boolean(paused)}>{unit ? `Buy ${q} PIN${q === 1 ? '' : 's'} · ${naira(total)}` : 'Pay'}</button>
        <Trust>PINs appear right after payment, ready to print (A4, list or POS), copy or download. If they can’t be delivered you’re refunded automatically.</Trust>
      </form>

      {recent.length > 0 && (
        <>
          <div className="section-label">Your recent PINs</div>
          <div className="card" style={{ padding: 0 }}>
            {recent.map((o) => (
              <Link key={o.id} to={`/exam-pins/${o.id}`} className="hist-row">
                <span className="hist-ico" style={{ background: '#15803d', color: '#fff' }}>WAEC</span>
                <span className="hist-main"><b>{o.quantity || 1} × result checker</b><small>{new Date(o.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })} · {naira(o.amount)}</small></span>
                <span className="pill ok">Print ›</span>
              </Link>
            ))}
          </div>
        </>
      )}

      <PinConfirm
        open={confirm}
        details={{ rows: [['Exam', 'WAEC result checker'], ['Price per PIN', naira(each)], ['Quantity', String(q)], name.trim() && ['Printed name', name.trim()]].filter(Boolean), total: naira(total) }}
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
