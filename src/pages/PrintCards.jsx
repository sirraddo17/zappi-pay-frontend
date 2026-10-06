import { SkeletonRows } from '../components/Skeleton';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getEpinOptions, getEpinBatches, getEpinBatch, buyEpins, markEpinsPrinted, markEpinsSold } from '../api';
import { useAuth } from '../context/AuthContext';
import PinConfirm from '../components/PinConfirm';
import BottomNav from '../components/BottomNav';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const groupPin = (p) => String(p).replace(/(\d{4})(?=\d)/g, '$1 ');
const QUICK = [5, 10, 20, 50, 100];

function Chip({ on, children, onClick, style }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} style={{ padding: '8px 12px', borderRadius: 12, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', border: `2px solid ${on ? 'var(--purple)' : 'var(--slate-700)'}`, background: on ? 'rgba(134,59,255,0.18)' : 'transparent', color: 'var(--slate-100)', ...style }}>
      {children}
    </button>
  );
}

// Recharge card printing: buy airtime PINs and print them as cards.
export default function PrintCards() {
  const { id } = useParams();
  return id ? <BatchView id={id} /> : <BuyCards />;
}

function BuyCards() {
  const { customer, refreshCustomer } = useAuth();
  const navigate = useNavigate();
  const [opts, setOpts] = useState(null);
  const [batches, setBatches] = useState([]);
  const [network, setNetwork] = useState('MTN');
  const [value, setValue] = useState(100);
  const [qty, setQty] = useState('10');
  const [biz, setBiz] = useState('');
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    getEpinOptions().then((o) => { setOpts(o); setBiz(o.businessName || ''); }).catch((e) => setError(e.message));
    getEpinBatches().then((d) => setBatches(d.batches || [])).catch(() => {});
  }, []);

  const unit = opts?.values.find((v) => v.value === value)?.price ?? value;
  const n = Math.max(0, Math.min(opts?.maxPerOrder || 100, parseInt(qty, 10) || 0));
  const total = Math.round(unit * n * 100) / 100;
  const net = opts?.networks.find((x) => x.key === network);
  const balance = Number(customer?.walletBalance || 0);

  function start(e) {
    e.preventDefault();
    setError('');
    if (!n) return setError('Enter how many cards to print.');
    if (total > balance) return setError(`You need ${naira(total)} in your wallet. Fund it first.`);
    setConfirmOpen(true);
  }

  async function submit(auth) {
    const r = await buyEpins({ network, value, quantity: n, businessName: biz, ...auth });
    setConfirmOpen(false);
    refreshCustomer?.();
    navigate(`/print-cards/${r.batch.id}`);
  }

  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">
        <Link to="/" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← Back</Link>
        <h1>Print recharge cards</h1>
        <p>Buy airtime PINs and print them to sell in your shop</p>
      </div>

      {!opts && !error && <div style={{ margin: '0 16px' }}><SkeletonRows rows={3} /></div>}
      {opts && !opts.enabled && (
        <div className="card"><strong>Coming soon</strong><p style={{ color: 'var(--slate-400)', fontSize: 14, margin: '6px 0 0' }}>Recharge card printing isn’t open yet. Check back shortly.</p></div>
      )}

      {opts?.enabled && (
        <form className="card" onSubmit={start}>
          <div className="section-label" style={{ margin: '0 0 8px', padding: 0 }}>Network</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {opts.networks.map((x) => (
              <button key={x.key} type="button" aria-pressed={network === x.key} onClick={() => setNetwork(x.key)} style={{ padding: '10px 4px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13, background: x.color, color: x.ink, border: network === x.key ? '3px solid var(--slate-100)' : '3px solid transparent', opacity: network === x.key ? 1 : 0.7 }}>
                {x.key === '9MOBILE' ? 'T2 / 9mobile' : x.label}
              </button>
            ))}
          </div>

          <div className="section-label" style={{ margin: '16px 0 8px', padding: 0 }}>Card value</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {opts.values.map((v) => (
              <Chip key={v.value} on={value === v.value} onClick={() => setValue(v.value)} style={{ flex: 1 }}>
                <b style={{ fontSize: 16 }}>{naira(v.value)}</b>
                {v.price < v.value && <span style={{ display: 'block', fontSize: 11, color: 'var(--green-500)' }}>you pay {naira(v.price)}</span>}
              </Chip>
            ))}
          </div>

          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="qty">How many cards? (1–{opts.maxPerOrder})</label>
            <input id="qty" type="number" inputMode="numeric" min="1" max={opts.maxPerOrder} value={qty} onChange={(e) => setQty(e.target.value)} />
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {QUICK.map((q) => <Chip key={q} on={n === q} onClick={() => setQty(String(q))} style={{ padding: '4px 10px', borderRadius: 999, borderWidth: 1 }}>{q}</Chip>)}
            </div>
          </div>
          <div className="field">
            <label htmlFor="biz">Name on the cards (optional)</label>
            <input id="biz" maxLength={40} value={biz} onChange={(e) => setBiz(e.target.value)} placeholder="e.g. Ade Stores, Ikeja" />
          </div>

          <div style={{ background: 'var(--slate-800)', borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{n} × {naira(value)} {net?.label}</span><span>{naira(value * n)} airtime</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 4 }}><span>You pay</span><span>{naira(total)}</span></div>
            {value * n - total > 0 && <div style={{ color: 'var(--green-500)', fontSize: 12, marginTop: 4 }}>You save {naira(value * n - total)} — sell at face value and keep the difference.</div>}
            <div style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: 4 }}>Wallet: {naira(balance)}</div>
          </div>
          {error && <p style={{ color: 'var(--red-500)', fontSize: 14 }}>{error}</p>}
          <button className="btn" type="submit" disabled={!n}>Buy &amp; print {n || ''} card{n === 1 ? '' : 's'}</button>
        </form>
      )}
      {!opts?.enabled && error && <p style={{ color: 'var(--red-500)', fontSize: 14, margin: 16 }}>{error}</p>}

      {batches.length > 0 && (
        <>
          <div className="section-label">Your cards</div>
          {batches.map((b) => (
            <Link key={b.id} to={`/print-cards/${b.id}`} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit', padding: '12px 14px' }}>
              <span style={{ width: 40, height: 40, borderRadius: 10, background: b.color, color: b.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{naira(b.value)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: 14 }}>{b.status === 'SUCCESS' ? b.delivered : b.quantity} × {naira(b.value)} {b.networkLabel}</strong>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--slate-400)' }}>
                  {new Date(b.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
                  {b.status === 'SUCCESS' ? `${b.unsold ?? b.delivered} unsold${b.printedAt ? ' · printed' : ''}` : b.status === 'PENDING' ? 'Preparing…' : 'Not printed — refunded'}
                </span>
              </span>
              <span style={{ color: 'var(--purple)' }}>›</span>
            </Link>
          ))}
        </>
      )}

      <PinConfirm
        open={confirmOpen}
        summary={`Buy ${n} × ${naira(value)} ${net?.label || ''} recharge card${n === 1 ? '' : 's'} for ${naira(total)}.`}
        onSubmit={submit}
        onError={(err) => setError(err.message || 'Could not buy the cards.')}
        onClose={() => setConfirmOpen(false)}
      />
      <BottomNav />
    </div>
  );
}

const LAYOUTS = [
  { key: 'a4', label: 'A4 sheet (3 across)' },
  { key: 'small', label: 'Small (4 across)' },
  { key: 'pos', label: 'POS printer (58mm)' },
];

function BatchView({ id }) {
  const { refreshCustomer } = useAuth();
  const [batch, setBatch] = useState(null);
  const [error, setError] = useState('');
  const [layout, setLayout] = useState(() => { try { return localStorage.getItem('zappipay_epin_layout') || 'a4'; } catch { return 'a4'; } });
  const [onlyUnsold, setOnlyUnsold] = useState(true);
  const [msg, setMsg] = useState('');
  const polls = useRef(0);

  useEffect(() => {
    let timer;
    const load = () => getEpinBatch(id).then((d) => {
      setBatch(d.batch);
      if (d.batch.status === 'PENDING' && polls.current < 60) {
        polls.current += 1;
        timer = setTimeout(load, polls.current < 12 ? 5000 : 20000);
      } else if (d.batch.status !== 'PENDING') refreshCustomer?.();
    }).catch((e) => setError(e.message));
    load();
    return () => clearTimeout(timer);
  }, [id]);

  const cards = useMemo(() => (batch?.cards || []).filter((c) => !onlyUnsold || !c.soldAt), [batch, onlyUnsold]);

  function pickLayout(k) {
    setLayout(k);
    try { localStorage.setItem('zappipay_epin_layout', k); } catch { /* ignore */ }
  }

  function print() {
    window.print();
    markEpinsPrinted(id).catch(() => {});
  }

  async function copyAll() {
    const text = cards.map((c) => `${batch.networkLabel} ${naira(batch.value)} PIN: ${c.pin}${c.serial ? `  S/N: ${c.serial}` : ''}`).join('\n');
    try { await navigator.clipboard.writeText(text); setMsg('Copied.'); } catch { setMsg('Could not copy on this phone.'); }
    setTimeout(() => setMsg(''), 2000);
  }

  function downloadCsv() {
    const rows = [['Network', 'Value', 'PIN', 'Serial', 'How to load', 'Sold']].concat(batch.cards.map((c) => [batch.networkLabel, batch.value, c.pin, c.serial || '', batch.load.replace('PIN', c.pin), c.soldAt ? 'yes' : '']));
    const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `recharge-cards-${batch.network}-${batch.value}-${new Date(batch.createdAt).toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function toggleSold(card) {
    try {
      const d = await markEpinsSold(id, [card.id], !card.soldAt);
      setBatch(d.batch);
    } catch (e) { setMsg(e.message); }
  }

  async function sellAllShown() {
    const ids = cards.filter((c) => !c.soldAt).map((c) => c.id);
    if (!ids.length || !window.confirm(`Mark ${ids.length} card${ids.length === 1 ? '' : 's'} as sold?`)) return;
    const d = await markEpinsSold(id, ids, true).catch((e) => { setMsg(e.message); return null; });
    if (d) setBatch(d.batch);
  }

  if (error) return <div className="app-shell"><div className="page-header"><Link to="/print-cards" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← Back</Link><h1>Recharge cards</h1></div><p style={{ color: 'var(--red-500)', margin: 16 }}>{error}</p></div>;
  if (!batch) return <div className="app-shell"><div style={{ margin: '0 16px' }}><SkeletonRows rows={3} /></div></div>;

  const sold = (batch.cards || []).filter((c) => c.soldAt).length;
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <style>{PRINT_CSS}</style>
      <div className="no-print">
        <div className="page-header">
          <Link to="/print-cards" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← All cards</Link>
          <h1>{batch.status === 'SUCCESS' ? batch.delivered : batch.quantity} × {naira(batch.value)} {batch.networkLabel}</h1>
          <p>{new Date(batch.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })} · paid {naira(batch.amount - batch.refunded)}</p>
        </div>

        {batch.status === 'PENDING' && (
          <div className="card"><strong>⏳ Preparing your cards…</strong><p style={{ fontSize: 14, color: 'var(--slate-400)', margin: '6px 0 0' }}>This usually takes a few seconds. You can leave this page — we’ll notify you when they’re ready. If they can’t be printed, your money comes back automatically.</p></div>
        )}
        {batch.status === 'FAILED' && (
          <div className="card"><strong>These cards could not be printed</strong><p style={{ fontSize: 14, color: 'var(--slate-400)', margin: '6px 0 0' }}>{naira(batch.refunded)} was refunded to your wallet.</p></div>
        )}
        {batch.status === 'SUCCESS' && batch.refunded > 0 && (
          <div className="card" style={{ fontSize: 14 }}>{batch.quantity - batch.delivered} card{batch.quantity - batch.delivered === 1 ? '' : 's'} could not be printed and {naira(batch.refunded)} was refunded.</div>
        )}

        {batch.status === 'SUCCESS' && (
          <div className="card">
            <div className="section-label" style={{ margin: '0 0 8px', padding: 0 }}>Print layout</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {LAYOUTS.map((l) => <Chip key={l.key} on={layout === l.key} onClick={() => pickLayout(l.key)} style={{ padding: '6px 10px', borderWidth: 1 }}>{l.label}</Chip>)}
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0', fontSize: 14 }}>
              <input type="checkbox" checked={onlyUnsold} onChange={(e) => setOnlyUnsold(e.target.checked)} style={{ width: 'auto' }} />
              Only cards not sold yet ({batch.delivered - sold} of {batch.delivered})
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button type="button" className="btn" onClick={print} disabled={!cards.length}>🖨️ Print {cards.length}</button>
              <button type="button" className="btn btn-secondary" onClick={copyAll} disabled={!cards.length}>Copy PINs</button>
              <button type="button" className="btn btn-secondary" onClick={downloadCsv}>Download (Excel)</button>
              <button type="button" className="btn btn-secondary" onClick={sellAllShown} disabled={!cards.some((c) => !c.soldAt)}>Mark all sold</button>
            </div>
            {msg && <p style={{ fontSize: 13, color: 'var(--slate-300, #cbd5e1)', margin: '8px 0 0' }}>{msg}</p>}
            <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '10px 0 0' }}>On your phone, Print lets you save as PDF or send to a Bluetooth / Wi-Fi printer. Keep PINs private until you sell them.</p>
          </div>
        )}

        {batch.status === 'SUCCESS' && (
          <>
            <div className="section-label">PINs — tap to mark sold</div>
            {(batch.cards || []).map((c, i) => (
              <button key={c.id} type="button" onClick={() => toggleSold(c)} className="card" style={{ display: 'flex', width: 'calc(100% - 32px)', alignItems: 'center', gap: 10, padding: '10px 14px', textAlign: 'left', cursor: 'pointer', color: 'inherit', opacity: c.soldAt ? 0.55 : 1 }}>
                <span style={{ width: 24, color: 'var(--slate-400)', fontSize: 12 }}>{i + 1}</span>
                <span style={{ flex: 1, fontFamily: 'ui-monospace, monospace', fontSize: 15, letterSpacing: 0.5, textDecoration: c.soldAt ? 'line-through' : 'none' }}>
                  {groupPin(c.pin)}
                  {c.serial && <span style={{ display: 'block', fontSize: 11, color: 'var(--slate-400)', fontFamily: 'inherit' }}>S/N {c.serial}</span>}
                </span>
                <span style={{ fontSize: 12, color: c.soldAt ? 'var(--green-500)' : 'var(--slate-400)' }}>{c.soldAt ? 'Sold ✓' : 'Unsold'}</span>
              </button>
            ))}
          </>
        )}
        <BottomNav />
      </div>

      {batch.status === 'SUCCESS' && (
        <div className={`epin-print epin-${layout}`} aria-hidden="true">
          {cards.map((c) => (
            <div key={c.id} className="epin-card" style={{ '--net': batch.color, '--ink': batch.ink }}>
              <div className="epin-top"><span>{batch.networkLabel}</span><b>{naira(batch.value)}</b></div>
              {batch.businessName && <div className="epin-biz">{batch.businessName}</div>}
              <div className="epin-pin">{groupPin(c.pin)}</div>
              <div className="epin-foot">
                <span>Load: {batch.load}</span>
                {c.serial && <span>S/N {c.serial}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Screen: the print sheet is hidden. Print: only the sheet shows.
const PRINT_CSS = `
.epin-print { display: none; }
@media print {
  @page { margin: 8mm; }
  body { background: #fff !important; }
  body * { visibility: hidden !important; }
  .epin-print, .epin-print * { visibility: visible !important; }
  .no-print { display: none !important; }
  .app-shell { padding: 0 !important; max-width: none !important; background: #fff !important; }
  .epin-print { display: grid !important; position: absolute; left: 0; top: 0; width: 100%; gap: 3mm; color: #111; font-family: Arial, Helvetica, sans-serif; }
  .epin-a4 { grid-template-columns: repeat(3, 1fr); }
  .epin-small { grid-template-columns: repeat(4, 1fr); }
  .epin-pos { grid-template-columns: 1fr; width: 48mm; }
  .epin-card { border: 1px dashed #555; border-radius: 2mm; overflow: hidden; break-inside: avoid; page-break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .epin-top { display: flex; justify-content: space-between; align-items: center; background: var(--net); color: var(--ink); padding: 1.5mm 2.5mm; font-size: 10pt; font-weight: 700; }
  .epin-top b { font-size: 13pt; }
  .epin-biz { font-size: 7.5pt; text-align: center; padding: 1mm 2mm 0; font-weight: 700; }
  .epin-pin { font-family: 'Courier New', monospace; font-weight: 700; font-size: 12.5pt; letter-spacing: 0.3mm; text-align: center; padding: 1.5mm 1mm; }
  .epin-small .epin-pin { font-size: 10.5pt; }
  .epin-foot { display: flex; justify-content: space-between; gap: 2mm; font-size: 6.5pt; padding: 0 2mm 1.5mm; color: #333; }
  .epin-pos .epin-foot { flex-direction: column; }
}
`;
