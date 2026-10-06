import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getTicketsHome, createTicketEvent, getTicketEvent, checkInTicket, setTicketEventStatus, viewEventPage, ticketCheckout, getTicketOrder, getBankList } from '../../api';
import BottomNav from '../../components/BottomNav';
import QrScanner from '../../components/QrScanner';
import { clearAfterLogin } from '../../lib/afterLogin';
import { qrDataUrl } from '../../lib/shareCard';
import { naira } from '../../components/circles/shared';

const back = (to, label) => <Link to={to} style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← {label}</Link>;
const when = (d) => new Date(d).toLocaleString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const btnS = { width: 'auto', padding: '6px 12px', fontSize: 13 };

function Qr({ text, size = 220 }) {
  const [src, setSrc] = useState('');
  useEffect(() => { qrDataUrl(text, size).then(setSrc).catch(() => {}); }, [text]);
  return src ? <img alt="Ticket QR code" src={src} style={{ width: size, height: size, background: '#fff', borderRadius: 8 }} /> : <div style={{ width: size, height: size, background: '#fff', borderRadius: 8 }} />;
}

export default function Tickets() {
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(null);
  const [banks, setBanks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ title: '', venue: '', startsAt: '', description: '', bankCode: '', accountNumber: '', types: [{ name: 'Regular', price: '', quantity: '' }] });
  const [err, setErr] = useState('');
  useEffect(() => { getTicketsHome().then(setD).catch((e) => setErr(e.message)); }, []);
  useEffect(() => { if (open && !banks.length) getBankList().then((x) => setBanks(x.banks || [])).catch(() => {}); }, [open]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const setType = (i, k) => (e) => setF((x) => ({ ...x, types: x.types.map((t, j) => (j === i ? { ...t, [k]: e.target.value } : t)) }));
  const paid = f.types.some((t) => Number(t.price) > 0);
  async function create(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await createTicketEvent({ ...f, startsAt: new Date(f.startsAt).toISOString(), types: f.types.map((t) => ({ name: t.name, price: Number(t.price || 0), quantity: Number(t.quantity) })) });
      navigate(`/tickets/events/${r.event.id}`);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }
  if (!d) return <div className="app-shell">{err ? <p className="error-text" style={{ margin: 16 }}>{err}</p> : <p className="empty-state">Loading…</p>}</div>;
  const upcoming = d.tickets.filter((t) => new Date(t.startsAt) > new Date(Date.now() - 12 * 3600 * 1000));
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">{back('/more', 'Back')}<h1>🎟️ Event tickets</h1><p>Sell tickets for owambes, concerts, church programmes and seminars. Buyers pay by card or transfer, and the money goes straight to your bank account.</p></div>
      {err && <p className="error-text" style={{ margin: '0 16px' }}>{err}</p>}
      <div className="card">
        <b>My tickets</b>
        {upcoming.length === 0 ? <p style={{ fontSize: 14, color: 'var(--slate-400)' }}>No tickets yet. Open an event link to buy one.</p> : upcoming.map((t) => (
          <div key={t.code} style={{ padding: '8px 0', borderTop: '1px solid var(--slate-800)', fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span><b>{t.event}</b><br /><small style={{ color: 'var(--slate-400)' }}>{t.type} · {when(t.startsAt)} · {t.venue}</small></span>
              {t.checkedInAt ? <span style={{ color: 'var(--slate-400)', fontSize: 13 }}>used</span> : <button type="button" className="btn" style={btnS} onClick={() => setShow(show === t.code ? null : t.code)}>{show === t.code ? 'Hide' : 'Show QR'}</button>}
            </div>
            {show === t.code && <div style={{ textAlign: 'center', padding: 12 }}><Qr text={`ZPT:${t.code}`} /><div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 3, marginTop: 6 }}>{t.code}</div><small style={{ color: 'var(--slate-400)' }}>Show this at the door. Each code works once.</small></div>}
          </div>
        ))}
      </div>
      {d.events.length > 0 && <div className="card"><b>Events I organise</b>{d.events.map((e) => <Link key={e.id} to={`/tickets/events/${e.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--slate-800)', textDecoration: 'none', color: 'inherit', fontSize: 14 }}><span><b>{e.title}</b><br /><small style={{ color: 'var(--slate-400)' }}>{when(e.startsAt)}</small></span><span style={{ fontSize: 12, color: e.status === 'ON_SALE' ? 'var(--green-500)' : 'var(--slate-400)' }}>{e.status === 'ON_SALE' ? 'on sale' : e.status.toLowerCase()}</span></Link>)}</div>}
      {!open ? <div style={{ margin: '0 16px 12px' }}><button type="button" className="btn" onClick={() => setOpen(true)}>＋ Sell tickets for an event</button></div> : (
        <form className="card" onSubmit={create}>
          <b>New event</b>
          <div className="field" style={{ marginTop: 8 }}><label htmlFor="eT">Event name</label><input id="eT" value={f.title} onChange={set('title')} maxLength={80} required /></div>
          <div className="field"><label htmlFor="eV">Venue</label><input id="eV" value={f.venue} onChange={set('venue')} maxLength={120} required /></div>
          <div className="field"><label htmlFor="eD">Date & time</label><input id="eD" type="datetime-local" value={f.startsAt} onChange={set('startsAt')} required /></div>
          <div className="field"><label htmlFor="eX">Details (dress code, programme…)</label><textarea id="eX" rows={3} maxLength={1500} value={f.description} onChange={set('description')} style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }} /></div>
          <b style={{ fontSize: 14 }}>Ticket types</b>
          {f.types.map((t, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr auto', gap: 6, alignItems: 'end', marginTop: 6 }}>
              <div className="field" style={{ margin: 0 }}><label htmlFor={`tn${i}`}>Name</label><input id={`tn${i}`} value={t.name} onChange={setType(i, 'name')} maxLength={40} required /></div>
              <div className="field" style={{ margin: 0 }}><label htmlFor={`tp${i}`}>Price ₦ (0 = free)</label><input id={`tp${i}`} type="number" min="0" value={t.price} onChange={setType(i, 'price')} required /></div>
              <div className="field" style={{ margin: 0 }}><label htmlFor={`tq${i}`}>How many</label><input id={`tq${i}`} type="number" min="1" value={t.quantity} onChange={setType(i, 'quantity')} required /></div>
              {f.types.length > 1 ? <button type="button" aria-label="Remove ticket type" onClick={() => setF((x) => ({ ...x, types: x.types.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: 'var(--red-500)', cursor: 'pointer', paddingBottom: 10 }}>✕</button> : <span />}
            </div>
          ))}
          {f.types.length < 6 && <button type="button" onClick={() => setF((x) => ({ ...x, types: [...x.types, { name: '', price: '', quantity: '' }] }))} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', padding: '6px 0', fontSize: 13 }}>＋ Add ticket type (e.g. VIP, Table for 10)</button>}
          {paid && (
            <>
              <b style={{ fontSize: 14, display: 'block', marginTop: 10 }}>Where should ticket money go?</b>
              <div className="field"><label htmlFor="eB">Bank</label><select id="eB" value={f.bankCode} onChange={set('bankCode')} required><option value="">Choose bank…</option>{banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}</select></div>
              <div className="field"><label htmlFor="eA">Account number</label><input id="eA" inputMode="numeric" maxLength={10} value={f.accountNumber} onChange={set('accountNumber')} required /></div>
              <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>Ticket money is paid straight into this account by our payment partner (usually the next working day). Buyers pay a small booking fee on top ({naira(d.feeFlat)} per ticket + {d.feePercent}%). You handle any refunds with your buyers.</p>
            </>
          )}
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Setting up…' : 'Create event'}</button>
        </form>
      )}
      <BottomNav />
    </div>
  );
}

export function TicketEventDashboard() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [code, setCode] = useState('');
  const [scan, setScan] = useState(false);
  const [result, setResult] = useState(null);
  const load = () => getTicketEvent(id).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);
  async function check(c) {
    setErr(''); setResult(null);
    try { const r = await checkInTicket(id, c); setResult(r); setCode(''); load(); } catch (e) { setErr(e.message); }
  }
  if (!d) return <div className="app-shell"><div className="page-header">{back('/tickets', 'Tickets')}</div>{err ? <p className="error-text" style={{ margin: 16 }}>{err}</p> : <p className="empty-state">Loading…</p>}</div>;
  const e = d.event;
  const link = `${window.location.origin}/t/${e.code}`;
  function csv() {
    const rows = [['Name', 'Phone', 'Ticket', 'Code', 'Checked in']].concat(d.attendees.map((a) => [a.name, a.phone, a.type, a.code, a.checkedInAt ? new Date(a.checkedInAt).toLocaleString('en-NG') : '']));
    const el = document.createElement('a');
    el.href = URL.createObjectURL(new Blob([rows.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' }));
    el.download = `${e.title}-guests.csv`.replace(/\s+/g, '-');
    el.click();
  }
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">{back('/tickets', 'Tickets')}<h1>🎟️ {e.title}</h1><p>{when(e.startsAt)} · {e.venue}</p></div>
      {err && <p className="error-text" style={{ margin: '0 16px' }}>{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)', margin: '0 16px', fontSize: 14 }}>{msg}</p>}
      <div className="card">
        <b>Check guests in</b>
        <form onSubmit={(ev) => { ev.preventDefault(); if (code.trim()) check(code); }} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input value={code} onChange={(ev) => setCode(ev.target.value.toUpperCase())} placeholder="Ticket code" aria-label="Ticket code" style={{ flex: 1, letterSpacing: 2 }} />
          <button type="submit" className="btn" style={{ width: 'auto' }}>Check</button>
          <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setScan(true)}>📷 Scan</button>
        </form>
        {result && <div style={{ marginTop: 10, padding: 12, borderRadius: 10, fontSize: 16, fontWeight: 700, background: result.ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: result.ok ? 'var(--green-500)' : 'var(--red-500)' }}>{result.message}{result.type ? <div style={{ fontSize: 13, fontWeight: 400 }}>{result.type}{result.name ? ` · ${result.name}` : ''}</div> : null}</div>}
        <div style={{ fontSize: 14, marginTop: 8 }}>{d.totals.checkedIn} of {d.totals.tickets} guests checked in</div>
      </div>
      <div className="card">
        <b>Sales</b>
        <div style={{ fontSize: 22, fontWeight: 800, margin: '6px 0' }}>{naira(d.totals.money)}</div>
        {d.types.map((t) => <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '5px 0', borderTop: '1px solid var(--slate-800)' }}><span>{t.name} · {t.price ? naira(t.price) : 'free'}</span><span>{t.sold} / {t.quantity}</span></div>)}
        {e.payout && <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>Paid out to {e.payout}</p>}
      </div>
      <div className="card">
        <b>Share</b>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button type="button" className="btn" style={{ width: 'auto' }} onClick={() => navigator.clipboard?.writeText(link).then(() => setMsg('Link copied ✓'))}>Copy link</button>
          <a className="btn btn-secondary" style={{ width: 'auto', textDecoration: 'none' }} target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`🎟️ ${e.title} — ${when(e.startsAt)} at ${e.venue}. Get your ticket on ZAPPI PAY: ${link}`)}`}>WhatsApp</a>
          {d.attendees.length > 0 && <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={csv}>⬇ Guest list</button>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {e.status === 'ON_SALE' ? <button type="button" className="btn btn-secondary" style={btnS} onClick={() => setTicketEventStatus(id, 'CLOSED').then(load).catch((x) => setErr(x.message))}>Stop selling</button>
            : e.status === 'CLOSED' ? <button type="button" className="btn btn-secondary" style={btnS} onClick={() => setTicketEventStatus(id, 'ON_SALE').then(load).catch((x) => setErr(x.message))}>Start selling again</button> : null}
          {e.status !== 'CANCELLED' && <button type="button" style={{ background: 'none', border: 'none', color: 'var(--red-500)', cursor: 'pointer', fontSize: 13 }} onClick={() => window.confirm('Cancel this event?') && setTicketEventStatus(id, 'CANCELLED').then(load).catch((x) => setErr(x.message))}>Cancel event</button>}
        </div>
      </div>
      {d.attendees.length > 0 && <div className="card"><b>Guests ({d.attendees.length})</b>{d.attendees.map((a) => <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '5px 0', borderTop: '1px solid var(--slate-800)' }}><span>{a.name} <small style={{ color: 'var(--slate-400)' }}>{a.type}</small></span><span style={{ color: a.checkedInAt ? 'var(--green-500)' : 'var(--slate-400)', fontSize: 13 }}>{a.checkedInAt ? '✅ in' : a.code}</span></div>)}</div>}
      {scan && <QrScanner onResult={(text) => { setScan(false); check(text); }} onClose={() => setScan(false)} />}
      <BottomNav />
    </div>
  );
}

// The public event link: /t/:code
export function EventPage() {
  const { code } = useParams();
  const [d, setD] = useState(null);
  const [typeId, setTypeId] = useState('');
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const navigate = useNavigate();
  useEffect(() => { clearAfterLogin(); viewEventPage(code).then((x) => { setD(x); const first = x.types.find((t) => !t.soldOut); if (first) setTypeId(first.id); }).catch((e) => setErr(e.message)); }, [code]);
  if (!d) return <div className="app-shell">{err ? <p className="error-text" style={{ margin: 16 }}>{err}</p> : <p className="empty-state">Loading…</p>}</div>;
  const e = d.event;
  const t = d.types.find((x) => x.id === typeId);
  const total = t ? t.price * qty + (t.price > 0 ? t.fee * qty : 0) : 0;
  async function buy() {
    setErr(''); setBusy(true);
    try {
      const r = await ticketCheckout(code, { typeId, quantity: qty });
      if (r.free) navigate('/tickets');
      else window.location.href = r.checkoutUrl;
    } catch (x) { setErr(x.message); setBusy(false); }
  }
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">{back('/tickets', 'My tickets')}<h1>🎟️ {e.title}</h1><p>{when(e.startsAt)} · {e.venue}</p></div>
      <div className="card">
        {e.description && <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', marginTop: 0 }}>{e.description}</p>}
        <small style={{ color: 'var(--slate-400)' }}>Organised by {e.organiser}{e.organiserUsername ? ` (@${e.organiserUsername})` : ''}</small>
        {d.myTickets > 0 && <p style={{ fontSize: 14 }}>You have {d.myTickets} ticket{d.myTickets === 1 ? '' : 's'} — <Link to="/tickets" style={{ color: 'var(--purple)' }}>show QR</Link></p>}
      </div>
      {e.status !== 'ON_SALE' ? <p className="card">{e.status === 'ENDED' ? 'This event has ended.' : e.status === 'CANCELLED' ? 'This event was cancelled.' : 'Tickets are not on sale right now.'}</p> : d.isOrganiser ? <p className="card" style={{ fontSize: 14 }}>This is your event. <Link to="/tickets" style={{ color: 'var(--purple)' }}>Open your dashboard</Link> to see sales and check guests in.</p> : (
        <div className="card">
          <b>Choose tickets</b>
          {d.types.map((x) => (
            <label key={x.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid var(--slate-800)', opacity: x.soldOut ? 0.5 : 1, fontSize: 14 }}>
              <span><input type="radio" name="tt" checked={typeId === x.id} disabled={x.soldOut} onChange={() => setTypeId(x.id)} style={{ width: 'auto', marginRight: 8 }} />{x.name}</span>
              <span>{x.soldOut ? 'Sold out' : x.price ? naira(x.price) : 'Free'}{!x.soldOut && x.left <= 20 ? <small style={{ color: 'var(--gold)' }}> · {x.left} left</small> : null}</span>
            </label>
          ))}
          {t && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' }}>
                <span style={{ fontSize: 14 }}>How many?</span>
                <select value={qty} onChange={(ev) => setQty(Number(ev.target.value))} aria-label="How many tickets" style={{ width: 'auto' }}>{Array.from({ length: Math.min(10, t.left) }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select>
              </div>
              {t.price > 0 && <div style={{ fontSize: 14 }}>Tickets {naira(t.price * qty)} + booking fee {naira(t.fee * qty)} = <b>{naira(total)}</b></div>}
              {err && <p className="error-text">{err}</p>}
              <button type="button" className="btn" disabled={busy} onClick={buy} style={{ marginTop: 8 }}>{busy ? 'Opening payment…' : t.price > 0 ? `Pay ${naira(total)}` : 'Get free ticket'}</button>
              {t.price > 0 && <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>You’ll pay securely by card, bank transfer or USSD. The ticket money goes straight to the organiser; refunds are handled by them.</p>}
            </>
          )}
        </div>
      )}
      <BottomNav />
    </div>
  );
}

// Where Monnify sends buyers back after paying: /tickets/order/:ref
export function TicketOrder() {
  const { ref } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let stop = false; let n = 0;
    const tick = () => getTicketOrder(ref).then((x) => { if (stop) return; setD(x); if (x.status === 'PENDING' && n++ < 20) setTimeout(tick, 3000); }).catch((e) => setErr(e.message));
    tick();
    return () => { stop = true; };
  }, [ref]);
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">{back('/tickets', 'My tickets')}<h1>🎟️ Your order</h1></div>
      {err && <p className="error-text" style={{ margin: '0 16px' }}>{err}</p>}
      {!d ? <p className="empty-state">Checking your payment…</p> : (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>{d.status === 'PAID' ? '🎉' : d.status === 'PENDING' ? '⏳' : '😕'}</div>
          <b>{d.event.title}</b>
          <p style={{ fontSize: 14 }}>{d.status === 'PAID' ? `${d.quantity} ticket${d.quantity === 1 ? ' is' : 's are'} ready.` : d.status === 'PENDING' ? 'Waiting for your payment to be confirmed…' : 'This payment didn’t go through. You weren’t charged for tickets.'}</p>
          {d.status === 'PAID' && <Link to="/tickets" className="btn" style={{ textDecoration: 'none', display: 'inline-block', width: 'auto' }}>Show my tickets</Link>}
          {d.status === 'PENDING' && d.checkoutUrl && <a href={d.checkoutUrl} className="btn btn-secondary" style={{ textDecoration: 'none', display: 'inline-block', width: 'auto' }}>Go back to payment</a>}
          {['FAILED', 'EXPIRED'].includes(d.status) && <Link to={`/t/${d.event.code}`} className="btn" style={{ textDecoration: 'none', display: 'inline-block', width: 'auto' }}>Try again</Link>}
        </div>
      )}
      <BottomNav />
    </div>
  );
}
